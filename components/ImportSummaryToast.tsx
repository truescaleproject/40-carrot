
import React, { useEffect, useState } from 'react';
import { CheckCircle2, MousePointer2, Eye, X, Users, Box } from 'lucide-react';

export interface ImportSummaryData {
  unitCount: number;
  modelCount: number;
  side: 'ATTACKER' | 'DEFENDER';
  ids: string[];
}

interface ImportSummaryToastProps {
  data: ImportSummaryData | null;
  onSelect: () => void;
  onFocus: () => void;
  onDismiss: () => void;
}

export const ImportSummaryToast: React.FC<ImportSummaryToastProps> = ({ data, onSelect, onFocus, onDismiss }) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (data) {
      setProgress(100);
      const duration = 8000;
      const interval = 50;
      const step = (100 / duration) * interval;
      const timer = setInterval(() => {
        setProgress(p => {
          if (p <= 0) {
            clearInterval(timer);
            onDismiss();
            return 0;
          }
          return p - step;
        });
      }, interval);
      return () => clearInterval(timer);
    }
  }, [data, onDismiss]);

  if (!data) return null;

  const isAttacker = data.side === 'ATTACKER';
  const sideColor = isAttacker ? 'text-red-400' : 'text-blue-400';
  const sideBg = isAttacker ? 'bg-red-900/20 border-red-800/50' : 'bg-blue-900/20 border-blue-800/50';
  const progressColor = isAttacker ? '#ef4444' : '#3b82f6';

  return (
    <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-2 fade-in duration-300">
      <div className="bg-grim-900/95 backdrop-blur-md border border-grim-700/80 rounded-xl shadow-2xl p-4 flex flex-col gap-3 min-w-[300px] max-w-[380px] relative overflow-hidden">

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-grim-800">
          <div
            className="h-full transition-all ease-linear"
            style={{ width: `${progress}%`, backgroundColor: progressColor }}
          />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-green-900/30 p-2 rounded-full border border-green-700/40">
                <CheckCircle2 size={18} className="text-green-400" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Import Complete</h3>
              <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded border inline-block mt-1 ${sideBg} ${sideColor}`}>
                {data.side}
              </div>
            </div>
          </div>
          <button onClick={onDismiss} className="text-slate-500 hover:text-white transition-colors p-0.5">
            <X size={14} />
          </button>
        </div>

        {/* Stats */}
        <div className="flex gap-4 text-xs text-slate-300 bg-grim-800/40 p-2 rounded-lg border border-grim-700/30">
            <div className="flex items-center gap-2">
                <Box size={13} className="text-grim-gold"/>
                <span><strong className="text-white">{data.unitCount}</strong> unit{data.unitCount !== 1 ? 's' : ''}</span>
            </div>
            <div className="w-px h-4 bg-grim-700"></div>
            <div className="flex items-center gap-2">
                <Users size={13} className="text-grim-gold"/>
                <span><strong className="text-white">{data.modelCount}</strong> model{data.modelCount !== 1 ? 's' : ''}</span>
            </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => { onSelect(); onDismiss(); }}
            className="flex-1 bg-grim-700 hover:bg-grim-600 text-white text-[11px] font-bold py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-grim-600"
          >
            <MousePointer2 size={13} /> Select All
          </button>
          <button
            onClick={() => { onFocus(); onDismiss(); }}
            className="flex-1 bg-grim-700 hover:bg-grim-600 text-white text-[11px] font-bold py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-grim-600"
          >
            <Eye size={13} /> Center View
          </button>
        </div>
      </div>
    </div>
  );
};
