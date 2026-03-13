
import React, { useState } from 'react';
import { Board, BoardRef } from './Board';
import { InteractionMode, BoardElement, DrawingLine, DeploymentZone } from '../types';
import { Menu, Undo2, Redo2, MousePointer2, Hand, Ruler, Plus, Crosshair } from 'lucide-react';

export interface MobileLayoutProps {
  boardRef: React.RefObject<BoardRef | null>;
  elements: BoardElement[];
  setElements: React.Dispatch<React.SetStateAction<BoardElement[]>>;
  lines: DrawingLine[];
  setLines: React.Dispatch<React.SetStateAction<DrawingLine[]>>;
  zones: DeploymentZone[];
  setZones: React.Dispatch<React.SetStateAction<DeploymentZone[]>>;
  mode: InteractionMode;
  setMode: (mode: InteractionMode) => void;
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  
  backgroundImage: string | null;
  activeColor: string;
  pixelsPerInch: number;
  boardWidth: number;
  boardHeight: number;
  boardCount: number;
  
  onActionStart: () => void;
  onRightClick: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  
  labelFontSize: number;
  auraRadius: number | null;
  threatRange?: number;
  objectivesUnlocked: boolean;
  isTerrainLocked: boolean;
  showEdgeMeasurements: boolean;
  showCoherencyAlerts: boolean;
  isTerrainVisible: boolean;
  areZonesVisible: boolean;
  
  onMobileAdd: (type: any) => void; 
}

export const MobileLayout: React.FC<MobileLayoutProps> = (props) => {
  const [menuOpen, setMenuOpen] = useState(false);

  // We map the incoming props to BoardProps. 
  // We disable sidebar interactions for mobile view in Board.
  
  return (
    <div className="w-full h-full flex flex-col bg-grim-900 relative overflow-hidden touch-none">
        {/* Top Bar */}
        <div className="absolute top-0 left-0 w-full h-14 bg-grim-900/95 backdrop-blur border-b border-grim-800 z-50 flex justify-between items-center px-4 pt-safe-top">
            <div className="flex items-center gap-2">
                <span className="text-grim-gold font-bold font-science tracking-wider text-sm">40 CARROT</span>
                <span className="text-[9px] bg-grim-800 text-slate-400 px-1.5 rounded border border-grim-700">MOBILE</span>
            </div>
            <div className="flex gap-1">
                <button onClick={props.undo} disabled={!props.canUndo} className="p-2 text-slate-400 disabled:opacity-30 active:text-white"><Undo2 size={20}/></button>
                <button onClick={props.redo} disabled={!props.canRedo} className="p-2 text-slate-400 disabled:opacity-30 active:text-white"><Redo2 size={20}/></button>
                <div className="w-px h-6 bg-grim-700 mx-1 self-center"></div>
                <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 text-white active:text-grim-gold"><Menu size={20}/></button>
            </div>
        </div>

        {/* Main Board View */}
        <div className="flex-1 relative">
            <Board 
                ref={props.boardRef}
                elements={props.elements} setElements={props.setElements}
                lines={props.lines} setLines={props.setLines}
                zones={props.zones}
                mode={props.mode}
                selectedIds={props.selectedIds} setSelectedIds={props.setSelectedIds}
                backgroundImage={props.backgroundImage}
                activeColor={props.activeColor}
                pixelsPerInch={props.pixelsPerInch}
                boardWidth={props.boardWidth} boardHeight={props.boardHeight} boardCount={props.boardCount}
                onActionStart={props.onActionStart}
                sidebarHoveredId={null}
                onRightClick={props.onRightClick}
                labelFontSize={props.labelFontSize}
                sidebarOpen={false} // Always closed on mobile layout
                auraRadius={props.auraRadius}
                threatRange={props.threatRange}
                objectivesUnlocked={props.objectivesUnlocked}
                isTerrainLocked={props.isTerrainLocked}
                showEdgeMeasurements={props.showEdgeMeasurements}
                showCoherencyAlerts={props.showCoherencyAlerts}
                isTerrainVisible={props.isTerrainVisible}
                areZonesVisible={props.areZonesVisible}
                // Callbacks not strictly needed for basic mobile view can be no-ops
                onGroupRotationStart={() => {}}
                onGroupRotate={() => {}}
                onGroupRotationEnd={() => {}}
                onFocusedBoardChange={() => {}}
                displayMode="desktop"
            />
        </div>

        {/* Bottom Toolbar */}
        <div className="absolute bottom-0 left-0 w-full bg-grim-900/95 backdrop-blur border-t border-grim-800 z-50 pb-safe-bottom">
            <div className="flex justify-around items-center h-16 px-2">
                <NavButton 
                    active={props.mode === InteractionMode.PAN} 
                    onClick={() => props.setMode(InteractionMode.PAN)}
                    icon={Hand} label="Pan"
                />
                <NavButton 
                    active={props.mode === InteractionMode.SELECT} 
                    onClick={() => props.setMode(InteractionMode.SELECT)}
                    icon={MousePointer2} label="Select"
                />
                
                {/* Center Action Button */}
                <div className="relative -top-6">
                    <button 
                        onClick={() => props.onMobileAdd('MODEL')} // Default to model for now
                        className="w-14 h-14 rounded-full bg-grim-gold text-grim-900 flex items-center justify-center shadow-[0_0_20px_rgba(251,191,36,0.3)] border-4 border-grim-900 active:scale-95 transition-transform"
                    >
                        <Plus size={28} strokeWidth={3} />
                    </button>
                </div>

                <NavButton 
                    active={props.mode === InteractionMode.MEASURE} 
                    onClick={() => props.setMode(InteractionMode.MEASURE)}
                    icon={Ruler} label="Measure"
                />
                {/* Helper to clear selection if hard to click empty space */}
                <button 
                    onClick={() => props.setSelectedIds([])}
                    disabled={props.selectedIds.length === 0}
                    className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg transition-colors ${props.selectedIds.length > 0 ? 'text-slate-300' : 'text-slate-700'}`}
                >
                    <Crosshair size={20} />
                    <span className="text-[10px] font-bold mt-1">Clear</span>
                </button>
            </div>
        </div>

        {/* Simple Mobile Menu Overlay */}
        {menuOpen && (
            <div className="absolute inset-0 bg-grim-900/98 z-[100] p-6 animate-in slide-in-from-right flex flex-col">
                <div className="flex justify-between items-center mb-8 border-b border-grim-800 pb-4">
                    <h2 className="text-xl font-bold text-grim-gold">Tactical Menu</h2>
                    <button onClick={() => setMenuOpen(false)} className="text-white bg-grim-800 px-4 py-2 rounded">Close</button>
                </div>
                <div className="space-y-4 flex-1">
                    <div className="p-4 bg-grim-800 rounded border border-grim-700">
                        <p className="text-slate-400 text-sm mb-2">Battlefield View</p>
                        <div className="grid grid-cols-2 gap-2">
                             <button className="bg-grim-700 p-2 rounded text-xs text-white">Reset Camera</button>
                             <button className="bg-grim-700 p-2 rounded text-xs text-white">Toggle Terrain</button>
                        </div>
                    </div>
                    <div className="p-4 bg-grim-800 rounded border border-grim-700">
                        <p className="text-slate-400 text-sm mb-2">Selection</p>
                        <p className="text-xs text-slate-500">
                            {props.selectedIds.length} objects selected.
                        </p>
                    </div>
                </div>
                <div className="text-center text-xs text-slate-600 pb-safe-bottom">
                    Mobile Layout v1.0
                </div>
            </div>
        )}
    </div>
  );
};

const NavButton = ({ active, onClick, icon: Icon, label }: any) => (
    <button 
        onClick={onClick}
        className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg transition-all ${active ? 'text-grim-gold translate-y-[-2px]' : 'text-slate-500 active:text-slate-300'}`}
    >
        <Icon size={20} strokeWidth={active ? 2.5 : 2}/>
        <span className="text-[10px] font-bold mt-1">{label}</span>
    </button>
);
