
import React from 'react';
import { Users, Plus, Minus } from 'lucide-react';
import { BoardElement, ElementType } from '../../types';

interface UnitCompositionListProps {
    unitCompositionElements: BoardElement[];
    isSingleGroup: boolean;
    groupLabel: string;
    selectedIds: string[];
    setSelectedIds: (ids: string[]) => void;
    setSidebarHoveredId: (id: string | null) => void;
    adjustWounds: (ids: string[], delta: number) => void;
}

export const UnitCompositionList: React.FC<UnitCompositionListProps> = ({
    unitCompositionElements, isSingleGroup, groupLabel, selectedIds, setSelectedIds, setSidebarHoveredId, adjustWounds
}) => {
    return (
        <div className="mt-4 pt-4 border-t border-grim-700">
                <h3 className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-2">
                <Users size={14}/> 
                {unitCompositionElements.some(e => e.type === ElementType.TERRAIN) ? "Terrain Piece" : "Squad Composition"}
                {isSingleGroup && <span className="ml-auto text-grim-gold">{groupLabel}</span>}
                </h3>
                <div className="space-y-1">
                    {unitCompositionElements.map(el => (
                        <div 
                        key={el.id}
                        onMouseEnter={() => setSidebarHoveredId(el.id)}
                        onMouseLeave={() => setSidebarHoveredId(null)}
                        onClick={(e) => {
                            if (e.ctrlKey || e.metaKey) {
                                const newIds = selectedIds.includes(el.id) ? selectedIds.filter(id => id !== el.id) : [...selectedIds, el.id];
                                setSelectedIds(newIds);
                            } else {
                                setSelectedIds([el.id]);
                            }
                        }}
                        className={`flex items-center justify-between p-1.5 rounded text-xs cursor-pointer border ${selectedIds.includes(el.id) ? 'bg-grim-700 border-grim-500 text-white' : 'bg-grim-900/50 border-transparent text-slate-500 hover:text-slate-300'}`}
                        >
                            <span className="truncate">{el.label}</span>
                            {el.type === ElementType.MODEL && (
                                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                    <button 
                                        onClick={() => adjustWounds([el.id], -1)}
                                        className="text-slate-500 hover:text-red-400 p-0.5 rounded hover:bg-grim-800 transition-colors"
                                        title="Damage"
                                    >
                                        <Minus size={12}/>
                                    </button>
                                    <div className="text-[10px] font-mono text-center min-w-[30px]">
                                        <span className={(el.currentWounds || 0) <= 0 ? 'text-red-500 font-bold' : ((el.currentWounds || 0) < parseInt(el.stats?.w || '1') ? 'text-yellow-500' : 'text-green-400')}>
                                            {el.currentWounds}
                                        </span>
                                        <span className="text-slate-600">/</span>
                                        <span className="text-slate-500">{el.stats?.w}</span>
                                    </div>
                                    <button 
                                        onClick={() => adjustWounds([el.id], 1)}
                                        className="text-slate-500 hover:text-green-400 p-0.5 rounded hover:bg-grim-800 transition-colors"
                                        title="Heal"
                                    >
                                        <Plus size={12}/>
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
        </div>
    );
};
