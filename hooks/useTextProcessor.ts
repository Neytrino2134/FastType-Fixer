

import React, { useRef, useCallback, useEffect, useState } from 'react';
import { fixTyposOnly, finalizeText, fixAndFinalize } from '../services/geminiService';
import { ProcessingStatus, CorrectionSettings, Language } from '../types';
import { ensureProperSpacing, formatPunctuationOnTheFly } from '../utils/textCleaner';
import { splitIntoBlocks, normalizeBlock } from '../utils/textStructure';
import { runMiniScripts } from '../utils/miniScripts';

export interface ProcessingOverlay {
    start: number;
    end: number;
    type: 'fixing' | 'finalizing';
}

interface UseTextProcessorProps {
    textRef: React.MutableRefObject<string>;
    committedLengthRef: React.MutableRefObject<number>; // Green
    correctedLengthRef: React.MutableRefObject<number>; // Blue/Purple
    checkedLengthRef: React.MutableRefObject<number>;   // Red
    checkingLengthRef: React.MutableRefObject<number>;  // Yellow (Pending Check)
    settingsRef: React.MutableRefObject<CorrectionSettings>;
    statusRef: React.MutableRefObject<ProcessingStatus>;
    language: Language;
    setText: (text: string) => void;
    setCorrectedLength: (len: number) => void;
    setCommittedLength: (len: number) => void;
    setCheckedLength: (len: number) => void;
    setCheckingLength: (len: number) => void; // Setter for Yellow state
    finalizedSentences: Set<string>;
    addFinalizedSentence: (s: string) => void;
    addAiFixedSegment: (s: string) => void; 
    unknownSegments: Set<string>;
    addUnknownSegments: (words: string[]) => void;
    saveCheckpoint: (text: string, committed: number, corrected: number, tags?: string[]) => void;
    saveCheckpoints: (snapshots: { text: string, committedLength: number, correctedLength: number, checkedLength?: number, tags: string[] }[]) => void;
    onStatsUpdate: (count: number) => void;
    onStatusChange: (status: ProcessingStatus) => void;
    onAutoFormat: (text: string) => void; 
    workerRef: React.MutableRefObject<Worker | null>;
    onFatalError: (msg: string) => void; // NEW: Callback to stop everything
}

export const useTextProcessor = ({
    textRef,
    committedLengthRef,
    correctedLengthRef,
    checkedLengthRef,
    checkingLengthRef,
    settingsRef,
    statusRef,
    language,
    setText,
    setCorrectedLength,
    setCommittedLength,
    setCheckedLength,
    setCheckingLength,
    finalizedSentences,
    addFinalizedSentence,
    addAiFixedSegment,
    unknownSegments,
    addUnknownSegments,
    saveCheckpoint,
    saveCheckpoints,
    onStatsUpdate,
    onStatusChange,
    onAutoFormat,
    workerRef,
    onFatalError
}: UseTextProcessorProps) => {
    
    // Internal State Machine Locks
    const isProcessingRef = useRef(false);
    const processorIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const lastActivityRef = useRef(Date.now());
    
    // VISUAL FEEDBACK STATE
    const [processingOverlay, setProcessingOverlay] = useState<ProcessingOverlay | null>(null);

    // Helper: Clean word locally to match worker logic for set lookups
    const cleanWordLocally = (w: string) => w.toLowerCase().replace(/[^a-zA-Zа-яА-ЯёЁ0-9'‘`ʻғқҳўҒҚҲЎ]/g, '').trim();

    // Core Logic Cycle
    const performCycle = async () => {
        const fullText = textRef.current;
        // Use settings directly to determine if we should process
        const settings = settingsRef.current;
        const isAiEnabled = settings.enabled;

        // ---------------------------------------------------------
        // PRIORITY -1: GREEN SKIP (Fast-Forward Known Blocks)
        // ---------------------------------------------------------
        let currentCommitted = committedLengthRef.current;
        const pendingForSkip = fullText.slice(currentCommitted);

        if (pendingForSkip.length > 0 && isAiEnabled) {
            const blocks = splitIntoBlocks(pendingForSkip);
            let advanceOffset = 0;
            
            // Iterate blocks until we hit one that isn't finalized (dirty)
            for (const block of blocks) {
                const normalized = normalizeBlock(block.text);
                if (finalizedSentences.has(normalized)) {
                    advanceOffset = block.end; // Accumulate skip distance
                } else {
                    break;
                }
            }

            if (advanceOffset > 0) {
                const newLen = currentCommitted + advanceOffset;
                // Move ALL pointers past the known green text
                setCommittedLength(newLen);
                setCorrectedLength(Math.max(correctedLengthRef.current, newLen));
                setCheckedLength(Math.max(checkedLengthRef.current, newLen));
                setCheckingLength(Math.max(checkingLengthRef.current, newLen));
                return; // Wait for next tick to process from new position
            }
        }

        // Refresh vars after skip
        const committedLen = committedLengthRef.current;
        const correctedLen = correctedLengthRef.current;
        const checkedLen = checkedLengthRef.current;
        
        // ---------------------------------------------------------
        // PRIORITY -0.5: BOUNDARY CALCULATION (Safety Wall)
        // ---------------------------------------------------------
        const activeText = fullText.slice(committedLen);
        const activeBlocks = splitIntoBlocks(activeText);
        let processLimitRelative = activeText.length;

        for (const block of activeBlocks) {
            if (finalizedSentences.has(normalizeBlock(block.text))) {
                processLimitRelative = block.start; // Stop right before the known block
                break;
            }
        }

        const absoluteLimit = committedLen + processLimitRelative;

        // ---------------------------------------------------------
        // PRIORITY 0: MINI-SCRIPTS (Fast Regex Fixes)
        // ---------------------------------------------------------
        if (settings.miniScripts) {
             const processed = runMiniScripts(fullText);
             if (processed !== fullText) {
                 onAutoFormat(processed);
                 onStatusChange('script_fix');
                 return;
             }
        }

        // ---------------------------------------------------------
        // PRIORITY 0.5: BULK PROCESSING (Paste / Dictation / Insert)
        // ---------------------------------------------------------
        if (isAiEnabled) {
            const unfinalizedText = fullText.slice(committedLen, absoluteLimit);
            // Check for ANY sentence terminator to identify bulk content
            const matches = unfinalizedText.match(/[.!?](\s|$)/g);
            
            // >= 1 match triggers bulk logic.
            // LOWERED THRESHOLD: Trigger if length > 10 to catch short dictations like "Hello" or "Good morning".
            // Dictation often lacks punctuation, so length check is critical.
            if ((matches && matches.length >= 1) || unfinalizedText.length > 10) {
                // Only run bulk if flags are active
                if (settings.fixTypos && settings.fixPunctuation) {
                     // Process the WHOLE unfinalized segment.
                     await runBulkFinalization(unfinalizedText, committedLen);
                     return;
                }
            }
        }

        // ---------------------------------------------------------
        // PRIORITY 1: STANDARD FINALIZATION (Blue/Purple -> Green)
        // ---------------------------------------------------------
        if (isAiEnabled && settings.fixPunctuation) {
            const effectiveCorrectedLen = Math.min(correctedLen, absoluteLimit);
            
            if (effectiveCorrectedLen > committedLen) {
                const verifiedZone = fullText.slice(committedLen, effectiveCorrectedLen);
                const sentenceEndings = Array.from(verifiedZone.matchAll(/[.!?](\s|$)/g));

                if (sentenceEndings.length > 0) {
                    const lastMatch = sentenceEndings[sentenceEndings.length - 1] as RegExpMatchArray;
                    const segmentEnd = (lastMatch.index ?? 0) + 1;
                    const segmentToFinalize = verifiedZone.slice(0, segmentEnd);
                    
                    if (segmentToFinalize.trim().length > 1) {
                        await runFinalization(segmentToFinalize, committedLen);
                        return; 
                    }
                }
            }
        }

        // ---------------------------------------------------------
        // PRIORITY 2: AI CORRECTION (Red -> Purple OR Blue)
        // ---------------------------------------------------------
        // Logic: Scan for errors. If none, promote to Blue (Corrected) without AI.
        // If errors exist, send the whole chunk to AI (Purple).
        const effectiveCheckedLen = Math.min(checkedLen, absoluteLimit);
        
        if (isAiEnabled && effectiveCheckedLen > correctedLen) {
            const redZone = fullText.slice(correctedLen, effectiveCheckedLen);
            
            if (redZone.trim()) {
                // 1. Analyze if this zone contains any known errors
                const words = redZone.split(/([ \n\t.,!?;:()""«»—\-\/_+]+)/);
                let hasUnknowns = false;

                for (const w of words) {
                    const clean = cleanWordLocally(w);
                    if (clean.length > 3 && unknownSegments.has(clean)) {
                        hasUnknowns = true;
                        break;
                    }
                }

                if (hasUnknowns && settings.fixTypos) {
                    // DIRTY + Fix Enabled: Send to AI
                    await runAiCorrection(redZone, correctedLen);
                } else if (!hasUnknowns || !settings.fixTypos) {
                    // CLEAN or Fix Disabled: Just mark as corrected to move pipeline forward
                    setCorrectedLength(effectiveCheckedLen);
                }
                return;
            } else {
                setCorrectedLength(effectiveCheckedLen);
                return;
            }
        }

        // ---------------------------------------------------------
        // PRIORITY 3: DICTIONARY CHECK (Grey -> Red/Blue)
        // ---------------------------------------------------------
        if (settings.dictionaryCheck && absoluteLimit > checkedLen) {
            const greyZone = fullText.slice(checkedLen, absoluteLimit);
            
            let chunkEnd = 0;
            const rawWords = greyZone.split(/(\s+)/);
            let meaningfulWordsCount = 0;
            
            let lastMeaningfulWord = "";
            let endsWithPunctuation = false;

            for (const w of rawWords) {
                chunkEnd += w.length;
                if (w.trim()) {
                    meaningfulWordsCount++;
                    lastMeaningfulWord = w.trim();
                    if (/[.!?]/.test(lastMeaningfulWord)) {
                        endsWithPunctuation = true;
                        break; // Sentence end triggers check immediately
                    } else {
                        endsWithPunctuation = false;
                    }
                }
                
                // If we hit enough words, we might break, BUT...
                // RULE: If the last word is SHORT (<= 3 chars), wait for more context (next long word)
                if (meaningfulWordsCount >= 3) {
                    const cleanLast = cleanWordLocally(lastMeaningfulWord);
                    if (cleanLast.length > 3 || endsWithPunctuation) {
                        break;
                    }
                    // Else: continue loop to gather more context
                }
            }

            // Determine if we should run the check
            const isAtEnd = (checkedLen + chunkEnd) >= fullText.length;
            
            // Standard Condition: Wait for 3 words
            const isChunkReady = meaningfulWordsCount >= 3 && (cleanWordLocally(lastMeaningfulWord).length > 3 || endsWithPunctuation);
            
            // Manual Typing Condition: If we are at the end (stopped typing), allow checking even single words > 3 chars
            const isManualReady = isAtEnd && meaningfulWordsCount >= 1 && cleanWordLocally(lastMeaningfulWord).length > 3;

            if (chunkEnd > 0 && (isChunkReady || isAtEnd || endsWithPunctuation || isManualReady)) {
                const chunkToTest = greyZone.slice(0, chunkEnd);
                await runDictionaryCheck(chunkToTest, checkedLen);
                return;
            }
        }

        // Idle state handling
        // FIX: Do not override 'speaking' status to 'idle'.
        if (statusRef.current !== 'done' && statusRef.current !== 'error' && statusRef.current !== 'speaking') {
            if (isAiEnabled) {
                if (statusRef.current !== 'idle') {
                    onStatusChange('idle');
                }
            } else {
                if (statusRef.current !== 'paused') {
                    onStatusChange('paused');
                }
            }
        }
    };

    // --- WORKER ACTIONS ---

    const runDictionaryCheck = (textChunk: string, startOffset: number) => {
        return new Promise<void>((resolve) => {
            if (!workerRef.current) {
                resolve(); 
                return; 
            }
            
            onStatusChange('dict_check');
            
            const chunkLen = textChunk.length;
            const targetEnd = startOffset + chunkLen;
            setCheckingLength(targetEnd);

            const handleWorkerMsg = (e: MessageEvent) => {
                const { type, unknownWords } = e.data;
                if (type === 'CHECK_RESULT') {
                    cleanup();
                    
                    if (targetEnd > textRef.current.length) {
                         setCheckingLength(0); 
                         resolve(); return;
                    }

                    if (unknownWords && unknownWords.length > 0) {
                        addUnknownSegments(unknownWords);
                    }
                    
                    setCheckedLength(targetEnd);
                    resolve();
                }
            };

            const timeoutId = setTimeout(() => {
                cleanup();
                setCheckedLength(targetEnd);
                resolve();
            }, 3000); // Increased timeout safety

            const cleanup = () => {
                workerRef.current?.removeEventListener('message', handleWorkerMsg);
                clearTimeout(timeoutId);
            };

            workerRef.current.addEventListener('message', handleWorkerMsg);
            workerRef.current.postMessage({ type: 'CHECK_CHUNK', text: textChunk, language });
        });
    };

    // --- AI ACTIONS ---

    const handleAiError = (e: any) => {
        console.error("AI Processor Error:", e);
        if (e.isFatal) {
            onFatalError(e.message); // Trigger stop in useSmartEditor
        } else {
            onStatusChange('error');
        }
    };

    const runBulkFinalization = async (textChunk: string, startOffset: number) => {
        onStatusChange('ai_finalizing');
        setProcessingOverlay({ start: startOffset, end: startOffset + textChunk.length, type: 'finalizing' });
        
        const preEditSnapshot = {
            text: textRef.current,
            committed: committedLengthRef.current,
            corrected: correctedLengthRef.current
        };

        const leadingSpace = textChunk.match(/^\s*/)?.[0] || '';
        const trimmedInput = textChunk.trim();

        try {
            // Bulk Finalization uses "fixAndFinalize" which is more robust (Typos + Punctuation)
            const finalized = await fixAndFinalize(trimmedInput, language);
            let finalChunk = leadingSpace + finalized;
            finalChunk = ensureProperSpacing(finalChunk);
            finalChunk = formatPunctuationOnTheFly(finalChunk);
            
            // Auto-append space if next char in fullText is not space/punct, to avoid merging words
            if (/[.!?]$/.test(finalChunk) && !/\s$/.test(finalChunk)) {
                 const fullText = textRef.current;
                 const nextChar = fullText[startOffset + textChunk.length];
                 // If nextChar is undefined/empty (end of text) OR if it's not a space/dot, append space
                 if (!nextChar || (nextChar !== ' ' && nextChar !== '.')) {
                     finalChunk += ' ';
                 }
            }

            if (finalChunk !== textChunk) {
                const newFullText = replaceTextRange(startOffset, startOffset + textChunk.length, finalChunk);
                
                // CRITICAL FIX: If replacement returns null (race condition), reset status and exit.
                // This prevents hanging spinner.
                if (!newFullText) {
                    onStatusChange('idle'); 
                    return;
                }

                onStatsUpdate(1);
                
                const newCommitted = startOffset + finalChunk.length;
                setCommittedLength(newCommitted);
                setCorrectedLength(newCommitted);
                setCheckedLength(newCommitted);
                setCheckingLength(newCommitted);
                
                const blocks = splitIntoBlocks(finalChunk);
                blocks.forEach(b => {
                    addFinalizedSentence(b.text);
                });
                
                addAiFixedSegment(normalizeBlock(finalChunk));

                saveCheckpoints([
                    {
                        text: preEditSnapshot.text,
                        committedLength: preEditSnapshot.committed,
                        correctedLength: preEditSnapshot.corrected,
                        checkedLength: checkedLengthRef.current,
                        tags: ['pre_ai']
                    },
                    {
                        text: newFullText,
                        committedLength: newCommitted,
                        correctedLength: newCommitted,
                        checkedLength: newCommitted,
                        tags: ['finalized', 'ai_corrected', 'bulk']
                    }
                ]);

                onStatusChange('done');
            } else {
                // If text didn't change but was processed, mark as committed
                if (textRef.current.length >= startOffset + textChunk.length) {
                    const newLen = startOffset + textChunk.length;
                    setCommittedLength(newLen);
                    setCorrectedLength(newLen);
                    setCheckedLength(newLen);
                    setCheckingLength(newLen);
                    
                    const blocks = splitIntoBlocks(textChunk);
                    blocks.forEach(b => {
                        addFinalizedSentence(b.text);
                    });
                }
                onStatusChange('idle');
            }
        } catch (e: any) {
             handleAiError(e);
        } finally {
            setProcessingOverlay(null);
        }
    };

    const runAiCorrection = async (textChunk: string, startOffset: number) => {
        onStatusChange('ai_fixing');
        setProcessingOverlay({ start: startOffset, end: startOffset + textChunk.length, type: 'fixing' });
        
        const preEditSnapshot = {
            text: textRef.current,
            committed: committedLengthRef.current,
            corrected: correctedLengthRef.current
        };
        
        const leadingSpace = textChunk.match(/^\s*/)?.[0] || '';
        const trailingSpace = textChunk.match(/\s*$/)?.[0] || '';
        const trimmedInput = textChunk.trim();

        if (!trimmedInput) {
             setCorrectedLength(startOffset + textChunk.length);
             setProcessingOverlay(null);
             return;
        }

        try {
            const fixed = await fixTyposOnly(trimmedInput, language);
            const finalChunk = leadingSpace + fixed + trailingSpace;

            if (finalChunk !== textChunk) {
                const newFullText = replaceTextRange(startOffset, startOffset + textChunk.length, finalChunk);
                if (!newFullText) {
                    onStatusChange('error');
                    return;
                }

                onStatsUpdate(1);
                addAiFixedSegment(normalizeBlock(finalChunk));

                const newEnd = startOffset + finalChunk.length;
                setCorrectedLength(newEnd);
                setCheckedLength(Math.max(checkedLengthRef.current, newEnd));
                
                saveCheckpoints([
                    {
                        text: preEditSnapshot.text,
                        committedLength: preEditSnapshot.committed,
                        correctedLength: preEditSnapshot.corrected,
                        checkedLength: checkedLengthRef.current,
                        tags: ['pre_ai']
                    },
                    {
                        text: newFullText,
                        committedLength: committedLengthRef.current,
                        correctedLength: newEnd,
                        checkedLength: Math.max(checkedLengthRef.current, newEnd),
                        tags: ['processed', 'ai_corrected']
                    }
                ]);

            } else {
                if (textRef.current.length >= startOffset + textChunk.length) {
                    setCorrectedLength(startOffset + textChunk.length);
                }
            }
        } catch (e: any) {
            if (textRef.current.length >= startOffset + textChunk.length) {
                setCorrectedLength(startOffset + textChunk.length);
            }
            handleAiError(e);
        } finally {
            setProcessingOverlay(null);
        }
    };

    const runFinalization = async (textChunk: string, startOffset: number) => {
        onStatusChange('ai_finalizing');
        setProcessingOverlay({ start: startOffset, end: startOffset + textChunk.length, type: 'finalizing' });
        
        const preEditSnapshot = {
            text: textRef.current,
            committed: committedLengthRef.current,
            corrected: correctedLengthRef.current
        };

        const leadingSpace = textChunk.match(/^\s*/)?.[0] || '';
        const trimmedInput = textChunk.trim();

        try {
            const finalized = await finalizeText(trimmedInput, language);
            let finalChunk = leadingSpace + finalized;
            
            finalChunk = ensureProperSpacing(finalChunk);
            finalChunk = formatPunctuationOnTheFly(finalChunk);
            
            if (/[.!?]$/.test(finalChunk) && !/\s$/.test(finalChunk)) {
                 const fullText = textRef.current;
                 const nextChar = fullText[startOffset + textChunk.length];
                 // If end of doc OR next char is not space, add space
                 if (!nextChar || (nextChar !== ' ')) {
                     finalChunk += ' ';
                 }
            }

            if (finalChunk !== textChunk) {
                const newFullText = replaceTextRange(startOffset, startOffset + textChunk.length, finalChunk);
                if (!newFullText) {
                    onStatusChange('error');
                    return;
                }

                onStatsUpdate(1);
                
                const newCommitted = startOffset + finalChunk.length;
                setCommittedLength(newCommitted);
                
                const newCorrected = Math.max(correctedLengthRef.current, newCommitted);
                setCorrectedLength(newCorrected);
                setCheckedLength(Math.max(checkedLengthRef.current, newCommitted));
                
                addFinalizedSentence(finalChunk);
                
                saveCheckpoints([
                    {
                        text: preEditSnapshot.text,
                        committedLength: preEditSnapshot.committed,
                        correctedLength: preEditSnapshot.corrected,
                        checkedLength: checkedLengthRef.current,
                        tags: ['pre_ai']
                    },
                    {
                        text: newFullText,
                        committedLength: newCommitted,
                        correctedLength: newCommitted,
                        checkedLength: Math.max(checkedLengthRef.current, newCommitted),
                        tags: ['finalized', 'ai_corrected']
                    }
                ]);

                onStatusChange('done');
            } else {
                if (textRef.current.length >= startOffset + textChunk.length) {
                    setCommittedLength(startOffset + textChunk.length);
                    addFinalizedSentence(textChunk);
                }
                onStatusChange('idle');
            }

        } catch (e: any) {
             if (textRef.current.length >= startOffset + textChunk.length) {
                setCommittedLength(startOffset + textChunk.length);
             }
             handleAiError(e);
        } finally {
            setProcessingOverlay(null);
        }
    };

    const replaceTextRange = (start: number, end: number, replacement: string): string | null => {
        const currentText = textRef.current;
        if (start > currentText.length || end > currentText.length) {
            console.warn("Attempted replace out of bounds. Aborting.");
            return null;
        }
        const prefix = currentText.slice(0, start);
        const suffix = currentText.slice(end); 
        const newText = prefix + replacement + suffix;
        setText(newText);
        return newText;
    };

    // --- Lifecycle ---
    
    const performCycleRef = useRef(performCycle);
    useEffect(() => { performCycleRef.current = performCycle; });

    // TRIGGER: When settings are toggled (Resumed), immediately try to process
    useEffect(() => {
        const { fixTypos, fixPunctuation, dictionaryCheck } = settingsRef.current;
        // If any of the "Smart" settings are active and we are not currently processing, trigger a cycle immediately
        if ((fixTypos || fixPunctuation || dictionaryCheck) && !isProcessingRef.current) {
            if (performCycleRef.current) performCycleRef.current();
        }
    }, [settingsRef.current.fixTypos, settingsRef.current.fixPunctuation, settingsRef.current.dictionaryCheck]);

    const processTick = useCallback(async () => {
        if (isProcessingRef.current) return;
        if (statusRef.current === 'recording') return;

        const now = Date.now();
        const timeSinceTyping = now - lastActivityRef.current;
        
        if (timeSinceTyping < settingsRef.current.debounceMs) return;

        isProcessingRef.current = true;
        try {
            if (performCycleRef.current) await performCycleRef.current();
        } catch (e: any) {
            console.error("Processor Cycle Error:", e);
            if (e.isFatal) onFatalError(e.message);
            else onStatusChange('error');
        } finally {
            isProcessingRef.current = false;
        }

    }, [settingsRef, statusRef, onStatusChange, onFatalError]);

    useEffect(() => {
        processorIntervalRef.current = setInterval(processTick, 500);
        return () => {
            if (processorIntervalRef.current) clearInterval(processorIntervalRef.current);
        };
    }, [processTick]);

    const notifyActivity = useCallback(() => {
        lastActivityRef.current = Date.now();
    }, []);

    const reset = useCallback(() => {
        isProcessingRef.current = false;
        setProcessingOverlay(null);
        onStatusChange('idle');
    }, [onStatusChange]);

    return {
        notifyActivity,
        reset,
        processingOverlay // EXPORTED STATE
    };
};
