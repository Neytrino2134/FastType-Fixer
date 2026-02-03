

import React, { useRef, useCallback, useEffect } from 'react';
import { fixTyposOnly, finalizeText, enhanceFullText, fixAndFinalize } from '../services/geminiService';
import { ProcessingStatus, CorrectionSettings, Language } from '../types';
import { ensureProperSpacing } from '../utils/textCleaner';

interface UseTextProcessorProps {
    textRef: React.MutableRefObject<string>;
    committedLengthRef: React.MutableRefObject<number>;
    processedLengthRef: React.MutableRefObject<number>;
    settingsRef: React.MutableRefObject<CorrectionSettings>;
    statusRef: React.MutableRefObject<ProcessingStatus>;
    language: Language;
    setText: (text: string) => void;
    setProcessedLength: (len: number) => void;
    setCommittedLength: (len: number) => void;
    saveCheckpoint: (text: string, committed: number, processed: number, tags?: string[]) => void;
    onStatsUpdate: (count: number) => void;
    onStatusChange: (status: ProcessingStatus) => void;
    setIsGrammarChecking: (isChecking: boolean) => void;
}

export const useTextProcessor = ({
    textRef,
    committedLengthRef,
    processedLengthRef,
    settingsRef,
    statusRef,
    language,
    setText,
    setProcessedLength,
    setCommittedLength,
    saveCheckpoint,
    onStatsUpdate,
    onStatusChange,
    setIsGrammarChecking
}: UseTextProcessorProps) => {
    
    // Operational Refs
    const typoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const finalizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isFixingRef = useRef(false);
    const isFinalizingRef = useRef(false);
    // Track the ID of the current active request to ignore stale responses
    const fixRequestIdRef = useRef(0);

    // Cleanup timeouts on unmount
    useEffect(() => {
        return () => {
            if (typoTimeoutRef.current) clearTimeout(typoTimeoutRef.current);
            if (finalizeTimeoutRef.current) clearTimeout(finalizeTimeoutRef.current);
        };
    }, []);

    const cancelPendingTasks = useCallback(() => {
        if (typoTimeoutRef.current) clearTimeout(typoTimeoutRef.current);
        if (finalizeTimeoutRef.current) clearTimeout(finalizeTimeoutRef.current);
        isFixingRef.current = false;
        isFinalizingRef.current = false;
        fixRequestIdRef.current += 1; // Invalidate any flying requests
        setIsGrammarChecking(false);
    }, [setIsGrammarChecking]);

    /**
     * STAGE 1 & 3: Fix Typos OR Combined Fix for Sentences
     * Handles Red -> Orange (Fragments) OR Red -> Green (Completed Sentences)
     */
    const processPendingTypos = useCallback(async () => {
        if (!settingsRef.current.enabled || isFixingRef.current || 
            statusRef.current === 'recording' || statusRef.current === 'transcribing') return;

        const fullText = textRef.current;
        const processedLen = processedLengthRef.current;
        
        // 1. Completion Check
        if (processedLen >= fullText.length) {
             setIsGrammarChecking(false);
             if (statusRef.current === 'typing' || statusRef.current === 'thinking') {
                 onStatusChange('idle');
             }
             return;
        }

        // --- OPTIMIZATION: TARGET RED ZONE ---
        const tail = fullText.slice(processedLen);
        
        // DETECT SENTENCE COMPLETION
        // Old Regex: Looked for sentence start match /^(.+?[.!?])(\s|$)/s
        // New Logic: Check if the *tail* itself looks like a sentence ending in punctuation.
        // This covers the "Double Finalization" request where typing stops after a period.
        const endsWithPunctuation = /[.!?](\s|$)/.test(tail.trim().slice(-1));
        const sentenceMatch = tail.match(/^(.+?[.!?])(\s|$)/s);

        let segmentToFix = tail;
        let isSentenceComplete = false;

        // Priority 1: If the user just typed a period and waited (tail ends with punctuation),
        // we assume they finished the sentence. Grab the whole tail.
        if (endsWithPunctuation) {
            segmentToFix = tail; // Process the whole thing
            isSentenceComplete = true;
        } 
        // Priority 2: Standard detection of a sentence boundary in the middle of text (e.g. pasted text)
        else if (sentenceMatch) {
            segmentToFix = sentenceMatch[1];
            isSentenceComplete = true;
        } else {
            // Priority 3: Fragments
            // If we have a lot of text (paste), optimize by taking chunks
            if (tail.length > 200) {
                const breakMatch = tail.match(/[.!?\n]/);
                if (breakMatch && breakMatch.index) {
                    segmentToFix = tail.slice(0, breakMatch.index + 1);
                }
            }
        }

        const isBulkProcessing = segmentToFix.length > 100; // Legacy bulk check
        const leadingWhitespace = segmentToFix.match(/^\s+/)?.[0] || '';

        // Visual Status
        if (isSentenceComplete || isBulkProcessing) {
            onStatusChange('enhancing'); // Show purple/enhancing for sentence finalization
        } else {
            setIsGrammarChecking(true); // Show orange/checking for typos
        }
        
        isFixingRef.current = true;
        const currentRequestId = ++fixRequestIdRef.current;
        
        // HISTORY: Save "Raw" state before fixing
        saveCheckpoint(fullText, committedLengthRef.current, processedLen, ['raw']);

        try {
            let correctedSegment: string;

            // STRATEGY SELECTION
            if (isSentenceComplete || isBulkProcessing) {
                // Stage 3: Fix Typos AND Finalize (Punctuation/Caps) in one go
                // This is the "Double Finalization" requested by user.
                correctedSegment = await fixAndFinalize(segmentToFix, language);
            } else {
                // Stage 1: Just fix typos (keep it "Orange")
                correctedSegment = await fixTyposOnly(segmentToFix, language);
            }
            
            // Invalidate if a cancel happened
            if (currentRequestId !== fixRequestIdRef.current) return;

            // Restore leading whitespace if stripped
            if (leadingWhitespace && !correctedSegment.startsWith(leadingWhitespace)) {
                correctedSegment = leadingWhitespace + correctedSegment;
            }

            correctedSegment = ensureProperSpacing(correctedSegment);

            // --- CRITICAL OPTIMIZATION: SUFFIX PRESERVATION & SPACE INJECTION ---
            const currentText = textRef.current;
            const currentProcessedLen = processedLengthRef.current; 
            
            // The segment in live editor that corresponds to what we sent
            const pendingPrefix = currentText.slice(currentProcessedLen, currentProcessedLen + segmentToFix.length);

            // Validation: Does the editor text still start with what we sent? 
            if (pendingPrefix !== segmentToFix) {
                console.log("Segment changed by user during API call, discarding fix.");
                isFixingRef.current = false;
                setIsGrammarChecking(false);
                return;
            }

            // SPACE INJECTION LOGIC:
            let finalCorrection = correctedSegment;
            const userSuffix = currentText.slice(currentProcessedLen + segmentToFix.length);

            if (userSuffix.length > 0 && 
                !/^[\s.,;!?]/.test(userSuffix) && 
                !/[\s]$/.test(finalCorrection)
            ) {
                 finalCorrection += ' ';
            }

            if (finalCorrection !== segmentToFix) {
                 // APPLY FIX
                 const newText = currentText.slice(0, currentProcessedLen) + finalCorrection + userSuffix;
                 
                 setText(newText);
                 onStatsUpdate(1);
                 
                 const newProcessedLen = currentProcessedLen + finalCorrection.length;
                 setProcessedLength(newProcessedLen);
                 
                 if (isSentenceComplete || isBulkProcessing) {
                     // EAGER PROMOTION TO GREEN (Committed)
                     // If we finalized the sentence, commit it immediately.
                     setCommittedLength(newProcessedLen);
                     saveCheckpoint(newText, newProcessedLen, newProcessedLen, ['finalized']);
                     onStatusChange('done');
                 } else {
                     // Just processed (Orange)
                     saveCheckpoint(newText, committedLengthRef.current, newProcessedLen, ['processed']);
                     onStatusChange('idle');
                 }

            } else {
                 // NO FIX NEEDED (BUT ADVANCE CURSOR)
                 const newProcessedLen = currentProcessedLen + segmentToFix.length;
                 setProcessedLength(newProcessedLen);
                 
                 if (isSentenceComplete || isBulkProcessing) {
                     // Even if text didn't change, if it was a complete sentence scan, mark it Green
                     setCommittedLength(newProcessedLen);
                 }
                 onStatusChange('idle');
            }
            
        } catch (e) {
            console.error(e);
            // Fallback: Advance cursor to prevent loop on error
            const newProcessedLen = processedLengthRef.current + segmentToFix.length;
            if (newProcessedLen <= textRef.current.length) {
                setProcessedLength(newProcessedLen);
            }
            onStatusChange('idle');
        } finally {
            if (currentRequestId === fixRequestIdRef.current) {
                isFixingRef.current = false;
                setIsGrammarChecking(false);
                if (isSentenceComplete || isBulkProcessing) {
                    setTimeout(() => {
                        if (statusRef.current !== 'recording' && statusRef.current !== 'paused') {
                            onStatusChange('idle');
                        }
                    }, 1500);
                }
            }
        }
    }, [language, onStatsUpdate, onStatusChange, saveCheckpoint, setText, setProcessedLength, setCommittedLength, settingsRef, statusRef, textRef, committedLengthRef, processedLengthRef, setIsGrammarChecking]);

    /**
     * STAGE 2: Finalize Text (Orange -> Green)
     * Handles text that was already processed (Orange) but not yet finalized.
     */
    const finalizeCommittedText = useCallback(async () => {
        if (!settingsRef.current.enabled || isFinalizingRef.current || 
            statusRef.current === 'recording') return;

        // Don't run if fixing (unless we want parallel, but safer to serialize)
        if (isFixingRef.current) return;

        const fullText = textRef.current;
        const committedLen = committedLengthRef.current;
        const processedLen = processedLengthRef.current;

        if (processedLen <= committedLen) return;

        // Take the Orange segment
        const segmentToFinalize = fullText.slice(committedLen, processedLen);
        if (segmentToFinalize.trim().length < 2) return;

        const leadingWhitespace = segmentToFinalize.match(/^\s+/)?.[0] || '';

        onStatusChange('enhancing'); 
        isFinalizingRef.current = true;
        const currentRequestId = ++fixRequestIdRef.current;

        try {
            let finalizedSegment = await finalizeText(segmentToFinalize, language);
            
            if (currentRequestId !== fixRequestIdRef.current) return;

            if (leadingWhitespace && !finalizedSegment.startsWith(leadingWhitespace)) {
                finalizedSegment = leadingWhitespace + finalizedSegment;
            }

            finalizedSegment = ensureProperSpacing(finalizedSegment);

            // Re-fetch current state
            const currentText = textRef.current;
            const currentCommitted = committedLengthRef.current;

            const pendingSegment = currentText.slice(currentCommitted, currentCommitted + segmentToFinalize.length);

            if (pendingSegment !== segmentToFinalize) {
                 isFinalizingRef.current = false;
                 return;
            }

            if (finalizedSegment !== segmentToFinalize) {
                 // Check spacing with next segment
                 if (/[.!?]$/.test(finalizedSegment)) {
                     const suffix = currentText.slice(currentCommitted + segmentToFinalize.length);
                     if (suffix.length > 0 && !suffix.startsWith(' ')) {
                         finalizedSegment += ' ';
                     }
                 }

                 const suffix = currentText.slice(currentCommitted + segmentToFinalize.length);
                 const newText = currentText.slice(0, currentCommitted) + finalizedSegment + suffix;
                 
                 setText(newText);
                 const newCommittedLen = currentCommitted + finalizedSegment.length;
                 setCommittedLength(newCommittedLen);
                 // If finalized grew (added chars), update processed len too
                 setProcessedLength(Math.max(processedLengthRef.current, newCommittedLen));
                 onStatsUpdate(1);
                 
                 saveCheckpoint(newText, newCommittedLen, Math.max(processedLengthRef.current, newCommittedLen), ['finalized']);
                 onStatusChange('done');
            } else {
                 setCommittedLength(currentCommitted + segmentToFinalize.length);
                 onStatusChange('idle');
            }

            setTimeout(() => {
                 if (statusRef.current !== 'recording' && statusRef.current !== 'paused') {
                     onStatusChange('idle');
                 }
            }, 1000);

        } catch (e) {
            console.error(e);
            onStatusChange('idle');
        } finally {
            if (currentRequestId === fixRequestIdRef.current) {
                isFinalizingRef.current = false;
            }
        }

    }, [language, onStatsUpdate, onStatusChange, saveCheckpoint, setText, setCommittedLength, setProcessedLength, settingsRef, statusRef, textRef, committedLengthRef, processedLengthRef]);

    const handleEnhance = useCallback(async () => {
        if (isFixingRef.current) return;

        const fullText = textRef.current;
        const pendingText = fullText.slice(committedLengthRef.current);
        
        if (!pendingText.trim()) return;
        
        const leadingWhitespace = pendingText.match(/^\s+/)?.[0] || '';

        onStatusChange('enhancing');
        try {
            let enhanced = await enhanceFullText(pendingText, language);

            if (leadingWhitespace && !enhanced.startsWith(leadingWhitespace)) {
                enhanced = leadingWhitespace + enhanced;
            }
            
            enhanced = ensureProperSpacing(enhanced);
    
            if (enhanced !== pendingText) {
                const newText = fullText.slice(0, committedLengthRef.current) + enhanced;
                setText(newText);
                setCommittedLength(newText.length);
                setProcessedLength(newText.length);
                onStatsUpdate(1);
                saveCheckpoint(newText, newText.length, newText.length, ['enhanced']);
                onStatusChange('done');
            } else {
                onStatusChange('idle');
            }
        } catch(e) {
            onStatusChange('idle');
        }
    }, [language, onStatsUpdate, onStatusChange, setText, setCommittedLength, setProcessedLength, textRef, committedLengthRef, saveCheckpoint]);

    const scheduleTyposCheck = useCallback((delay: number) => {
        if (typoTimeoutRef.current) clearTimeout(typoTimeoutRef.current);
        
        typoTimeoutRef.current = setTimeout(() => {
            processPendingTypos();
        }, delay);
    }, [processPendingTypos]);

    const scheduleFinalization = useCallback((delay: number) => {
        if (finalizeTimeoutRef.current) clearTimeout(finalizeTimeoutRef.current);
        finalizeTimeoutRef.current = setTimeout(() => {
            finalizeCommittedText();
        }, delay);
    }, [finalizeCommittedText]);

    return {
        processPendingTypos,
        finalizeCommittedText,
        handleEnhance,
        scheduleTyposCheck,
        scheduleFinalization,
        cancelPendingTasks,
        ensureProperSpacing
    };
};
