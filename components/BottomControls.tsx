
import React, { useState, useEffect, Suspense } from 'react';
import { 
  Cpu, Dices, Palette, Keyboard, FileDown, Target, Settings, HelpCircle,
  MousePointer2, Hand, Ruler, Map, X, Loader2
} from 'lucide-react';
import { COLORS, APP_VERSION } from '../constants';
import { BoardElement, AiDeploymentItem, ElementType, ViewportInfo, AppSettings } from '../types';

// Lazy load panels for performance
const DiceRoller = React.lazy(() => import('./DiceRoller').then(m => ({ default: m.DiceRoller })));
const TacticalAdvisor = React.lazy(() => import('./TacticalAdvisor').then(m => ({ default: m.TacticalAdvisor })));
const ArmyImporter = React.lazy(() => import('./ArmyImporter').then(m => ({ default: m.ArmyImporter })));
const ObjectivePanel = React.lazy(() => import('./ObjectivePanel').then(m => ({ default: m.ObjectivePanel })));
const SettingsPanel = React.lazy(() => import('./SettingsPanel').then(m => ({ default: m.SettingsPanel })));

export type ActiveBottomPanel = 'NONE' | 'DICE' | 'AUSPEX' | 'INFO' | 'COLORS' | 'IMPORT' | 'OBJECTIVES' | 'SETTINGS';

interface BottomControlsProps {
  activeBottomPanel: ActiveBottomPanel;
  setActiveBottomPanel: (panel: ActiveBottomPanel) => void;
  activeColor: string;
  setActiveColor: (color: string) => void;
  
  // Tactical Advisor Props
  elements: BoardElement[];
  boardWidth: number;
  boardHeight: number;
  onDeploy: (items: AiDeploymentItem[]) => void;
  onImport: (elements: BoardElement[], side: 'ATTACKER' | 'DEFENDER') => void;
  getViewport: () => ViewportInfo | null;
  
  // Objectives Props
  onSpawnObjectives: (count: number) => void;
  onClearObjectives: () => void;
  isObjectivesLocked: boolean;
  toggleObjectiveLock: () => void;
  
  // Settings Props
  appSettings: AppSettings;
  onUpdateSetting: (key: keyof AppSettings, value: any) => void;
  onShowWelcome: () => void;
  onBackupData: () => void;
  onRestoreData: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenDataCards?: () => void;
  isRightPanelOpen?: boolean;
}

export const BottomControls: React.FC<BottomControlsProps> = ({
  activeBottomPanel, setActiveBottomPanel,
  activeColor, setActiveColor,
  elements, boardWidth, boardHeight, onDeploy, onImport, getViewport,
  onSpawnObjectives, onClearObjectives, isObjectivesLocked, toggleObjectiveLock,
  appSettings, onUpdateSetting, onShowWelcome,
  onBackupData, onRestoreData, onOpenDataCards,
  isRightPanelOpen = false
}) => {

  const togglePanel = (panel: ActiveBottomPanel) => {
    setActiveBottomPanel(activeBottomPanel === panel ? 'NONE' : panel);
  };

  // Close panel on Escape key
  useEffect(() => {
    if (activeBottomPanel === 'NONE') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        setActiveBottomPanel('NONE');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeBottomPanel, setActiveBottomPanel]);

  const objectiveCount = elements.filter(e => e.type === ElementType.OBJECTIVE).length;

  const tabs: { id: ActiveBottomPanel, icon: React.ElementType, label: string, colorClass: string }[] = [
    { id: 'AUSPEX', icon: Cpu, label: 'Advisor', colorClass: 'text-green-400' },
    { id: 'OBJECTIVES', icon: Target, label: 'Objectives', colorClass: 'text-teal-400' },
    { id: 'IMPORT', icon: FileDown, label: 'Roster', colorClass: 'text-blue-400' },
    { id: 'DICE', icon: Dices, label: 'Dice', colorClass: 'text-grim-gold' },
    { id: 'COLORS', icon: Palette, label: 'Colors', colorClass: 'text-purple-400' },
    { id: 'SETTINGS', icon: Settings, label: 'Settings', colorClass: 'text-slate-300' },
    { id: 'INFO', icon: HelpCircle, label: 'Manual', colorClass: 'text-white' },
  ];

  const LoadingFallback = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-6 gap-3">
        <Loader2 size={32} className="animate-spin text-grim-gold opacity-50" />
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest animate-pulse">Initializing Component...</span>
    </div>
  );

  const renderContent = () => {
    switch (activeBottomPanel) {
        case 'DICE':
            return (
                <Suspense fallback={<LoadingFallback />}>
                    <DiceRoller isOpen={true} onToggle={() => {}} />
                </Suspense>
            );
        case 'AUSPEX':
            return (
                <Suspense fallback={<LoadingFallback />}>
                    <TacticalAdvisor 
                        isOpen={true} 
                        onToggle={() => {}} 
                        elements={elements} 
                        boardWidth={boardWidth} 
                        boardHeight={boardHeight} 
                        onDeploy={onDeploy} 
                        getViewport={getViewport}
                        appSettings={appSettings}
                        onUpdateSetting={onUpdateSetting}
                    />
                </Suspense>
            );
        case 'IMPORT':
            return (
                <Suspense fallback={<LoadingFallback />}>
                    <ArmyImporter isOpen={true} onToggle={() => {}} onImport={onImport} pixelsPerInch={25.4} elements={elements} onOpenDataCards={onOpenDataCards || (() => {})} />
                </Suspense>
            );
        case 'OBJECTIVES':
            return (
                <Suspense fallback={<LoadingFallback />}>
                    <ObjectivePanel 
                        isOpen={true} 
                        onToggle={() => {}} 
                        onSpawn={onSpawnObjectives} 
                        onClear={onClearObjectives} 
                        objectiveCount={objectiveCount} 
                        isLocked={isObjectivesLocked}
                        onToggleLock={toggleObjectiveLock}
                    />
                </Suspense>
            );
        case 'SETTINGS':
            return (
                <Suspense fallback={<LoadingFallback />}>
                    <SettingsPanel isOpen={true} onToggle={() => {}} settings={appSettings} onUpdateSetting={onUpdateSetting} onBackupData={onBackupData} onRestoreData={onRestoreData} />
                </Suspense>
            );
        case 'COLORS':
            return (
                <div className="flex flex-col h-full">
                    <div className="bg-grim-800 p-3 border-b border-grim-700 flex justify-between items-center">
                        <h3 className="font-bold text-white flex items-center gap-2 text-sm"><Palette size={16}/> Color Palette</h3>
                    </div>
                    <div className="p-4 flex-1 bg-grim-900/50 overflow-y-auto">
                        <div className="grid grid-cols-5 gap-2">
                            {COLORS.map(c => (
                                <button 
                                key={c} 
                                className={`w-10 h-10 rounded-full border-4 transition-transform hover:scale-110 shadow-lg ${activeColor === c ? 'border-white ring-2 ring-grim-900' : 'border-grim-800'}`}
                                style={{ backgroundColor: c }}
                                onClick={() => setActiveColor(c)}
                                title={c}
                                />
                            ))}
                        </div>
                        <div className="mt-6 text-center text-xs text-slate-500">
                            Select a color to paint new units or terrain.
                        </div>
                    </div>
                </div>
            );
        case 'INFO':
            return (
                <div className="flex flex-col h-full bg-grim-900/50">
                     <div className="flex justify-between items-center p-3 border-b border-grim-700 bg-grim-800">
                        <h3 className="text-sm font-bold text-grim-gold uppercase flex items-center gap-2">
                            <HelpCircle size={16}/> Field Manual
                        </h3>
                        <button
                            onClick={onShowWelcome}
                            className="text-[10px] bg-grim-700 hover:bg-grim-600 border border-grim-600 text-text-primary px-2.5 py-1 rounded-lg transition-colors"
                        >
                            Show Intro
                        </button>
                     </div>
                     <div className="overflow-y-auto p-4 space-y-5 scrollbar-thin scrollbar-thumb-grim-700">
                        <div>
                            <h4 className="text-xs font-bold text-grim-gold uppercase mb-2 border-b border-grim-700 pb-1">Quick Start</h4>
                            <div className="space-y-2.5 text-[11px] text-text-secondary bg-grim-800/30 p-3 rounded-lg border border-grim-700/50">
                                <div className="flex gap-2">
                                    <div className="font-bold text-grim-gold min-w-[16px]">1.</div>
                                    <div><strong className="text-text-primary">Prepare Battlefield</strong> — Open Sidebar <Map size={10} className="inline text-slate-400"/> settings to load a preset map.</div>
                                </div>
                                <div className="flex gap-2">
                                    <div className="font-bold text-grim-gold min-w-[16px]">2.</div>
                                    <div><strong className="text-text-primary">Load Armies</strong> — Use the Roster <FileDown size={10} className="inline text-slate-400"/> tab to import units via AI, CSV, or builder.</div>
                                </div>
                                <div className="flex gap-2">
                                    <div className="font-bold text-grim-gold min-w-[16px]">3.</div>
                                    <div><strong className="text-text-primary">Play</strong> — Deploy units, measure <Ruler size={10} className="inline text-slate-400"/>, move, and roll dice <Dices size={10} className="inline text-slate-400"/>.</div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-text-primary uppercase mb-2 border-b border-grim-700 pb-1">Controls</h4>
                            <div className="space-y-2.5 text-[11px] text-text-secondary">
                                <div className="flex gap-3 items-start">
                                    <div className="min-w-7 flex justify-center pt-0.5"><MousePointer2 size={14} className="text-blue-400"/></div>
                                    <div><strong className="text-text-primary">Select & Move</strong> — Click to select, drag to move. <kbd className="bg-grim-800 px-1 rounded text-text-primary font-mono text-[10px] border border-grim-700/50">Shift</kbd>+click for multi-select. Right-click to deselect.</div>
                                </div>
                                <div className="flex gap-3 items-start">
                                    <div className="min-w-7 flex justify-center pt-0.5"><Hand size={14} className="text-blue-400"/></div>
                                    <div><strong className="text-text-primary">Navigate</strong> — Hold <kbd className="bg-grim-800 px-1 rounded text-text-primary font-mono text-[10px] border border-grim-700/50">Space</kbd> to pan. Scroll to zoom. Tap <kbd className="bg-grim-800 px-1 rounded text-text-primary font-mono text-[10px] border border-grim-700/50">Space</kbd> to reset view.</div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-text-primary uppercase mb-2 border-b border-grim-700 pb-1 flex items-center gap-2"><Keyboard size={13}/> Shortcuts</h4>
                            <div className="grid grid-cols-2 gap-1.5 text-[10px] text-text-secondary font-mono bg-grim-800/20 p-2.5 rounded-lg border border-grim-700/30">
                                <div className="col-span-2 text-[8px] text-slate-500 uppercase font-bold tracking-wider pt-0.5">Tools</div>
                                <div className="flex justify-between px-1"><span className="text-text-muted">Select</span><span className="text-grim-gold">V</span></div>
                                <div className="flex justify-between px-1"><span className="text-text-muted">Pan</span><span className="text-grim-gold">B</span></div>
                                <div className="flex justify-between px-1"><span className="text-text-muted">Measure</span><span className="text-grim-gold">M</span></div>
                                <div className="flex justify-between px-1"><span className="text-text-muted">Arrow</span><span className="text-grim-gold">A</span></div>
                                <div className="flex justify-between px-1"><span className="text-text-muted">Draw</span><span className="text-grim-gold">.</span></div>
                                <div className="flex justify-between px-1"><span className="text-text-muted">Deploy Zone</span><span className="text-grim-gold">,</span></div>
                                <div className="col-span-2 text-[8px] text-slate-500 uppercase font-bold tracking-wider pt-1.5">Actions</div>
                                <div className="flex justify-between px-1"><span className="text-text-muted">Undo</span><span className="text-grim-gold">Ctrl+Z</span></div>
                                <div className="flex justify-between px-1"><span className="text-text-muted">Redo</span><span className="text-grim-gold">Ctrl+Shift+Z</span></div>
                                <div className="flex justify-between px-1"><span className="text-text-muted">Copy</span><span className="text-grim-gold">Ctrl+C</span></div>
                                <div className="flex justify-between px-1"><span className="text-text-muted">Paste</span><span className="text-grim-gold">Ctrl+V</span></div>
                                <div className="flex justify-between px-1"><span className="text-text-muted">Delete</span><span className="text-grim-gold">Del</span></div>
                                <div className="flex justify-between px-1"><span className="text-text-muted">Group</span><span className="text-grim-gold">G</span></div>
                                <div className="flex justify-between px-1"><span className="text-text-muted">Damage Mode</span><span className="text-grim-gold">Tab</span></div>
                                <div className="flex justify-between px-1"><span className="text-text-muted">Clear Lines</span><span className="text-grim-gold">[</span></div>
                                <div className="flex justify-between px-1"><span className="text-text-muted">Clear Zones</span><span className="text-grim-gold">]</span></div>
                                <div className="flex justify-between px-1"><span className="text-text-muted">Close Panel</span><span className="text-grim-gold">Esc</span></div>
                                <div className="flex justify-between px-1"><span className="text-text-muted">Snap to Grid</span><span className="text-grim-gold">Shift</span></div>
                                <div className="col-span-2 text-[8px] text-slate-500 uppercase font-bold tracking-wider pt-1.5">Toggles</div>
                                <div className="flex justify-between px-1"><span className="text-text-muted">Auras</span><span className="text-grim-gold">R</span></div>
                                <div className="flex justify-between px-1"><span className="text-text-muted">Sidebar</span><span className="text-grim-gold">O</span></div>
                                <div className="flex justify-between px-1"><span className="text-text-muted">Lock Terrain</span><span className="text-grim-gold">L</span></div>
                                <div className="flex justify-between px-1"><span className="text-text-muted">Hide Terrain</span><span className="text-grim-gold">H</span></div>
                                <div className="flex justify-between px-1"><span className="text-text-muted">Edge Lengths</span><span className="text-grim-gold">X</span></div>
                                <div className="flex justify-between px-1"><span className="text-text-muted">Threat Range</span><span className="text-grim-gold">T</span></div>
                                <div className="col-span-2 text-[8px] text-slate-500 uppercase font-bold tracking-wider pt-1.5">Formations</div>
                                <div className="flex justify-between px-1"><span className="text-text-muted">Coherency</span><span className="text-grim-gold">C</span></div>
                                <div className="flex justify-between px-1"><span className="text-text-muted">Base-to-Base</span><span className="text-grim-gold">Shift+C</span></div>
                                <div className="flex justify-between px-1"><span className="text-text-muted">Circle</span><span className="text-grim-gold">Alt+C</span></div>
                            </div>
                        </div>
                        <div className="pt-3 border-t border-grim-700/50">
                            <p className="text-[9px] text-text-muted leading-relaxed text-center">
                                40 Carrot is a system-agnostic practice tool, not affiliated with or endorsed by any game publisher.
                            </p>
                        </div>
                     </div>
                </div>
            );
        default:
            return null;
    }
  };

  const isCompactPanel = ['OBJECTIVES', 'COLORS'].includes(activeBottomPanel);
  const isTallPanel = ['SETTINGS'].includes(activeBottomPanel);

  return (
    <div className="absolute bottom-0 left-0 w-full pointer-events-none z-50 flex flex-col justify-end">
      {activeBottomPanel !== 'NONE' && (
        <div className={`
            absolute bottom-[4.5rem] w-[24rem] max-h-[70vh]
            ${isRightPanelOpen ? 'right-[19.5rem]' : 'right-4'}
            ${isCompactPanel ? 'h-[22.5rem]' : (isTallPanel ? 'h-[37.5rem]' : 'h-[30rem]')}
            bg-grim-900/95 backdrop-blur-md border border-grim-700/80 shadow-2xl rounded-xl pointer-events-auto
            animate-in slide-in-from-bottom-2 fade-in duration-200
            flex flex-col z-50 overflow-hidden transition-[height,right] ease-in-out
        `}>
            <div className="flex-1 overflow-hidden relative flex flex-col">
                {renderContent()}
            </div>
            <button
                onClick={() => setActiveBottomPanel('NONE')}
                className="absolute top-2.5 right-2.5 text-slate-400 hover:text-white bg-grim-800/80 p-1.5 rounded-full hover:bg-grim-700 transition-colors z-50 backdrop-blur"
                title="Close Panel (Esc)"
                aria-label="Close panel"
            >
                <X size={14}/>
            </button>
        </div>
      )}

      <div className="bg-grim-900/95 backdrop-blur border-t border-grim-800 pointer-events-auto shadow-2xl relative z-40">
        <div className="flex justify-between items-stretch h-14 max-w-3xl mx-auto px-1" role="tablist" aria-label="Bottom panels">
          {tabs.map((tab) => {
            const isActive = activeBottomPanel === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => togglePanel(tab.id)}
                role="tab"
                aria-selected={isActive}
                aria-label={tab.label}
                className={`
                  flex-1 flex flex-col items-center justify-center gap-0.5 transition-all duration-200 relative group rounded-lg mx-0.5
                  ${isActive ? 'text-text-primary bg-grim-800/50' : 'text-text-muted hover:text-text-secondary hover:bg-grim-800/30'}
                `}
              >
                {isActive && (
                  <div className="absolute top-0 left-3 right-3 h-0.5 bg-grim-gold rounded-full shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
                )}
                <Icon
                  size={18}
                  className={`transition-colors duration-200 ${isActive ? tab.colorClass : 'text-slate-500 group-hover:text-slate-400'}`}
                  strokeWidth={isActive ? 2.5 : 1.75}
                />
                <span className={`text-[9px] font-bold uppercase tracking-wider ${isActive ? 'opacity-100' : 'opacity-50 group-hover:opacity-70'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
