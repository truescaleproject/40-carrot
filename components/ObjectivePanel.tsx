
import React, { useState } from 'react';
import { Target, Plus, Trash2, Lock, Unlock } from 'lucide-react';

interface ObjectivePanelProps {
  isOpen: boolean;
  onToggle: () => void;
  onSpawn: (count: number) => void;
  onClear: () => void;
  objectiveCount: number;
  isLocked: boolean;
  onToggleLock: () => void;
}

export const ObjectivePanel: React.FC<ObjectivePanelProps> = ({ 
    isOpen, onSpawn, onClear, objectiveCount, isLocked, onToggleLock
}) => {
    const [count, setCount] = useState(5);

    if (!isOpen) return null;

    return (
        <div className="w-full h-full flex flex-col bg-grim-900/50">
            <div className="bg-grim-800 p-3 flex justify-between items-center border-b border-grim-700">
                <h3 className="font-bold text-grim-gold flex items-center gap-2 text-sm">
                    <Target size={16} /> Objectives
                </h3>
            </div>
            <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                {/* Lock Toggle */}
                <button 
                    onClick={onToggleLock}
                    className={`w-full flex items-center justify-between p-3 rounded border transition-all ${isLocked ? 'bg-grim-800 border-grim-500 shadow-md' : 'bg-grim-900/50 border-grim-700 hover:border-grim-600'}`}
                >
                    <div className="flex items-center gap-2">
                        {isLocked ? <Lock size={18} className="text-grim-gold"/> : <Unlock size={18} className="text-slate-500"/>}
                        <div className="text-left">
                            <div className={`text-sm font-bold ${isLocked ? 'text-grim-gold' : 'text-slate-400'}`}>
                                {isLocked ? 'Objectives Locked' : 'Objectives Unlocked'}
                            </div>
                            <div className="text-[10px] text-slate-500">
                                {isLocked ? 'Markers cannot be selected or moved.' : 'Markers can be dragged.'}
                            </div>
                        </div>
                    </div>
                    {/* Toggle Switch Visual */}
                    <div className={`w-10 h-5 rounded-full relative transition-colors ${isLocked ? 'bg-grim-gold' : 'bg-grim-700'}`}>
                        <div className={`absolute top-1 left-1 w-3 h-3 bg-grim-900 rounded-full transition-transform ${isLocked ? 'translate-x-5' : 'translate-x-0'}`} />
                    </div>
                </button>

                <div className={`bg-grim-900/50 p-4 rounded border border-grim-700 transition-opacity ${isLocked ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                    <div className="flex items-center justify-between mb-4">
                         <span className="text-sm font-bold text-text-primary uppercase">Count</span>
                         <div className="flex items-center gap-4">
                            <button onClick={() => setCount(Math.max(1, count - 1))} className="w-8 h-8 bg-grim-700 rounded text-text-primary flex items-center justify-center hover:bg-grim-600 font-bold text-lg">-</button>
                            <span className="text-2xl font-mono font-bold text-grim-gold w-8 text-center">{count}</span>
                            <button onClick={() => setCount(Math.min(10, count + 1))} className="w-8 h-8 bg-grim-700 rounded text-text-primary flex items-center justify-center hover:bg-grim-600 font-bold text-lg">+</button>
                         </div>
                    </div>
                    <button 
                        onClick={() => onSpawn(count)}
                        className="w-full bg-grim-gold text-grim-900 py-3 rounded text-sm font-bold hover:bg-yellow-400 flex items-center justify-center gap-2 shadow-lg"
                    >
                        <Plus size={16}/> Spawn Markers
                    </button>
                </div>
                
                 {objectiveCount > 0 && (
                    <button 
                        onClick={onClear}
                        disabled={isLocked}
                        className={`w-full bg-red-900/50 text-red-200 border border-red-800 py-3 rounded text-sm font-bold hover:bg-red-900 flex items-center justify-center gap-2 ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <Trash2 size={16}/> Clear All Objectives
                    </button>
                )}
                
                <div className="text-xs text-text-muted italic text-center space-y-2 mt-auto">
                    <p>Standard competitive play uses 40mm markers.</p>
                    <p>Select a marker to see distances to board edges.</p>
                </div>
            </div>
        </div>
    );
};
