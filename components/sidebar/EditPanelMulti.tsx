
import React, { useState } from 'react';
import { Users, Link, Unlink, Grid, Flag, Lock, RotateCw, RotateCcw, BoxSelect, RefreshCw, ChevronDown, ChevronUp, Palette, Plus } from 'lucide-react';
import { COLORS } from '../../constants';

interface EditPanelMultiProps {
    activeColor: string;
    updateBatchColor: (color: string) => void;
    isSingleGroup: boolean;
    groupLabel: string;
    updateGroupLabel: (label: string) => void;
    groupColor: string;
    updateGroupColor: (color: string) => void;
    ungroupSelected: () => void;
    groupSelected: () => void;
    applyFormation: (type: 'LINE_COHERENCY' | 'BASE_TO_BASE' | 'CIRCLE') => void;
    updateSelectedSide: (side: 'ATTACKER' | 'DEFENDER') => void;
    toggleLocked: () => void;
    rotateGroup: (degrees: number) => void;
    startGroupRotation: () => void;
    applyGroupRotation: (angle: number) => void;
    commitGroupRotation: () => void;
}

export const EditPanelMulti: React.FC<EditPanelMultiProps> = ({
    activeColor, updateBatchColor, isSingleGroup, groupLabel, updateGroupLabel,
    groupColor, updateGroupColor, ungroupSelected, groupSelected, applyFormation,
    updateSelectedSide, toggleLocked, rotateGroup,
    startGroupRotation, applyGroupRotation, commitGroupRotation
}) => {
    const [activeTab, setActiveTab] = useState<'GENERAL' | 'TRANSFORM'>('GENERAL');
    const [rotationSliderValue, setRotationSliderValue] = useState(0);
    
    // Collapsible states
    const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);
    const [isGroupingOpen, setIsGroupingOpen] = useState(true);

    const handleRotationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = Number(e.target.value);
        setRotationSliderValue(val);
        applyGroupRotation(val);
    };

    const handleRotationEnd = () => {
        commitGroupRotation();
        setRotationSliderValue(0);
    };

    const handleRotationStart = () => {
        startGroupRotation();
    };

    return (
        <div className="space-y-4">
            <div className="flex bg-grim-800 p-1 rounded border border-grim-700">
                <button
                    onClick={() => setActiveTab('GENERAL')}
                    className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded text-[10px] font-bold transition-all ${activeTab === 'GENERAL' ? 'bg-grim-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <BoxSelect size={12}/> General
                </button>
                <button
                    onClick={() => setActiveTab('TRANSFORM')}
                    className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded text-[10px] font-bold transition-all ${activeTab === 'TRANSFORM' ? 'bg-grim-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <RefreshCw size={12}/> Transform
                </button>
            </div>

            {activeTab === 'GENERAL' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="flex gap-2">
                        <button 
                            onClick={toggleLocked}
                            className="flex-1 bg-grim-800 text-slate-400 border border-grim-700 py-2 rounded text-xs hover:bg-grim-700 hover:text-white flex items-center justify-center gap-2"
                        >
                            <Lock size={14}/> Toggle Lock
                        </button>
                    </div>

                    {/* Appearance & Faction Collapsible */}
                    <div className="border border-grim-700 rounded bg-grim-800/50 overflow-hidden">
                        <button 
                            onClick={() => setIsAppearanceOpen(!isAppearanceOpen)}
                            className="w-full flex justify-between items-center p-2 bg-grim-800 text-xs font-bold text-slate-300 hover:text-white hover:bg-grim-700 transition-colors"
                        >
                            <span className="flex items-center gap-2"><Palette size={14}/> Appearance & Faction</span>
                            {isAppearanceOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                        </button>
                        
                        {isAppearanceOpen && (
                            <div className="p-3 border-t border-grim-700 space-y-4 animate-in slide-in-from-top-2 duration-200">
                                {/* Color Palette */}
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-slate-500 mb-2 block">Batch Color</label>
                                    <div className="flex flex-wrap gap-2">
                                        {COLORS.map(c => (
                                            <button 
                                                key={c}
                                                onClick={() => updateBatchColor(c)}
                                                className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${activeColor === c ? 'border-white ring-1 ring-grim-900 shadow-sm' : 'border-transparent'}`}
                                                style={{ backgroundColor: c }}
                                                title={c}
                                            />
                                        ))}
                                        <div className="flex items-center ml-auto">
                                            <div className="w-6 h-6 rounded-full border border-grim-600 bg-transparent overflow-hidden relative cursor-pointer" title="Custom Color">
                                                <input 
                                                    type="color" 
                                                    value={activeColor}
                                                    onChange={(e) => updateBatchColor(e.target.value)}
                                                    className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] cursor-pointer p-0 m-0 border-0 opacity-0"
                                                />
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Plus size={10} className="text-slate-500"/>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Allegiance Buttons */}
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-slate-500 mb-2 block">Allegiance</label>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => updateSelectedSide('ATTACKER')}
                                            className="flex-1 py-1.5 text-[10px] font-bold rounded border bg-grim-900 border-grim-700 text-slate-500 hover:bg-red-900/50 hover:text-white hover:border-red-500 transition-colors flex items-center justify-center gap-1"
                                        >
                                            <Flag size={12} className="fill-current text-red-500"/> Attacker
                                        </button>
                                        <button 
                                            onClick={() => updateSelectedSide('DEFENDER')}
                                            className="flex-1 py-1.5 text-[10px] font-bold rounded border bg-grim-900 border-grim-700 text-slate-500 hover:bg-blue-900/50 hover:text-white hover:border-blue-500 transition-colors flex items-center justify-center gap-1"
                                        >
                                            <Flag size={12} className="fill-current text-blue-500"/> Defender
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Grouping Collapsible */}
                    <div className="border border-grim-700 rounded bg-grim-800/50 overflow-hidden">
                        <button 
                            onClick={() => setIsGroupingOpen(!isGroupingOpen)}
                            className="w-full flex justify-between items-center p-2 bg-grim-800 text-xs font-bold text-slate-300 hover:text-white hover:bg-grim-700 transition-colors"
                        >
                            <span className="flex items-center gap-2"><Users size={14}/> Grouping</span>
                            {isGroupingOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                        </button>

                        {isGroupingOpen && (
                            <div className="p-3 border-t border-grim-700 animate-in slide-in-from-top-2 duration-200">
                                {isSingleGroup ? (
                                    <div className="space-y-2">
                                        <div className="flex gap-2">
                                            <input 
                                                value={groupLabel}
                                                onChange={e => updateGroupLabel(e.target.value)}
                                                className="flex-1 bg-grim-900 border border-grim-600 rounded p-1.5 text-xs text-white"
                                                placeholder="Group Name"
                                            />
                                            <input 
                                                type="color"
                                                value={groupColor || '#ffffff'}
                                                onChange={e => updateGroupColor(e.target.value)}
                                                className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
                                            />
                                        </div>
                                        <button 
                                            onClick={ungroupSelected}
                                            className="w-full bg-grim-700 text-slate-200 py-1.5 rounded text-xs hover:bg-grim-600 flex items-center justify-center gap-2"
                                        >
                                            <Unlink size={14}/> Ungroup
                                        </button>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={groupSelected}
                                        className="w-full bg-grim-700 text-slate-200 py-1.5 rounded text-xs hover:bg-grim-600 flex items-center justify-center gap-2"
                                    >
                                        <Link size={14}/> Group Selected
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'TRANSFORM' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="bg-grim-800 p-3 rounded border border-grim-700">
                        <h3 className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-2"><RotateCw size={14}/> Free Rotation</h3>
                        <div className="mb-4 px-1">
                            <input 
                                type="range" 
                                min="-180" 
                                max="180" 
                                value={rotationSliderValue}
                                onMouseDown={handleRotationStart}
                                onTouchStart={handleRotationStart}
                                onChange={handleRotationChange}
                                onMouseUp={handleRotationEnd}
                                onTouchEnd={handleRotationEnd}
                                className="w-full h-2 bg-grim-900 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="flex justify-between text-[9px] text-slate-500 mt-1 font-mono">
                                <span>-180°</span>
                                <span className="text-grim-gold font-bold">{rotationSliderValue > 0 ? `+${rotationSliderValue}°` : `${rotationSliderValue}°`}</span>
                                <span>+180°</span>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-2 mb-2">
                            <button onClick={() => rotateGroup(-90)} className="bg-grim-900 border border-grim-700 rounded py-1.5 text-[10px] text-slate-300 hover:bg-grim-700">-90°</button>
                            <button onClick={() => rotateGroup(-45)} className="bg-grim-900 border border-grim-700 rounded py-1.5 text-[10px] text-slate-300 hover:bg-grim-700">-45°</button>
                            <button onClick={() => rotateGroup(45)} className="bg-grim-900 border border-grim-700 rounded py-1.5 text-[10px] text-slate-300 hover:bg-grim-700">+45°</button>
                            <button onClick={() => rotateGroup(90)} className="bg-grim-900 border border-grim-700 rounded py-1.5 text-[10px] text-slate-300 hover:bg-grim-700">+90°</button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => rotateGroup(-15)} className="bg-grim-900 border border-grim-700 rounded py-1.5 text-[10px] text-slate-300 hover:bg-grim-700 flex items-center justify-center gap-1"><RotateCcw size={10}/> Nudge Left</button>
                            <button onClick={() => rotateGroup(15)} className="bg-grim-900 border border-grim-700 rounded py-1.5 text-[10px] text-slate-300 hover:bg-grim-700 flex items-center justify-center gap-1"><RotateCw size={10}/> Nudge Right</button>
                        </div>
                    </div>

                    <div className="bg-grim-800 p-3 rounded border border-grim-700">
                        <h3 className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-2"><Grid size={14}/> Auto-Formations</h3>
                        <div className="grid grid-cols-1 gap-2">
                            <button 
                                onClick={() => applyFormation('LINE_COHERENCY')}
                                className="bg-grim-900 hover:bg-grim-700 border border-grim-700 rounded p-2 text-left text-xs text-slate-300"
                            >
                                Max Coherency (Line/Bone)
                            </button>
                            <button 
                                onClick={() => applyFormation('BASE_TO_BASE')}
                                className="bg-grim-900 hover:bg-grim-700 border border-grim-700 rounded p-2 text-left text-xs text-slate-300"
                            >
                                Base-to-Base Cluster
                            </button>
                            <button 
                                onClick={() => applyFormation('CIRCLE')}
                                className="bg-grim-900 hover:bg-grim-700 border border-grim-700 rounded p-2 text-left text-xs text-slate-300"
                            >
                                Circle (3.5" Radius)
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
