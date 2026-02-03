
import React from 'react';
import { ProcessingStatus, CorrectionSettings, Language } from '../types';
import { useSmartEditor } from '../hooks/useSmartEditor';
import { EditorSurface } from './Editor/EditorSurface';
import { EditorToolbar } from './Editor/EditorToolbar';
import { HistoryPanel } from './HistoryPanel';

interface SmartEditorProps {
  settings: CorrectionSettings;
  onStatsUpdate: (count: number) => void;
  language: Language;
  status: ProcessingStatus;
  onStatusChange: (status: ProcessingStatus) => void;
  setIsGrammarChecking: (isChecking: boolean) => void; // NEW
  onClipboardAction: (text: string) => void;
  resetSignal: number;
  showHistory: boolean;
  onToggleHistory: () => void;
  onPauseProcessing: () => void;
}

export const SmartEditor: React.FC<SmartEditorProps> = (props) => {
  const {
    text,
    committedLength,
    processedLength,
    checkedLength,
    finalizedSentences,
    textareaRef,
    backdropRef,
    isBusy,
    canUndo,
    canRedo,
    handleScroll,
    handleChange,
    handleKeyDown,
    handleClipboardEvent,
    handleUndo,
    handleRedo,
    handleEnhance,
    toggleRecording,
    visualizerDataRef,
    autoStopCountdown,
    visualizerStatus,
    history,
    historyIndex,
    handleHistoryJump
  } = useSmartEditor(props);

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden">
      
      <EditorSurface
        text={text}
        committedLength={committedLength}
        processedLength={processedLength}
        checkedLength={checkedLength}
        finalizedSentences={finalizedSentences} // New
        status={props.status}
        visualizerStatus={visualizerStatus}
        language={props.language}
        textareaRef={textareaRef}
        backdropRef={backdropRef}
        onChange={handleChange}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        onClipboard={handleClipboardEvent}
        visualizerDataRef={visualizerDataRef}
      />

      <EditorToolbar
        textLength={text.length}
        committedLength={committedLength}
        processedLength={processedLength}
        status={props.status}
        language={props.language}
        isBusy={isBusy}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onRecord={toggleRecording}
        onEnhance={handleEnhance}
        autoStopCountdown={autoStopCountdown}
        onHistoryClick={props.onToggleHistory}
        isHistoryOpen={props.showHistory}
      />

      {/* History Panel Integration */}
      <HistoryPanel 
        history={history}
        currentIndex={historyIndex}
        isOpen={props.showHistory}
        onClose={props.onToggleHistory}
        onRestore={handleHistoryJump}
        language={props.language}
      />

    </div>
  );
};
