
import React, { useState } from 'react';
import { Sword, Crosshair, Trash2, X, Plus, Palette, ChevronUp, ChevronDown } from 'lucide-react';
import { ModelStats, Weapon } from '../../types';
import { WEAPON_MODIFIER_DEFINITIONS, COLORS } from '../../constants';

interface StatsInputsProps {
    stats: ModelStats;
    onUpdate: (key: keyof Omit<ModelStats, 'weapons'>, value: string) => void;
}

export const StatsInputs: React.FC<StatsInputsProps> = ({ stats, onUpdate }) => (
    <div className="grid grid-cols-6 gap-1 mb-2">
        {[
            { label: 'M', key: 'm' }, { label: 'T', key: 't' }, { label: 'SV', key: 'sv' }, 
            { label: 'W', key: 'w' }, { label: 'LD', key: 'ld' }, { label: 'OC', key: 'oc' }
        ].map(statConfig => (
            <div key={statConfig.key} className="flex flex-col items-center bg-grim-900 border border-grim-700 rounded p-1">
                <label className="text-[9px] text-text-muted font-bold">{statConfig.label}</label>
                <input 
                    type="text" 
                    value={stats[statConfig.key as keyof Omit<ModelStats, 'weapons'>] as string}
                    onChange={(event) => onUpdate(statConfig.key as keyof Omit<ModelStats, 'weapons'>, event.target.value)}
                    onFocus={(event) => event.target.select()}
                    className="w-full bg-transparent text-center text-xs font-mono text-text-primary focus:outline-none"
                />
            </div>
        ))}
    </div>
);

interface WeaponsListProps {
    weapons: Weapon[];
    onUpdate: (id: string, updates: Partial<Weapon>) => void;
    onRemove: (id: string) => void;
    onAddModifier: (wId: string, type: string) => void;
    onRemoveModifier: (wId: string, mId: string) => void;
    onUpdateModifier: (wId: string, mId: string, f: 'value' | 'keyword', v: string) => void;
    addingModifierToWeaponId: string | null;
    setAddingModifierToWeaponId: (id: string | null) => void;
}

export const WeaponsList: React.FC<WeaponsListProps> = ({
    weapons, onUpdate, onRemove, onAddModifier, onRemoveModifier, onUpdateModifier,
    addingModifierToWeaponId, setAddingModifierToWeaponId
}) => (
    <div className="space-y-2 mt-2">
        {weapons.map((weapon) => (
            <div key={weapon.id} className="bg-grim-900/50 p-2 rounded border border-grim-700">
                <div className="flex justify-between items-center mb-1">
                    <input 
                        value={weapon.name}
                        onChange={(event) => onUpdate(weapon.id, { name: event.target.value })}
                        onFocus={(event) => event.target.select()}
                        className="bg-transparent text-xs font-bold text-text-primary w-24 focus:outline-none"
                    />
                    <div className="flex gap-1">
                        <button 
                            onClick={() => onUpdate(weapon.id, { type: weapon.type === 'MELEE' ? 'RANGED' : 'MELEE' })}
                            className="text-text-muted hover:text-text-primary"
                            title="Toggle Type"
                        >
                            {weapon.type === 'MELEE' ? <Sword size={12} className="text-red-400"/> : <Crosshair size={12} className="text-blue-400"/>}
                        </button>
                        <button onClick={() => onRemove(weapon.id)} className="text-red-500 hover:text-red-400">
                            <Trash2 size={12}/>
                        </button>
                    </div>
                </div>
                {/* Weapon Stats Grid */}
                <div className="grid grid-cols-6 gap-0.5 text-[9px] text-center mb-2">
                    <div><div className="text-text-muted">RNG</div><input value={weapon.range} onChange={event => onUpdate(weapon.id, { range: event.target.value })} onFocus={event => event.target.select()} className="w-full bg-grim-800 text-center rounded text-text-primary"/></div>
                    <div><div className="text-text-muted">A</div><input value={weapon.a} onChange={event => onUpdate(weapon.id, { a: event.target.value })} onFocus={event => event.target.select()} className="w-full bg-grim-800 text-center rounded text-text-primary"/></div>
                    <div><div className="text-text-muted">BS/WS</div><input value={weapon.skill} onChange={event => onUpdate(weapon.id, { skill: event.target.value })} onFocus={event => event.target.select()} className="w-full bg-grim-800 text-center rounded text-text-primary"/></div>
                    <div><div className="text-text-muted">S</div><input value={weapon.s} onChange={event => onUpdate(weapon.id, { s: event.target.value })} onFocus={event => event.target.select()} className="w-full bg-grim-800 text-center rounded text-text-primary"/></div>
                    <div><div className="text-text-muted">AP</div><input value={weapon.ap} onChange={event => onUpdate(weapon.id, { ap: event.target.value })} onFocus={event => event.target.select()} className="w-full bg-grim-800 text-center rounded text-text-primary"/></div>
                    <div><div className="text-text-muted">D</div><input value={weapon.d} onChange={event => onUpdate(weapon.id, { d: event.target.value })} onFocus={event => event.target.select()} className="w-full bg-grim-800 text-center rounded text-text-primary"/></div>
                </div>
                
                {/* Modifiers */}
                <div className="flex flex-wrap gap-1 mb-1">
                    {weapon.modifiers?.map(modifier => (
                        <div 
                            key={modifier.id} 
                            className="flex items-center gap-1 bg-grim-800 px-1.5 py-0.5 rounded text-[9px] border border-grim-700 cursor-help"
                            title={WEAPON_MODIFIER_DEFINITIONS[modifier.type]?.description}
                        >
                            <span className="text-grim-gold">{WEAPON_MODIFIER_DEFINITIONS[modifier.type]?.name || modifier.type}</span>
                            {WEAPON_MODIFIER_DEFINITIONS[modifier.type]?.hasValue && (
                                <input 
                                    value={modifier.value || ''}
                                    placeholder="x"
                                    onChange={event => onUpdateModifier(weapon.id, modifier.id, 'value', event.target.value)}
                                    onFocus={event => event.target.select()}
                                    className="w-4 bg-transparent border-b border-grim-600 text-center focus:outline-none text-text-primary"
                                />
                            )}
                            {WEAPON_MODIFIER_DEFINITIONS[modifier.type]?.hasKeyword && (
                                <input 
                                    value={modifier.keyword || ''}
                                    placeholder="Key"
                                    onChange={event => onUpdateModifier(weapon.id, modifier.id, 'keyword', event.target.value)}
                                    onFocus={event => event.target.select()}
                                    className="w-8 bg-transparent border-b border-grim-600 text-center focus:outline-none text-text-primary"
                                />
                            )}
                            <button onClick={() => onRemoveModifier(weapon.id, modifier.id)} className="text-text-muted hover:text-red-400"><X size={8}/></button>
                        </div>
                    ))}
                    
                    <div className="relative">
                        <button 
                            onClick={() => setAddingModifierToWeaponId(addingModifierToWeaponId === weapon.id ? null : weapon.id)}
                            className="text-[9px] bg-grim-800 hover:bg-grim-700 px-1.5 py-0.5 rounded border border-grim-600 text-text-muted flex items-center gap-1"
                        >
                            <Plus size={8}/> Add
                        </button>
                        {addingModifierToWeaponId === weapon.id && (
                            <div className="absolute top-full left-0 mt-1 w-48 bg-grim-800 border border-grim-600 shadow-xl rounded z-50 max-h-48 overflow-y-auto">
                                {Object.entries(WEAPON_MODIFIER_DEFINITIONS).map(([key, def]) => (
                                    <button
                                        key={key}
                                        onClick={() => onAddModifier(weapon.id, key)}
                                        className="block w-full text-left px-2 py-1 text-[10px] hover:bg-grim-700 text-text-secondary border-b border-grim-700/50 last:border-0"
                                        title={def.description}
                                    >
                                        <span className="font-bold text-grim-gold">{def.name}</span>
                                        <span className="block text-[8px] text-text-muted truncate">{def.description}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        ))}
    </div>
);

interface ColorPickerProps {
    activeColor: string;
    onColorSelect: (color: string) => void;
    label?: string;
    className?: string;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ activeColor, onColorSelect, label = "Color Code", className = "" }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className={`border border-grim-700 rounded bg-grim-800/50 overflow-hidden ${className}`}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-2 bg-grim-800 text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-grim-700 transition-colors"
            >
                <span className="flex items-center gap-2">
                    <Palette size={14}/> {label}
                </span>
                <div className="flex items-center gap-2">
                    <div 
                        className="w-4 h-4 rounded-full border border-white/50 shadow-sm"
                        style={{ backgroundColor: activeColor }}
                    />
                    {isOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                </div>
            </button>
            
            {isOpen && (
                <div className="p-2 border-t border-grim-700 flex flex-wrap gap-2 animate-in slide-in-from-top-2 duration-200">
                    {COLORS.map(c => (
                        <button 
                            key={c}
                            onClick={() => onColorSelect(c)}
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
                                onChange={(event) => onColorSelect(event.target.value)}
                                className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] cursor-pointer p-0 m-0 border-0 opacity-0"
                            />
                            <div className="w-full h-full flex items-center justify-center">
                                <Plus size={10} className="text-text-muted"/>
                            </div>
                         </div>
                    </div>
                </div>
            )}
        </div>
    );
};
