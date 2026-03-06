
import React from 'react';
import { ModelStats } from '../types';
import { Sword, Crosshair } from 'lucide-react';
import { WEAPON_MODIFIER_DEFINITIONS } from '../constants';

interface UnitCardProps {
  stats: ModelStats;
  name: string;
  className?: string;
  showPointer?: boolean;
}

export const UnitCard: React.FC<UnitCardProps> = ({ stats, name, className = '', showPointer = true }) => {
  return (
    <div className={`bg-grim-800 border border-grim-700 shadow-2xl rounded-lg p-2 w-60 pointer-events-none select-none ${className}`}>
      {/* Header */}
      <div className="font-bold text-grim-gold mb-1.5 text-xs uppercase tracking-wider border-b border-grim-700 pb-1 truncate leading-none">
        {name}
      </div>
      
      {/* Model Stats - Single Row Compact */}
      <div className="flex justify-between items-center bg-grim-900/60 rounded p-1 mb-1.5 gap-px">
        <StatBox label="M" value={stats.m} />
        <StatBox label="T" value={stats.t} />
        <StatBox label="SV" value={stats.sv} />
        <StatBox label="W" value={stats.w} />
        <StatBox label="LD" value={stats.ld} />
        <StatBox label="OC" value={stats.oc} />
      </div>

      {/* Weapons */}
      <div className="space-y-1">
        {stats.weapons.map((weapon, idx) => (
            <div key={weapon.id || idx} className="bg-grim-900/30 rounded border border-grim-700/30 p-1">
                {/* Name Row */}
                <div className="flex items-center gap-1.5 mb-0.5">
                    {weapon.type === 'MELEE' ? <Sword size={10} className="text-red-400 shrink-0"/> : <Crosshair size={10} className="text-blue-400 shrink-0"/>}
                    <div className="text-[10px] font-bold text-slate-200 truncate leading-none flex-1">{weapon.name}</div>
                </div>
                
                {/* Stats Row */}
                <div className="grid grid-cols-6 gap-px text-[9px] text-center bg-black/20 rounded py-0.5 mb-0.5">
                    <WeaponStat label="R" value={weapon.range} />
                    <WeaponStat label="A" value={weapon.a} />
                    <WeaponStat label="BS" value={weapon.skill} highlight />
                    <WeaponStat label="S" value={weapon.s} />
                    <WeaponStat label="AP" value={weapon.ap} />
                    <WeaponStat label="D" value={weapon.d} />
                </div>

                {/* Modifiers */}
                {weapon.modifiers && weapon.modifiers.length > 0 && (
                    <div className="text-[8px] text-slate-400 leading-none truncate px-0.5">
                        {weapon.modifiers.map((m) => {
                             const def = WEAPON_MODIFIER_DEFINITIONS[m.type];
                             let label = def ? def.name : m.type;
                             if(m.type === 'ANTI' && m.keyword) label = `Anti-${m.keyword}`;
                             if(m.value) label += ` ${m.value}`;
                             return label;
                        }).join(', ')}
                    </div>
                )}
            </div>
        ))}
        {stats.weapons.length === 0 && (
            <div className="text-center text-[9px] text-slate-600 italic">No weapons</div>
        )}
      </div>

      {showPointer && (
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-grim-800 rotate-45 border-b border-r border-grim-700"></div>
      )}
    </div>
  );
};

const StatBox = ({ label, value }: { label: string, value: string }) => (
    <div className="flex flex-col items-center w-full border-r border-grim-700/50 last:border-0">
        <span className="text-[8px] text-slate-500 font-bold leading-none mb-0.5">{label}</span>
        <span className="text-white font-bold text-xs leading-none">{value}</span>
    </div>
);

const WeaponStat = ({ label, value, highlight }: { label: string, value: string, highlight?: boolean }) => (
    <div className="flex flex-col items-center">
        <span className="text-[7px] text-slate-500 font-bold leading-none scale-90 mb-px">{label}</span>
        <span className={`text-[9px] font-mono font-bold leading-none ${highlight ? 'text-grim-gold' : 'text-slate-200'}`}>{value}</span>
    </div>
);
