import React from 'react';
import { Swords, Hammer, Palette } from 'lucide-react';
import { WorkspaceMode } from '../../types/workspace';

interface WorkspaceTabsProps {
  activeMode: WorkspaceMode;
  onChange: (mode: WorkspaceMode) => void;
}

const tabs: { mode: WorkspaceMode; icon: React.ElementType; label: string }[] = [
  { mode: 'PLAY', icon: Swords, label: 'Play' },
  { mode: 'BUILD', icon: Hammer, label: 'Build' },
  { mode: 'PAINT', icon: Palette, label: 'Paint' },
];

export const WorkspaceTabs: React.FC<WorkspaceTabsProps> = ({ activeMode, onChange }) => {
  return (
    <div className="flex bg-grim-800 rounded p-0.5 gap-0.5" role="tablist" aria-label="Workspace mode">
      {tabs.map(tab => {
        const isActive = activeMode === tab.mode;
        return (
          <button
            key={tab.mode}
            role="tab"
            aria-selected={isActive}
            aria-controls={`workspace-${tab.mode.toLowerCase()}`}
            onClick={() => onChange(tab.mode)}
            className={`
              flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded transition-all duration-200
              ${isActive
                ? 'bg-grim-700 text-grim-gold shadow-lg border border-grim-gold/30'
                : 'text-slate-500 hover:text-slate-300 hover:bg-grim-700/50'
              }
            `}
          >
            <tab.icon size={14} strokeWidth={isActive ? 2.5 : 2} />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
