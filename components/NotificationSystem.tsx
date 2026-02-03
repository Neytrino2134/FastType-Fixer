import React from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { CheckCircle2, AlertCircle, Info, XCircle, X } from 'lucide-react';

export const NotificationSystem: React.FC = () => {
  const { notifications, removeNotification } = useNotification();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none w-full max-w-md">
      {notifications.map((note) => (
        <div
          key={note.id}
          className={`
            pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-full shadow-2xl border backdrop-blur-md min-w-[240px] max-w-sm
            animate-in slide-in-from-top-2 fade-in duration-300
            ${note.type === 'success' ? 'bg-slate-900/95 border-emerald-500/30 text-emerald-100 shadow-emerald-900/10' : ''}
            ${note.type === 'error' ? 'bg-slate-900/95 border-red-500/30 text-red-100 shadow-red-900/10' : ''}
            ${note.type === 'info' ? 'bg-slate-900/95 border-indigo-500/30 text-indigo-100 shadow-indigo-900/10' : ''}
            ${note.type === 'warning' ? 'bg-slate-900/95 border-amber-500/30 text-amber-100 shadow-amber-900/10' : ''}
          `}
        >
          {/* Icon */}
          <div className="shrink-0">
            {note.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {note.type === 'error' && <XCircle className="w-4 h-4 text-red-400" />}
            {note.type === 'info' && <Info className="w-4 h-4 text-indigo-400" />}
            {note.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-400" />}
          </div>

          {/* Message */}
          <p className="text-xs font-medium flex-1 text-center">{note.message}</p>

          {/* Close Button */}
          <button 
            onClick={() => removeNotification(note.id)}
            className="shrink-0 p-0.5 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-3 h-3 opacity-70" />
          </button>
        </div>
      ))}
    </div>
  );
};