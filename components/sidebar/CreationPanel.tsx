import React, { useState } from 'react';
import { Flag, Link, Unlink, Activity, ChevronUp, ChevronDown, Plus } from 'lucide-react';
import { ElementType, ModelStats, Weapon } from '../../types';
import { COLORS } from '../../constants';
import { StatsInputs, WeaponsList, ColorPicker } from './SidebarHelpers';

interface CreationPanelProps {
    creationType: ElementType;
    newElementLabel: string;
    setNewElementLabel: (label: string) => void;
    creationSide: 'ATTACKER' | 'DEFENDER';
    setCreationSide: (side: 'ATTACKER' | 'DEFENDER') => void;
    deployCount: number | '';
    setDeployCount: (count: number | '') => void;
    newElementWidth: number;
    setNewElementWidth: (width: number) => void;
    newElementHeight: number;
    setNewElementHeight: (height: number) => void;
    pixelsPerInch: number;
    activeColor: string;
    setActiveColor: (color: string) => void;
    isDeployStatsOpen: boolean;
    setIsDeployStatsOpen: (isOpen: boolean) => void;
    newElementStats: ModelStats;
    updateNewElementStat: (key: keyof Omit<ModelStats, 'weapons'>, val: string) => void;
    newElementWeapons: Weapon[];
    updateNewElementWeapon: (id: string, updates: Partial<Weapon>) => void;
    addNewElementWeapon: () => void;
    removeNewElementWeapon: (id: string) => void;
    addingModifierToWeaponId: string | null;
    setAddingModifierToWeaponId: (id: string | null) => void;
    addNewElementWeaponModifier: (weaponId: string, type: string) => void;
    removeNewElementWeaponModifier: (weaponId: string, modId: string) => void;
    updateNewElementWeaponModifier: (wId: string, mId: string, field: 'value' | 'keyword', val: string) => void;
    addElement: (type: ElementType, source?: 'SIDEBAR' | 'QUICK_MENU') => void;
}

export const CreationPanel: React.FC<CreationPanelProps> = ({
    creationType, newElementLabel, setNewElementLabel, creationSide, setCreationSide,
    deployCount, setDeployCount, newElementWidth, setNewElementWidth, newElementHeight, setNewElementHeight,
    pixelsPerInch, activeColor, setActiveColor, isDeployStatsOpen, setIsDeployStatsOpen,
    newElementStats, updateNewElementStat, newElementWeapons, updateNewElementWeapon,
    addNewElementWeapon, removeNewElementWeapon, addingModifierToWeaponId, setAddingModifierToWeaponId,
    addNewElementWeaponModifier, removeNewElementWeaponModifier, updateNewElementWeaponModifier,
    addElement
}) => {
    const [isBaseSizeLinked, setIsBaseSizeLinked] = useState(true);

    return (
        <div className="space-y-4">
            
            {/* Identity Group */}
            <div className="space-y-3 p-3 bg-grim-800/30 rounded border border-grim-700/50">
                <h4 className="text-[10px] uppercase font-bold text-grim-gold mb-1">1. Identity</h4>
                <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                        <label className="text-[9px] text-text-muted mb-0.5 block">Name / Label</label>
                        <input 
                            type="text" 
                            value={newElementLabel}
                            onChange={(e) => setNewElementLabel(e.target.value)}
                            onFocus={(e) => e.target.select()}
                            placeholder={creationType === ElementType.MODEL ? "e.g. Trooper" : "e.g. Ruin"}
                            className="w-full bg-grim-900 border border-grim-600 rounded p-1.5 text-xs text-text-primary focus:border-grim-gold outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-[9px] text-text-muted mb-0.5 block">Count</label>
                        <input 
                            type="number" 
                            min="1" 
                            max="20" 
                            value={deployCount}
                            onChange={(e) => setDeployCount(e.target.value === '' ? '' : parseInt(e.target.value))}
                            onFocus={(e) => e.target.select()}
                            className="w-full bg-grim-900 border border-grim-600 rounded p-1.5 text-xs text-center text-text-primary focus:border-grim-gold outline-none"
                        />
                    </div>
                </div>

                {creationType === ElementType.MODEL && (
                    <div>
                        <div className="flex gap-2 mt-2">
                            <button 
                                onClick={() => setCreationSide('ATTACKER')}
                                className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded text-[10px] font-bold transition-all border ${creationSide === 'ATTACKER' ? 'bg-red-900/50 border-red-500 text-white shadow-sm' : 'bg-grim-900 border-grim-700 text-text-muted hover:text-text-primary'}`}
                            >
                                <Flag size={12} className={creationSide === 'ATTACKER' ? 'fill-current' : ''}/> Attacker
                            </button>
                            <button 
                                onClick={() => setCreationSide('DEFENDER')}
                                className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded text-[10px] font-bold transition-all border ${creationSide === 'DEFENDER' ? 'bg-blue-900/50 border-blue-500 text-white shadow-sm' : 'bg-grim-900 border-grim-700 text-text-muted hover:text-text-primary'}`}
                            >
                                <Flag size={12} className={creationSide === 'DEFENDER' ? 'fill-current' : ''}/> Defender
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Physical Properties */}
            <div className="space-y-3">
                <h4 className="text-[10px] uppercase font-bold text-grim-gold mb-1 border-t border-grim-800 pt-2">2. Size & Color</h4>
                {/* Dimensions */}
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-[9px] text-text-muted block">
                            {creationType === ElementType.MODEL ? 'Base Diameter (mm)' : 'Dimensions (Inches)'}
                        </label>
                        <button 
                            onClick={() => {
                                const newLinked = !isBaseSizeLinked;
                                setIsBaseSizeLinked(newLinked);
                                if (newLinked) setNewElementHeight(newElementWidth);
                            }}
                            className={`p-0.5 rounded transition-all ${isBaseSizeLinked ? 'text-grim-gold' : 'text-text-muted hover:text-text-primary'}`}
                            title={isBaseSizeLinked ? "Unlink Dimensions" : "Link Dimensions"}
                        >
                            {isBaseSizeLinked ? <Link size={10} /> : <Unlink size={10} />}
                        </button>
                    </div>
                    <div className="bg-grim-900/50 p-2 rounded border border-grim-700/50">
                        <div className="grid gap-2">
                            {/* Width */}
                            <div className="flex items-center gap-1">
                                <span className="text-[9px] text-text-muted w-4 font-bold shrink-0">W</span>
                                <input 
                                    type="range" 
                                    min={creationType === ElementType.TERRAIN ? 0.5 : 10} 
                                    max={creationType === ElementType.TERRAIN ? 24 : 200}
                                    step={creationType === ElementType.TERRAIN ? 0.5 : 1}
                                    value={creationType === ElementType.TERRAIN ? newElementWidth / pixelsPerInch : (newElementWidth / pixelsPerInch * 25.4)} 
                                    onChange={e => {
                                        const val = Number(e.target.value);
                                        const px = creationType === ElementType.TERRAIN ? val * pixelsPerInch : (val / 25.4 * pixelsPerInch);
                                        setNewElementWidth(px);
                                        if (isBaseSizeLinked) setNewElementHeight(px);
                                    }}
                                    className="flex-1 h-1 bg-grim-600 rounded-lg appearance-none cursor-pointer min-w-0"
                                />
                                <div className="w-10 text-right">
                                    <span className="text-[10px] font-mono text-text-primary">
                                        {creationType === ElementType.TERRAIN ? (newElementWidth / pixelsPerInch).toFixed(1) : Math.round(newElementWidth / pixelsPerInch * 25.4)}
                                    </span>
                                </div>
                            </div>
                            
                            {/* Height */}
                            <div className="flex items-center gap-1">
                                <span className="text-[9px] text-text-muted w-4 font-bold shrink-0">H</span>
                                <input 
                                    type="range" 
                                    min={creationType === ElementType.TERRAIN ? 0.5 : 10} 
                                    max={creationType === ElementType.TERRAIN ? 24 : 200}
                                    step={creationType === ElementType.TERRAIN ? 0.5 : 1}
                                    value={creationType === ElementType.TERRAIN ? newElementHeight / pixelsPerInch : (newElementHeight / pixelsPerInch * 25.4)} 
                                    onChange={e => {
                                        const val = Number(e.target.value);
                                        const px = creationType === ElementType.TERRAIN ? val * pixelsPerInch : (val / 25.4 * pixelsPerInch);
                                        setNewElementHeight(px);
                                        if (isBaseSizeLinked) setNewElementWidth(px);
                                    }}
                                    className="flex-1 h-1 bg-grim-600 rounded-lg appearance-none cursor-pointer min-w-0"
                                />
                                <div className="w-10 text-right">
                                    <span className="text-[10px] font-mono text-text-primary">
                                        {creationType === ElementType.TERRAIN ? (newElementHeight / pixelsPerInch).toFixed(1) : Math.round(newElementHeight / pixelsPerInch * 25.4)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <ColorPicker activeColor={activeColor} onColorSelect={setActiveColor} />
            </div>

            {/* Stats (Models Only) */}
            {creationType === ElementType.MODEL && (
                <>
                    <h4 className="text-[10px] uppercase font-bold text-grim-gold mb-1 border-t border-grim-800 pt-2">3. Stats (Optional)</h4>
                    <div className="border border-grim-700 rounded bg-grim-800/50 overflow-hidden">
                        <button 
                            onClick={() => setIsDeployStatsOpen(!isDeployStatsOpen)}
                            className="w-full flex justify-between items-center p-2 bg-grim-800 text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-grim-700 transition-colors"
                        >
                            <span className="flex items-center gap-2"><Activity size={14}/> Edit Datasheet</span>
                            {isDeployStatsOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                        </button>
                        
                        {isDeployStatsOpen && (
                            <div className="p-3 border-t border-grim-700">
                                <StatsInputs stats={newElementStats} onUpdate={updateNewElementStat} />
                                
                                <div className="mt-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-bold text-text-muted uppercase">Weapons</span>
                                        <button onClick={addNewElementWeapon} className="text-[10px] bg-grim-700 px-2 py-0.5 rounded text-white hover:bg-grim-600 border border-grim-600">
                                            + Add
                                        </button>
                                    </div>
                                    <WeaponsList 
                                        weapons={newElementWeapons}
                                        onUpdate={updateNewElementWeapon}
                                        onRemove={removeNewElementWeapon}
                                        onAddModifier={addNewElementWeaponModifier}
                                        onRemoveModifier={removeNewElementWeaponModifier}
                                        onUpdateModifier={updateNewElementWeaponModifier}
                                        addingModifierToWeaponId={addingModifierToWeaponId}
                                        setAddingModifierToWeaponId={setAddingModifierToWeaponId}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Create Button */}
            <button 
                onClick={() => addElement(creationType, 'SIDEBAR')}
                className="w-full bg-grim-gold text-grim-900 font-bold py-3 rounded hover:bg-yellow-400 shadow-lg flex items-center justify-center gap-2 mt-4"
            >
                <Plus size={18} />
                DEPLOY TO BATTLEFIELD
            </button>
        </div>
    );
};