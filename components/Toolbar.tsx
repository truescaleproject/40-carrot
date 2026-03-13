
import React, { useState, useEffect } from 'react';
import { InteractionMode } from '../types';
import { 
  MousePointer2, Hand, Pencil, Ruler, ScanLine, Undo2, Redo2, CircleDashed, Eraser, SquareX, Lock, Unlock, Maximize, Mountain, SquareDashed, PanelLeft, MoveRight, Type, MessageSquareX, Crosshair, ArrowUpRight
} from 'lucide-react';

interface ToolbarProps {
  mode: InteractionMode;
  setMode: (mode: InteractionMode) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  auraRadius: number | null;
  cycleAuraRadius: () => void;
  threatRange: number;
  cycleThreatRange: () => void;
  clearLines: () => void;
  clearArrows: () => void;
  clearDeploymentZones: () => void;
  onClearText: () => void;
  isTerrainLocked: boolean;
  toggleTerrainLock: () => void;
  showEdgeMeasurements?: boolean;
  toggleEdgeMeasurements?: () => void;
  isTerrainVisible: boolean;
  toggleTerrainVisibility: () => void;
  areZonesVisible: boolean;
  toggleZoneVisibility: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  mode, setMode, undo, redo, canUndo, canRedo, sidebarOpen, toggleSidebar,
  auraRadius, cycleAuraRadius, threatRange, cycleThreatRange, clearLines, clearArrows, clearDeploymentZones, onClearText,
  isTerrainLocked, toggleTerrainLock, showEdgeMeasurements, toggleEdgeMeasurements,
  isTerrainVisible, toggleTerrainVisibility, areZonesVisible, toggleZoneVisibility
}) => {
  const [confirmClearZones, setConfirmClearZones] = useState(false);

  useEffect(() => {
    if (confirmClearZones) {
        const timer = setTimeout(() => setConfirmClearZones(false), 3000);
        return () => clearTimeout(timer);
    }
  }, [confirmClearZones]);

  const tools = [
    { mode: InteractionMode.SELECT, icon: MousePointer2, label: "Select", shortcut: "V" },
    { mode: InteractionMode.PAN, icon: Hand, label: "Pan", shortcut: "B" },
    { mode: InteractionMode.MEASURE, icon: Ruler, label: "Measure", shortcut: "M" },
    { mode: InteractionMode.DEPLOYMENT, icon: ScanLine, label: "Deploy", shortcut: "," },
    { mode: InteractionMode.DRAW, icon: Pencil, label: "Draw", shortcut: "." },
    { mode: InteractionMode.ARROW, icon: MoveRight, label: "Arrow", shortcut: "A" },
    { mode: InteractionMode.TEXT, icon: Type, label: "Text", shortcut: "T" },
  ];

  const Tooltip = ({ text, shortcut }: { text: string, shortcut?: string }) => (
    <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-grim-900 border border-grim-600 text-text-primary text-[10px] px-2 py-1 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-75 pointer-events-none whitespace-nowrap z-[100]">
      {text} {shortcut && <span className="text-grim-gold font-mono ml-0.5">({shortcut})</span>}
    </div>
  );

  return (
    <div 
        className="fixed top-4 z-[60] flex items-start gap-3 transition-all duration-300 pointer-events-none"
        style={{ left: sidebarOpen ? 'calc(20rem + 1rem)' : '1rem' }}
    >
        <div
            role="toolbar"
            aria-label="Battlefield tools"
            className={`
                bg-grim-900/90 backdrop-blur backdrop-brightness-50 border border-grim-600 rounded-full px-2 py-1.5 flex items-center gap-2 shadow-2xl transition-all duration-300 pointer-events-auto
            `}
        >
            <div className="flex items-center gap-1 p-0.5">
                {tools.map(tool => {
                    const isActive = mode === tool.mode;
                    return (
                        <button
                            key={tool.mode}
                            onClick={() => setMode(tool.mode)}
                            aria-label={`${tool.label} tool (${tool.shortcut})`}
                            aria-pressed={isActive}
                            className={`
                                relative flex items-center justify-center gap-2 rounded-full transition-all duration-300 ease-out group
                                ${isActive
                                    ? 'bg-grim-gold text-grim-900 px-4 py-2 shadow-[0_0_15px_rgba(251,191,36,0.4)] scale-105 z-10 font-bold ring-2 ring-white/20'
                                    : 'text-text-muted hover:text-text-primary hover:bg-grim-800 w-10 h-10'
                                }
                            `}
                        >
                            <tool.icon size={isActive ? 20 : 18} strokeWidth={isActive ? 2.5 : 2} />
                            
                            {/* Animated Label */}
                            <span className={`
                                whitespace-nowrap overflow-hidden transition-all duration-300
                                ${isActive ? 'max-w-[100px] opacity-100 mr-1' : 'max-w-0 opacity-0'}
                            `}>
                                {tool.label}
                            </span>
                            
                            <Tooltip text={tool.label} shortcut={tool.shortcut} />
                        </button>
                    );
                })}
                
                {/* Separator */}
                <div className="w-px h-8 bg-grim-700 mx-2" />
                
                {/* Secondary Actions */}
                <div className="flex items-center gap-1">
                    {/* Group 0: Sidebar Toggle */}
                    <button
                        onClick={toggleSidebar}
                        aria-label={sidebarOpen ? "Close Sidebar (O)" : "Open Sidebar (O)"}
                        aria-pressed={sidebarOpen}
                        className={`relative group p-2 rounded-full transition-colors ${sidebarOpen ? 'text-grim-gold bg-grim-800' : 'text-text-muted hover:text-text-primary hover:bg-grim-800'}`}
                    >
                        <PanelLeft size={18} />
                        <Tooltip text={sidebarOpen ? "Close Sidebar" : "Open Sidebar"} shortcut="O" />
                    </button>

                    <div className="w-px h-6 bg-grim-700 mx-1 opacity-50" />

                    {/* Group 1: History */}
                    <button
                        onClick={undo}
                        disabled={!canUndo}
                        aria-label="Undo (Ctrl+Z)"
                        className="relative group p-2 text-text-muted hover:text-text-primary disabled:opacity-20 disabled:cursor-not-allowed hover:bg-grim-800 rounded-full transition-colors"
                    >
                        <Undo2 size={18} />
                        <Tooltip text="Undo" shortcut="Ctrl+Z" />
                    </button>
                    <button
                        onClick={redo}
                        disabled={!canRedo}
                        aria-label="Redo (Ctrl+Shift+Z)"
                        className="relative group p-2 text-text-muted hover:text-text-primary disabled:opacity-20 disabled:cursor-not-allowed hover:bg-grim-800 rounded-full transition-colors"
                    >
                        <Redo2 size={18} />
                        <Tooltip text="Redo" shortcut="Ctrl+Shift+Z" />
                    </button>

                    <div className="w-px h-6 bg-grim-700 mx-1 opacity-50" />

                    {/* Group 2: View & Lock Settings */}
                    <button
                        onClick={toggleTerrainLock}
                        aria-label={isTerrainLocked ? "Unlock Terrain (L)" : "Lock Terrain (L)"}
                        aria-pressed={isTerrainLocked}
                        className={`relative group p-2 rounded-full transition-colors ${isTerrainLocked ? 'text-grim-gold bg-grim-800' : 'text-text-muted hover:text-text-primary hover:bg-grim-800'}`}
                    >
                        {isTerrainLocked ? <Lock size={18} /> : <Unlock size={18} />}
                        <Tooltip text={isTerrainLocked ? "Unlock Terrain" : "Lock Terrain"} shortcut="L" />
                    </button>

                    <button
                        onClick={toggleTerrainVisibility}
                        aria-label={isTerrainVisible ? "Hide Terrain (H)" : "Show Terrain (H)"}
                        aria-pressed={!isTerrainVisible}
                        className={`relative group p-2 rounded-full transition-colors ${!isTerrainVisible ? 'text-grim-gold bg-grim-800' : 'text-text-muted hover:text-text-primary hover:bg-grim-800'}`}
                    >
                        <Mountain size={18} />
                        {!isTerrainVisible && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-5 h-0.5 bg-current rotate-45 rounded-full" />
                            </div>
                        )}
                        <Tooltip text={isTerrainVisible ? "Hide Terrain" : "Show Terrain"} shortcut="H" />
                    </button>

                    <button
                        onClick={toggleZoneVisibility}
                        aria-label={areZonesVisible ? "Hide Deployment Zones" : "Show Deployment Zones"}
                        aria-pressed={!areZonesVisible}
                        className={`relative group p-2 rounded-full transition-colors ${!areZonesVisible ? 'text-grim-gold bg-grim-800' : 'text-text-muted hover:text-text-primary hover:bg-grim-800'}`}
                    >
                        <SquareDashed size={18} />
                        {!areZonesVisible && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-5 h-0.5 bg-current rotate-45 rounded-full" />
                            </div>
                        )}
                        <Tooltip text={areZonesVisible ? "Hide Deployment Zones" : "Show Deployment Zones"} />
                    </button>

                    <div className="w-px h-6 bg-grim-700 mx-1 opacity-50" />

                    {/* Group 3: Cleanup */}
                    <button
                        onClick={clearLines}
                        aria-label="Clear Drawn Lines ([)"
                        className="relative group p-2 text-text-muted hover:text-text-primary hover:bg-grim-800 rounded-full transition-colors"
                    >
                        <Eraser size={18} />
                        <Tooltip text="Clear Drawn Lines" shortcut="[" />
                    </button>

                    <button
                        onClick={clearArrows}
                        aria-label="Clear Arrows"
                        className="relative group p-2 text-text-muted hover:text-text-primary hover:bg-grim-800 rounded-full transition-colors"
                    >
                        <ArrowUpRight size={18} />
                        <Tooltip text="Clear Arrows" />
                    </button>

                    <button
                        onClick={onClearText}
                        aria-label="Clear Text Notes"
                        className="relative group p-2 text-text-muted hover:text-text-primary hover:bg-grim-800 rounded-full transition-colors"
                    >
                        <MessageSquareX size={18} />
                        <Tooltip text="Clear Text Notes" />
                    </button>
                    
                    <button
                        onClick={() => {
                            if (confirmClearZones) {
                                clearDeploymentZones();
                                setConfirmClearZones(false);
                            } else {
                                setConfirmClearZones(true);
                            }
                        }}
                        aria-label={confirmClearZones ? "Confirm clear deployment zones" : "Clear Deployment Zones (])"}
                        className={`
                            relative group transition-all duration-200 flex items-center justify-center gap-1
                            ${confirmClearZones
                                ? 'bg-red-600 text-white px-3 py-1.5 rounded-full hover:bg-red-700 shadow-lg'
                                : 'p-2 text-text-muted hover:text-red-500 hover:bg-grim-800 rounded-full'
                            }
                        `}
                    >
                        <SquareX size={18} />
                        {confirmClearZones && <span className="text-[10px] font-bold whitespace-nowrap">Confirm Clear</span>}
                        <Tooltip text={confirmClearZones ? "Click again to confirm deletion" : "Clear Deployment Zones"} shortcut="]" />
                    </button>

                    <div className="w-px h-6 bg-grim-700 mx-1 opacity-50" />

                    {/* Group 4: Helpers */}
                    {toggleEdgeMeasurements && (
                        <button
                            onClick={toggleEdgeMeasurements}
                            aria-label={`Edge Distances ${showEdgeMeasurements ? 'on' : 'off'} (X)`}
                            aria-pressed={!!showEdgeMeasurements}
                            className={`relative group p-2 rounded-full transition-colors ${showEdgeMeasurements ? 'text-cyan-400 bg-grim-800 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'text-text-muted hover:text-text-primary hover:bg-grim-800'}`}
                        >
                            <Maximize size={18} />
                            <Tooltip text="Edge Distances" shortcut="X" />
                        </button>
                    )}

                    <button
                        onClick={cycleAuraRadius}
                        aria-label={`Toggle Auras: ${auraRadius ? auraRadius + ' inches' : 'Off'} (R)`}
                        className={`relative group p-2 rounded-full transition-colors flex items-center justify-center ${auraRadius !== null ? 'text-teal-400 bg-grim-800 shadow-[0_0_10px_rgba(45,212,191,0.2)]' : 'text-text-muted hover:text-text-primary hover:bg-grim-800'}`}
                    >
                        {auraRadius !== null ? (
                            <div className="relative w-5 h-5 flex items-center justify-center">
                                <CircleDashed size={18} className="opacity-50" />
                                <span className="absolute text-[9px] font-bold font-mono">{auraRadius}</span>
                            </div>
                        ) : (
                            <CircleDashed size={18} />
                        )}
                        <Tooltip text={`Toggle Auras: ${auraRadius ? auraRadius + '"' : 'Off'}`} shortcut="R" />
                    </button>

                    <button
                        onClick={cycleThreatRange}
                        aria-label={`Threat Range: ${threatRange === 0 ? 'Off' : threatRange === 1 ? 'Movement' : 'Movement+Charge'}`}
                        className={`relative group p-2 rounded-full transition-colors flex items-center justify-center ${threatRange === 1 ? 'text-red-400 bg-grim-800 shadow-[0_0_10px_rgba(248,113,113,0.2)]' : threatRange === 2 ? 'text-amber-400 bg-grim-800 shadow-[0_0_10px_rgba(251,191,36,0.2)]' : 'text-text-muted hover:text-text-primary hover:bg-grim-800'}`}
                    >
                        {threatRange !== 0 ? (
                            <div className="relative w-5 h-5 flex items-center justify-center">
                                <Crosshair size={18} className="opacity-50" />
                                <span className="absolute text-[8px] font-bold font-mono">{threatRange === 1 ? 'M' : 'M+C'}</span>
                            </div>
                        ) : (
                            <Crosshair size={18} />
                        )}
                        <Tooltip text={`Threat Range: ${threatRange === 0 ? 'Off' : threatRange === 1 ? 'Movement' : 'Move+Charge'}`} />
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};