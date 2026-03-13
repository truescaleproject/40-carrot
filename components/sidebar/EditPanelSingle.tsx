import React, { useState } from 'react';
import { Activity, Minus, Plus, Image as ImageIcon, Trash2, Lock, Unlock, Flag, ChevronUp, ChevronDown, Move, Circle, Square } from 'lucide-react';
import { BoardElement, ElementType, ModelStats, Weapon } from '../../types';
import { MM_PER_INCH } from '../../constants';
import { StatsInputs, WeaponsList, ColorPicker } from './SidebarHelpers';

interface EditPanelSingleProps {
    element: BoardElement;
    updateSelectedLabel: (label: string) => void;
    updateSelectedSide: (side: 'ATTACKER' | 'DEFENDER') => void;
    updateSelectedDimensions: (dim: 'width' | 'height', val: number) => void;
    updateSelectedRotation: (rotation: number) => void;
    pixelsPerInch: number;
    updateSelectedModelStat: (key: keyof Omit<ModelStats, 'weapons'>, val: string) => void;
    adjustWounds: (ids: string[], delta: number) => void;
    addWeapon: () => void;
    removeWeapon: (id: string) => void;
    updateWeapon: (id: string, updates: Partial<Weapon>) => void;
    addWeaponModifier: (wId: string, type: string) => void;
    removeWeaponModifier: (wId: string, mId: string) => void;
    updateWeaponModifier: (wId: string, mId: string, field: 'value' | 'keyword', val: string) => void;
    addingModifierToWeaponId: string | null;
    setAddingModifierToWeaponId: (id: string | null) => void;
    removeElementImage: () => void;
    handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>, target: 'model' | 'map') => void;
    updateColor: (color: string) => void;
    toggleLocked: () => void;
    updateSelectedShape: (shape: 'CIRCLE' | 'RECTANGLE') => void;
}

export const EditPanelSingle: React.FC<EditPanelSingleProps> = ({
    element, updateSelectedLabel, updateSelectedSide, updateSelectedDimensions, updateSelectedRotation, pixelsPerInch,
    updateSelectedModelStat, adjustWounds, addWeapon, removeWeapon, updateWeapon,
    addWeaponModifier, removeWeaponModifier, updateWeaponModifier, addingModifierToWeaponId, setAddingModifierToWeaponId,
    removeElementImage, handleImageUpload, updateColor, toggleLocked, updateSelectedShape
}) => {
    const [isStatsOpen, setIsStatsOpen] = useState(true);
    const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);

    const isModel = element.type === ElementType.MODEL;

    return (
        <div className="space-y-4 animate-in fade-in duration-200">
            {/* Identity Section - Top Priority */}
            <div className="space-y-2">
                <div className="flex justify-between items-end mb-1">
                    <span className="text-[10px] font-bold text-text-muted uppercase">Selected Unit Properties</span>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={toggleLocked}
                        className={`p-2 rounded border transition-colors ${element.locked ? 'bg-grim-700 border-grim-500 text-grim-gold' : 'bg-grim-800 border-grim-700 text-text-muted hover:text-text-primary'}`}
                        title={element.locked ? "Unlock" : "Lock"}
                    >
                        {element.locked ? <Lock size={16}/> : <Unlock size={16}/>}
                    </button>
                    <input 
                        value={element.label}
                        onChange={(e) => updateSelectedLabel(e.target.value)}
                        className="flex-1 bg-grim-800 border border-grim-600 rounded p-2 text-sm text-text-primary font-bold focus:border-grim-gold outline-none"
                        placeholder="Label"
                    />
                </div>

                {isModel && (
                    <div className="flex gap-2">
                        <button 
                            onClick={() => updateSelectedSide('ATTACKER')}
                            className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-bold rounded border ${element.side === 'ATTACKER' ? 'bg-red-900/50 border-red-500 text-white shadow-inner' : 'bg-grim-800 border-grim-700 text-text-muted hover:text-text-primary'}`}
                        >
                            <Flag size={10} className={element.side === 'ATTACKER' ? 'fill-current' : ''}/> Attacker
                        </button>
                        <button 
                            onClick={() => updateSelectedSide('DEFENDER')}
                            className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-bold rounded border ${element.side === 'DEFENDER' ? 'bg-blue-900/50 border-blue-500 text-white shadow-inner' : 'bg-grim-800 border-grim-700 text-text-muted hover:text-text-primary'}`}
                        >
                            <Flag size={10} className={element.side === 'DEFENDER' ? 'fill-current' : ''}/> Defender
                        </button>
                    </div>
                )}
            </div>

            {/* Critical Gameplay Stats (Wounds) - Immediately Visible for Models */}
            {isModel && (
                <div className="bg-grim-900 p-3 rounded-lg border border-grim-700 shadow-md">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Wound Tracker</span>
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => adjustWounds([element.id], -1)}
                                className="w-8 h-8 flex items-center justify-center bg-grim-800 hover:bg-red-900/50 text-red-400 border border-grim-700 hover:border-red-800 rounded transition-all active:scale-95"
                            >
                                <Minus size={16}/>
                            </button>
                            <div className="flex flex-col items-center w-12">
                                <span className={`text-xl font-mono font-bold leading-none ${!element.currentWounds || element.currentWounds <= 0 ? 'text-red-500' : 'text-text-primary'}`}>
                                    {element.currentWounds ?? element.stats?.w}
                                </span>
                                <span className="text-[9px] text-text-muted">
                                    of {element.stats?.w}
                                </span>
                            </div>
                            <button 
                                onClick={() => adjustWounds([element.id], 1)}
                                className="w-8 h-8 flex items-center justify-center bg-grim-800 hover:bg-green-900/50 text-green-400 border border-grim-700 hover:border-green-800 rounded transition-all active:scale-95"
                            >
                                <Plus size={16}/>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Datasheet Config - Collapsible but Open by Default for Models */}
            {isModel && element.stats && (
                <div className="border border-grim-700 rounded bg-grim-800/50 overflow-hidden">
                    <button 
                        onClick={() => setIsStatsOpen(!isStatsOpen)}
                        className="w-full flex justify-between items-center p-2 bg-grim-800 text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-grim-700 transition-colors"
                    >
                        <span className="flex items-center gap-2"><Activity size={14}/> Edit Stats & Loadout</span>
                        {isStatsOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                    </button>
                    
                    {isStatsOpen && (
                        <div className="p-3 border-t border-grim-700 animate-in slide-in-from-top-2 duration-200">
                            <StatsInputs stats={element.stats} onUpdate={updateSelectedModelStat} />
                            
                            <div className="mt-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[10px] font-bold text-text-muted uppercase">Loadout</span>
                                    <button onClick={addWeapon} className="text-[10px] bg-grim-700 px-2 py-0.5 rounded text-white hover:bg-grim-600 border border-grim-600">
                                        + Weapon
                                    </button>
                                </div>
                                <WeaponsList 
                                    weapons={element.stats.weapons}
                                    onUpdate={updateWeapon}
                                    onRemove={removeWeapon}
                                    onAddModifier={addWeaponModifier}
                                    onRemoveModifier={removeWeaponModifier}
                                    onUpdateModifier={updateWeaponModifier}
                                    addingModifierToWeaponId={addingModifierToWeaponId}
                                    setAddingModifierToWeaponId={setAddingModifierToWeaponId}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Appearance & Transform - Collapsible */}
            <div className="border border-grim-700 rounded bg-grim-800/50 overflow-hidden">
                <button 
                    onClick={() => setIsAppearanceOpen(!isAppearanceOpen)}
                    className="w-full flex justify-between items-center p-2 bg-grim-800 text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-grim-700 transition-colors"
                >
                    <span className="flex items-center gap-2"><Move size={14}/> Base, Color & Image</span>
                    {isAppearanceOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                </button>

                {(isAppearanceOpen || !isModel) && (
                    <div className="p-3 border-t border-grim-700 space-y-4 animate-in slide-in-from-top-2 duration-200">
                        {/* Shape Toggle for Models */}
                        {isModel && (
                            <div className="flex justify-between items-center bg-grim-900/50 p-2 rounded border border-grim-700/50">
                                <label className="text-[10px] uppercase font-bold text-text-muted">Base Shape</label>
                                <div className="flex gap-1 bg-grim-800 p-0.5 rounded border border-grim-600">
                                    <button 
                                        onClick={() => updateSelectedShape('CIRCLE')}
                                        className={`p-1.5 rounded transition-all ${(!element.shape || element.shape === 'CIRCLE') ? 'bg-grim-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                                        title="Circular / Oval"
                                    >
                                        <Circle size={14} />
                                    </button>
                                    <button 
                                        onClick={() => updateSelectedShape('RECTANGLE')}
                                        className={`p-1.5 rounded transition-all ${element.shape === 'RECTANGLE' ? 'bg-grim-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                                        title="Rectangular / Square"
                                    >
                                        <Square size={14} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Color */}
                        <ColorPicker activeColor={element.color} onColorSelect={updateColor} label="Base Color" />

                        {/* Dimensions */}
                        <div>
                            <label className="text-[10px] uppercase font-bold text-text-muted mb-1 flex justify-between">
                                <span>Dimensions ({isModel ? 'Base mm' : 'Inches'})</span>
                            </label>
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] text-text-muted font-bold w-4">W</span>
                                <input 
                                    type="range" 
                                    min={element.type === ElementType.TERRAIN ? 0.5 : 10} 
                                    max={element.type === ElementType.TERRAIN ? 24 : 160}
                                    step={element.type === ElementType.TERRAIN ? 0.5 : 1}
                                    value={element.type === ElementType.TERRAIN ? element.width / pixelsPerInch : (element.width / pixelsPerInch * MM_PER_INCH)} 
                                    onChange={e => {
                                        const val = Number(e.target.value);
                                        const px = element.type === ElementType.TERRAIN ? val * pixelsPerInch : (val / MM_PER_INCH * pixelsPerInch);
                                        updateSelectedDimensions('width', px);
                                    }}
                                    className="flex-1 h-1 bg-grim-600 rounded-lg appearance-none cursor-pointer"
                                />
                                <span className="text-[9px] w-8 text-right font-mono text-text-primary">
                                    {element.type === ElementType.TERRAIN ? (element.width / pixelsPerInch).toFixed(1) : Math.round(element.width / pixelsPerInch * MM_PER_INCH)}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] text-text-muted font-bold w-4">H</span>
                                <input 
                                    type="range" 
                                    min={element.type === ElementType.TERRAIN ? 0.5 : 10} 
                                    max={element.type === ElementType.TERRAIN ? 24 : 160}
                                    step={element.type === ElementType.TERRAIN ? 0.5 : 1}
                                    value={element.type === ElementType.TERRAIN ? element.height / pixelsPerInch : (element.height / pixelsPerInch * MM_PER_INCH)} 
                                    onChange={e => {
                                        const val = Number(e.target.value);
                                        const px = element.type === ElementType.TERRAIN ? val * pixelsPerInch : (val / MM_PER_INCH * pixelsPerInch);
                                        updateSelectedDimensions('height', px);
                                    }}
                                    className="flex-1 h-1 bg-grim-600 rounded-lg appearance-none cursor-pointer"
                                />
                                <span className="text-[9px] w-8 text-right font-mono text-text-primary">
                                    {element.type === ElementType.TERRAIN ? (element.height / pixelsPerInch).toFixed(1) : Math.round(element.height / pixelsPerInch * MM_PER_INCH)}
                                </span>
                            </div>
                        </div>

                        {/* Rotation */}
                        <div>
                            <label className="text-[10px] uppercase font-bold text-text-muted mb-1 flex justify-between">
                                <span>Rotation</span>
                                <span className="font-mono text-text-primary">{Math.round(element.rotation)}°</span>
                            </label>
                            <input 
                                type="range" 
                                min="0" 
                                max="360" 
                                value={element.rotation} 
                                onChange={e => updateSelectedRotation(Number(e.target.value))}
                                className="w-full h-1 bg-grim-600 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>

                        {/* Image */}
                        <div>
                            <label className="text-[10px] uppercase font-bold text-text-muted mb-1 block">Image / Texture</label>
                            <div className="flex gap-2">
                                <label className={`flex-1 bg-grim-700 hover:bg-grim-600 text-slate-300 text-[10px] py-1.5 px-2 ${element.image ? 'rounded-l' : 'rounded'} cursor-pointer flex items-center justify-center gap-1 transition-colors border border-grim-600`}>
                                    <ImageIcon size={12}/> {element.image ? 'Change' : 'Upload'}
                                    <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'model')} />
                                </label>
                                {element.image && (
                                    <button 
                                        onClick={removeElementImage}
                                        className="bg-red-900/50 hover:bg-red-800 text-red-200 px-2 rounded-r flex items-center justify-center border border-l-0 border-red-900"
                                        title="Remove Image"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};