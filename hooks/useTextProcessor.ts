
import React, { useRef, useCallback, useEffect } from 'react';
import { fixTyposOnly, finalizeText, enhanceFullText, fixAndFinalize } from '../services/geminiService';
import { ProcessingStatus, CorrectionSettings, Language } from '../types';
import { ensureProperSpacing, formatPunctuationOnTheFly } from '../utils/textCleaner';
import { splitIntoBlocks, normalizeBlock } from '../utils/textStructure';

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
    finalizedSentences: Set<string>;
    addFinalizedSentence: (s: string) => void;
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
    finalizedSentences,
    addFinalizedSentence,
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
     * STAGE 2: Finalize Text (Blue -> Green)
     * CRITICAL FIX: We now use `fixAndFinalize` (Full Check) instead of `finalizeText`.
     * This ensures that even if the dictionary validated the text (Blue), Gemini does a full pass
     * to catch context errors, typos, and style issues before marking it Green.
     */
    const finalizeCommittedText = useCallback(async () => {
        if (!settingsRef.current.enabled || isFinalizingRef.current || 
            statusRef.current === 'recording') return;

        if (isFixingRef.current) return;

        const fullText = textRef.current;
        const committedLen = committedLengthRef.current;
        const processedLen = processedLengthRef.current;

        if (processedLen <= committedLen) return;

        const segmentToFinalize = fullText.slice(committedLen, processedLen);
        if (segmentToFinalize.trim().length < 2) return;

        // FAST CHECK: Is this segment already finalized?
        if (finalizedSentences.has(normalizeBlock(segmentToFinalize))) {
             setCommittedLength(processedLen);
             return;
        }

        const leadingWhitespace = segmentToFinalize.match(/^\s+/)?.[0] || '';

        onStatusChange('enhancing'); 
        isFinalizingRef.current = true;
        const currentRequestId = ++fixRequestIdRef.current;

        try {
            // FIX: Use fixAndFinalize to ensure errors in "valid" dictionary words are caught
            let finalizedSegment = await fixAndFinalize(segmentToFinalize, language);
            
            if (currentRequestId !== fixRequestIdRef.current) return;

            if (leadingWhitespace && !finalizedSegment.startsWith(leadingWhitespace)) {
                finalizedSegment = leadingWhitespace + finalizedSegment;
            }

            finalizedSegment = ensureProperSpacing(finalizedSegment);
            finalizedSegment = formatPunctuationOnTheFly(finalizedSegment);

            const currentText = textRef.current;
            const currentCommitted = committedLengthRef.current;

            const pendingSegment = currentText.slice(currentCommitted, currentCommitted + segmentToFinalize.length);

            if (pendingSegment !== segmentToFinalize) {
                 isFinalizingRef.current = false;
                 return;
            }

            if (finalizedSegment !== segmentToFinalize) {
                 // Logic for suffix spacing...
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
                 setProcessedLength(Math.max(processedLengthRef.current, newCommittedLen));
                 onStatsUpdate(1);
                 
                 addFinalizedSentence(finalizedSegment); // Register
                 saveCheckpoint(newText, newCommittedLen, Math.max(processedLengthRef.current, newCommittedLen), ['finalized']);
                 onStatusChange('done');
            } else {
                 setCommittedLength(currentCommitted + segmentToFinalize.length);
                 addFinalizedSentence(segmentToFinalize); // Register
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

    }, [language, onStatsUpdate, onStatusChange, saveCheckpoint, setText, setCommittedLength, setProcessedLength, settingsRef, statusRef, textRef, committedLengthRef, processedLengthRef, finalizedSentences, addFinalizedSentence]);

    /**
     * STAGE 1 & 3: Fix Typos OR Combined Fix for Sentences
     * Handles Red -> Orange (Fragments) OR Red -> Green (Completed Sentences)
     */
    const processPendingTypos = useCallback(async () => {
        if (!settingsRef.current.enabled || isFixingRef.current || 
            statusRef.current === 'recording' || statusRef.current === 'transcribing') return;

        // --- BACKLOG CHECK (Fix for Stuck Blue Text) ---
        // Check if there is "Blue" text (Processed but not Committed) that contains a sentence terminator.
        // This happens if the user types fast past a period.
        const committedLen = committedLengthRef.current;
        const processedLen = processedLengthRef.current;
        const fullText = textRef.current;
        
        if (processedLen > committedLen) {
            const blueText = fullText.slice(committedLen, processedLen);
            // If the blue text has a sentence terminator, we MUST finalize it first.
            if (/[.!?]/.test(blueText)) {
                // Yield to finalizer
                finalizeCommittedText();
                return;
            }
        }

        if (processedLen >= fullText.length) {
             setIsGrammarChecking(false);
             if (statusRef.current === 'typing' || statusRef.current === 'thinking') {
                 onStatusChange('idle');
             }
             return;
        }

        // --- FAST FORWARD CHECK ---
        // Before calling AI, check if the upcoming block is already known/finalized.
        const tail = fullText.slice(processedLen);
        const blocks = splitIntoBlocks(tail);
        
        if (blocks.length > 0) {
            const firstBlock = blocks[0];
            const trimmedBlock = normalizeBlock(firstBlock.text);
            
            // If the next chunk is already finalized or is just a separator, skip it.
            if (finalizedSentences.has(trimmedBlock)) {
                const newProcessed = processedLen + firstBlock.text.length;
                setProcessedLength(newProcessed);
                setCommittedLength(newProcessed); // Restore Green status
                // Schedule next check immediately to continue fast-forwarding if needed
                scheduleTyposCheck(0); 
                return;
            }
        }

        // --- NORMAL PROCESSING ---

        // DETECT SENTENCE COMPLETION
        const endsWithPunctuation = /[.!?](\s|$)/.test(tail.trim().slice(-1));
        const sentenceMatch = tail.match(/^(.+?[.!?])(\s|$)/s);

        let segmentToFix = tail;
        let isSentenceComplete = false;

        if (endsWithPunctuation) {
            segmentToFix = tail; 
            isSentenceComplete = true;
        } 
        else if (sentenceMatch) {
            segmentToFix = sentenceMatch[1];
            isSentenceComplete = true;
        } else {
            // Fragment optimization for large pastes
            if (tail.length > 200) {
                const breakMatch = tail.match(/[.!?\n]/);
                if (breakMatch && breakMatch.index) {
                    segmentToFix = tail.slice(0, breakMatch.index + 1);
                }
            }
        }

        const isBulkProcessing = segmentToFix.length > 100;
        const leadingWhitespace = segmentToFix.match(/^\s+/)?.[0] || '';

        // Visual Status
        if (isSentenceComplete || isBulkProcessing) {
            onStatusChange('enhancing'); 
        } else {
            setIsGrammarChecking(true); 
        }
        
        isFixingRef.current = true;
        const currentRequestId = ++fixRequestIdRef.current;
        
        saveCheckpoint(fullText, committedLengthRef.current, processedLen, ['raw']);

        try {
            let correctedSegment: string;

            if (isSentenceComplete || isBulkProcessing) {
                correctedSegment = await fixAndFinalize(segmentToFix, language);
            } else {
                correctedSegment = await fixTyposOnly(segmentToFix, language);
            }
            
            if (currentRequestId !== fixRequestIdRef.current) return;

            if (leadingWhitespace && !correctedSegment.startsWith(leadingWhitespace)) {
                correctedSegment = leadingWhitespace + correctedSegment;
            }

            correctedSegment = ensureProperSpacing(correctedSegment);
            correctedSegment = formatPunctuationOnTheFly(correctedSegment);

            const currentText = textRef.current;
            const currentProcessedLen = processedLengthRef.current; 
            const pendingPrefix = currentText.slice(currentProcessedLen, currentProcessedLen + segmentToFix.length);

            if (pendingPrefix !== segmentToFix) {
                isFixingRef.current = false;
                setIsGrammarChecking(false);
                return;
            }

            let finalCorrection = correctedSegment;
            const userSuffix = currentText.slice(currentProcessedLen + segmentToFix.length);

            // Ensure space after correction if user continues typing with a word
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
                     setCommittedLength(newProcessedLen);
                     // Register this new valid sentence
                     addFinalizedSentence(finalCorrection);
                     saveCheckpoint(newText, newProcessedLen, newProcessedLen, ['finalized']);
                     onStatusChange('done');
                 } else {
                     saveCheckpoint(newText, committedLengthRef.current, newProcessedLen, ['processed']);
                     onStatusChange('idle');
                 }

            } else {
                 // NO FIX NEEDED (System accepted the text)
                 const newProcessedLen = currentProcessedLen + segmentToFix.length;
                 setProcessedLength(newProcessedLen);
                 
                 if (isSentenceComplete || isBulkProcessing) {
                     setCommittedLength(newProcessedLen);
                     // Register existing valid sentence
                     addFinalizedSentence(segmentToFix);
                 }
                 onStatusChange('idle');
            }
            
        } catch (e) {
            console.error(e);
            // On error, we advance anyway to avoid getting stuck loop
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
                
                // Recursively check if there's more text (e.g. fast forward next block)
                if (processedLengthRef.current < textRef.current.length) {
                     scheduleTyposCheck(50);
                }
            }
        }
    }, [language, onStatsUpdate, onStatusChange, saveCheckpoint, setText, setProcessedLength, setCommittedLength, settingsRef, statusRef, textRef, committedLengthRef, processedLengthRef, setIsGrammarChecking, finalizedSentences, addFinalizedSentence, finalizeCommittedText]);

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
            enhanced = formatPunctuationOnTheFly(enhanced);
    
            if (enhanced !== pendingText) {
                const newText = fullText.slice(0, committedLengthRef.current) + enhanced;
                setText(newText);
                setCommittedLength(newText.length);
                setProcessedLength(newText.length);
                onStatsUpdate(1);
                
                // Add all blocks in enhanced text to finalized set
                const blocks = splitIntoBlocks(enhanced);
                blocks.forEach(b => {
                     if (!b.isSeparator) addFinalizedSentence(b.text);
                });

                saveCheckpoint(newText, newText.length, newText.length, ['enhanced']);
                onStatusChange('done');
            } else {
                onStatusChange('idle');
            }
        } catch(e) {
            onStatusChange('idle');
        }
    }, [language, onStatsUpdate, onStatusChange, setText, setCommittedLength, setProcessedLength, textRef, committedLengthRef, saveCheckpoint, addFinalizedSentence]);

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
