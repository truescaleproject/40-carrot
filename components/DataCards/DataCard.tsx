import React from 'react';
import { UnitCardData, WeaponStats } from '../../types/dataCards';

interface CompactCardProps {
  column1: UnitCardData[];
  column2: UnitCardData[];
  onEditUnit: (unit: UnitCardData) => void;
  pageNumber: number;
  width: number;
  height: number;
}

// Compact Stat Cell - Vertical Stack
const StatCell: React.FC<{ label: string, value: string, className?: string }> = ({ label, value, className }) => (
  <div className={`flex flex-col items-center justify-center flex-1 border-r border-neutral-400 last:border-r-0 h-full ${className || 'bg-white'}`}>
    <span className="text-[5px] text-neutral-500 font-bold uppercase leading-none mb-[1px]">{label}</span>
    <span className="text-[8px] font-black text-black leading-none">{value}</span>
  </div>
);

const WeaponRow: React.FC<{ w: WeaponStats }> = ({ w }) => (
  <div className="flex text-[8px] border-b border-gray-200 items-center min-h-[13px] py-[0.5px] last:border-0 hover:bg-gray-50 group">
      <div className="w-[70px] truncate font-bold pl-1 shrink-0 text-black leading-tight" title={w.name}>{w.name}</div>
      <div className="w-[24px] text-center text-gray-700 tracking-tighter shrink-0 leading-tight">{w.range}</div>
      <div className="w-[16px] text-center shrink-0 leading-tight">{w.attacks}</div>
      <div className="w-[20px] text-center shrink-0 leading-tight">{w.skill}</div>
      <div className="w-[16px] text-center font-bold shrink-0 leading-tight">{w.strength}</div>
      <div className="w-[16px] text-center shrink-0 leading-tight">{w.ap}</div>
      <div className="w-[16px] text-center shrink-0 leading-tight">{w.damage}</div>
      <div className="flex-1 text-right pr-1 italic text-gray-500 text-[6px] leading-[7px] whitespace-normal break-words">{w.keywords}</div>
  </div>
);

const UnitBlock: React.FC<{ unit: UnitCardData, onEditUnit: (unit: UnitCardData) => void }> = ({ unit, onEditUnit }) => (
  <div
      className="border-b border-black cursor-pointer hover:bg-yellow-50 transition-colors group bg-white break-inside-avoid"
      onClick={() => onEditUnit(unit)}
  >
      {/* Row 1: Name Header */}
      <div className="bg-black text-white px-1 py-0.5 flex justify-between items-baseline h-[15px]">
          <span className="font-bold text-[9px] uppercase truncate font-['Chakra_Petch'] leading-none pt-[1px]">
              {unit.name}
          </span>
          <span className="text-[7px] text-gray-400 opacity-0 group-hover:opacity-100 ml-2">EDIT</span>
      </div>

      {/* Row 2: Stats Row */}
      <div className="flex items-center bg-neutral-100 h-[18px] border-b border-black">
          <StatCell label="M" value={unit.stats?.m ?? '-'} />
          <StatCell label="T" value={unit.stats?.t ?? '-'} />
          <StatCell label="Sv" value={unit.stats?.sv ?? '-'} />
          <StatCell label="Inv" value={unit.invuln || '-'} className={unit.invuln ? 'bg-yellow-100' : ''} />
          <StatCell label="W" value={unit.stats?.w ?? '-'} />
          <StatCell label="Ld" value={unit.stats?.ld ?? '-'} />
          <StatCell label="OC" value={unit.stats?.oc ?? '-'} />
      </div>

      {/* Row 3: Abilities */}
      {unit.abilities?.length > 0 && (
          <div className="px-1 py-[2px] bg-neutral-50 border-b border-neutral-200">
            <div className="text-[7px] leading-[8px] text-justify text-neutral-800">
              {unit.abilities.map((ab, i) => (
                 <span key={ab.id} className="inline">
                    <span className="font-bold text-black">{ab.name}</span>
                    {ab.description && <span className="text-neutral-600">: {ab.description}</span>}
                    {i < unit.abilities.length - 1 && <span className="mx-1 text-neutral-300">•</span>}
                 </span>
              ))}
            </div>
          </div>
      )}

      {/* Row 4: Weapons */}
      <div className="flex flex-col">
          {unit.rangedWeapons?.map(w => <WeaponRow key={w.id} w={w} />)}
          {unit.meleeWeapons?.map(w => <WeaponRow key={w.id} w={w} />)}
      </div>
  </div>
);

export const DataCard: React.FC<CompactCardProps> = ({ column1, column2, onEditUnit, pageNumber, width, height }) => {
  return (
    <div
        className="card-wrapper bg-white text-black border-2 border-black flex overflow-hidden shadow-lg print:shadow-none print:break-inside-avoid relative"
        style={{ width: `${width}in`, height: `${height}in` }}
    >
        {/* Page Number / Brand */}
        <div className="absolute bottom-[2px] right-[4px] text-[6px] text-slate-400 font-bold z-10 pointer-events-none bg-white px-1 border border-neutral-200 rounded opacity-50">
            39k.PRO • #{pageNumber}
        </div>

        {/* Column 1 */}
        <div className="w-1/2 h-full border-r border-black flex flex-col">
            <div className="flex-1 flex flex-col overflow-hidden">
                {column1.map(u => <UnitBlock key={u.id} unit={u} onEditUnit={onEditUnit} />)}
            </div>
        </div>

        {/* Column 2 */}
        <div className="w-1/2 h-full flex flex-col">
            <div className="flex-1 flex flex-col overflow-hidden">
                {column2.map(u => <UnitBlock key={u.id} unit={u} onEditUnit={onEditUnit} />)}
            </div>
        </div>
    </div>
  );
};
