
import React, { useState, useMemo, useEffect } from 'react';
import { ChevronDown, ChevronRight, Sword, Crosshair, Users, MousePointer2, Eye, Heart } from 'lucide-react';
import { BoardElement, ModelStats, ViewportInfo, ElementType } from '../types';
import { WEAPON_MODIFIER_DEFINITIONS, BOARD_OFFSET } from '../constants';
import { isPointInRotatedRect } from '../utils/boardUtils';

interface TooltipData {
    groups: {
        count: number;
        label: string;
        stats: ModelStats;
        modelIds: string[];
        groupIds: string[];
    }[];
    totalCount: number;
    squadName: string;
}

interface SelectedUnitsTooltipProps {
  selectionData?: TooltipData | null;
  hoverData?: TooltipData | null;

  // Legacy/Compatibility props
  groups?: any[];
  totalCount?: number;
  squadName?: string;

  sidebarOpen: boolean;
  onSelectIds: (ids: string[]) => void;
  onSelectUnit: (groupIds: string[]) => void;
  onCenterView: (ids: string[]) => void;
  onAdjustWounds: (ids: string[], delta: number) => void;
  elements: BoardElement[];
  selectedIds: string[];
  getViewport: () => ViewportInfo | null;
  onPassThroughWheel?: (e: WheelEvent) => void;
}

export const SelectedUnitsTooltip: React.FC<SelectedUnitsTooltipProps> = (props) => {
  const effectiveSelectionData = props.selectionData || (props.groups && props.groups.length > 0 ? {
      groups: props.groups,
      totalCount: props.totalCount || 0,
      squadName: props.squadName || ''
  } : null);

  return (
    <>
        {effectiveSelectionData && (
            <TooltipPanel data={effectiveSelectionData} mode="FIXED" {...props} />
        )}
        {props.hoverData && (
            <TooltipPanel data={props.hoverData} mode="FLOATING" {...props} />
        )}
    </>
  );
};

interface TooltipPanelProps extends SelectedUnitsTooltipProps {
    data: TooltipData;
    mode: 'FIXED' | 'FLOATING';
}

const TooltipPanel: React.FC<TooltipPanelProps> = ({
  data,
  mode,
  sidebarOpen,
  onSelectIds,
  onSelectUnit,
  onCenterView,
  onAdjustWounds,
  elements,
  selectedIds,
  getViewport,
  onPassThroughWheel
}) => {
  const [expandedProfiles, setExpandedProfiles] = useState<Record<number, boolean>>({});
  const [isOverUnit, setIsOverUnit] = useState(false);

  const toggleWeapons = (idx: number) => {
    setExpandedProfiles(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const renderKeywords = (modifiers?: any[]) => {
    if (!modifiers || modifiers.length === 0) return null;
    return modifiers.map(m => {
        const def = WEAPON_MODIFIER_DEFINITIONS[m.type];
        let text = def ? def.name : m.type;
        if (m.type === 'ANTI' && m.keyword) text = `Anti-${m.keyword}`;
        if (m.value) text += ` ${m.value}`;
        return text;
    }).join(', ');
  };

  const checkUnderlyingUnit = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, [role="button"], .interactive')) {
        return null;
    }
    const viewport = getViewport();
    if (!viewport) return null;
    const { pan, scale } = viewport;
    const boardX = ((e.clientX - pan.x) / scale) + BOARD_OFFSET;
    const boardY = ((e.clientY - pan.y) / scale) + BOARD_OFFSET;
    const hit = [...elements].reverse().find(el =>
        el.type === ElementType.MODEL &&
        !el.locked &&
        isPointInRotatedRect({ x: boardX, y: boardY }, el)
    );
    return hit || null;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      const hit = checkUnderlyingUnit(e);
      setIsOverUnit(!!hit);
  };

  const handleClick = (e: React.MouseEvent) => {
      const hit = checkUnderlyingUnit(e);
      if (hit) {
          e.stopPropagation();
          let newIds = [hit.id];
          if (e.shiftKey || e.ctrlKey || e.metaKey) {
              if (selectedIds.includes(hit.id)) {
                  newIds = selectedIds.filter(id => id !== hit.id);
              } else {
                  newIds = [...selectedIds, hit.id];
              }
          }
          onSelectIds(newIds);
      }
  };

  const handleWheel = (e: React.WheelEvent) => {
      const target = e.target as HTMLElement;
      const scrollContainer = target.closest('.overflow-y-auto');
      if (scrollContainer) {
          const el = scrollContainer as HTMLElement;
          const hasOverflow = el.scrollHeight > el.clientHeight;
          if (hasOverflow) {
              const atTop = el.scrollTop <= 0;
              const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
              const scrollingUp = e.deltaY < 0;
              const scrollingDown = e.deltaY > 0;
              if ((scrollingUp && !atTop) || (scrollingDown && !atBottom)) {
                  e.stopPropagation();
                  return;
              }
          }
      }
      if (onPassThroughWheel) {
          onPassThroughWheel(e.nativeEvent);
      }
  };

  const isFloating = mode === 'FLOATING';

  // Cursor tracking for floating tooltip
  const [cursorScreenPos, setCursorScreenPos] = useState<{x: number, y: number} | null>(null);
  useEffect(() => {
      if (!isFloating) return;
      const handler = (e: MouseEvent) => setCursorScreenPos({ x: e.clientX, y: e.clientY });
      window.addEventListener('mousemove', handler);
      return () => window.removeEventListener('mousemove', handler);
  }, [isFloating]);

  // Anchor position for floating mode (fallback)
  const anchorPos = useMemo(() => {
      if (!isFloating) return null;
      if (data.groups.length === 0) return null;
      const ids = data.groups.flatMap(g => g.modelIds);
      if (ids.length === 0) return null;
      const viewport = getViewport();
      if (!viewport) return null;
      const { pan, scale } = viewport;
      const targets = elements.filter(e => ids.includes(e.id));
      if (targets.length === 0) return null;
      let minX = Infinity, maxX = -Infinity, minY = Infinity;
      targets.forEach(el => {
          minX = Math.min(minX, el.x);
          maxX = Math.max(maxX, el.x + el.width);
          minY = Math.min(minY, el.y);
      });
      const worldCenterX = (minX + maxX) / 2;
      const worldTopY = minY;
      return { x: pan.x + (worldCenterX * scale), y: pan.y + (worldTopY * scale) };
  }, [isFloating, data, elements, getViewport]);

  if (isFloating && !cursorScreenPos) return null;

  const isSingleModelSelection = data.groups.length === 1 && data.totalCount === 1;

  // ==========================================
  // FLOATING MODE — compact hover bubble
  // ==========================================
  if (isFloating) {
    return (
      <div
        className="fixed z-[65] pointer-events-none w-auto max-w-xs bg-grim-900/95 backdrop-blur-md border border-grim-700 rounded-lg shadow-2xl overflow-hidden"
        style={{
            left: (cursorScreenPos?.x ?? anchorPos?.x ?? 0) + 16,
            top: (cursorScreenPos?.y ?? anchorPos?.y ?? 0) - 15,
            transform: 'translateY(-100%)',
        }}
      >
        <div className="absolute top-[calc(100%-12px)] right-full -mr-px w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[6px] border-r-grim-700" />

        <div className="p-2 bg-grim-800/80 border-b border-grim-700 flex items-center gap-3">
          <div className="font-bold px-2 py-0.5 rounded text-xs bg-grim-800 text-slate-300 border border-grim-700">
            {data.totalCount} {data.totalCount === 1 ? 'MODEL' : 'MODELS'}
          </div>
          <div className="h-4 w-px bg-grim-600" />
          <span className="text-sm font-bold text-white uppercase tracking-wider truncate">{data.squadName}</span>
        </div>

        <div className="p-1 space-y-2">
          {data.groups.map((group, idx) => (
            <div key={idx} className="bg-grim-800/40 rounded border border-grim-700/50 overflow-hidden">
              <div className="p-2 flex flex-col gap-2">
                {!isSingleModelSelection && (
                  <div className="flex items-center gap-2">
                    <span className="text-grim-gold font-mono font-bold text-xs">{group.count}x</span>
                    <span className="text-sm font-bold text-slate-200">{group.label}</span>
                  </div>
                )}
                <div className="flex-1 flex bg-grim-900/50 rounded p-1 gap-px border border-grim-700/30">
                  <StatBox label="M" value={group.stats.m} />
                  <StatBox label="T" value={group.stats.t} />
                  <StatBox label="SV" value={group.stats.sv} />
                  <StatBox label="W" value={group.stats.w} />
                  <StatBox label="LD" value={group.stats.ld} />
                  <StatBox label="OC" value={group.stats.oc} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==========================================
  // FIXED MODE — right-side panel (dataslate)
  // ==========================================
  const allModelIds = data.groups.flatMap(g => g.modelIds);
  const allGroupIds = [...new Set(data.groups.flatMap(g => g.groupIds))];

  return (
    <div
      className="fixed right-0 top-0 bottom-[3.5rem] w-72 z-[55] bg-grim-900/95 backdrop-blur-md border-l border-grim-gold/20 shadow-2xl animate-in slide-in-from-right-4 fade-in duration-200 flex flex-col overflow-hidden"
      onWheel={handleWheel}
    >
      {/* Header — squad name + model count */}
      <div className="px-4 py-3 bg-grim-800/50 border-b border-grim-700/40 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-bold text-grim-gold uppercase tracking-wider truncate">{data.squadName}</span>
          <span className="text-[10px] text-slate-400 font-mono bg-grim-800 px-2 py-0.5 rounded border border-grim-700/30 shrink-0">
            {data.totalCount} {data.totalCount === 1 ? 'model' : 'models'}
          </span>
        </div>
      </div>

      {/* Scrollable content: stats, weapons per profile */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-grim-700 scrollbar-track-transparent interactive">
        {data.groups.map((group, idx) => {
          const weaponsVisible = expandedProfiles[idx] ?? true;
          const weaponCount = group.stats.weapons.length;
          const rangedCount = group.stats.weapons.filter(w => w.type === 'RANGED').length;
          const meleeCount = group.stats.weapons.filter(w => w.type === 'MELEE').length;

          return (
            <div key={idx} className={idx > 0 ? 'border-t border-grim-700/30' : ''}>
              {/* Profile label (only if multiple profiles) */}
              {data.groups.length > 1 && (
                <div className="px-4 py-1.5 bg-grim-800/30 border-b border-grim-700/20 flex items-center gap-2">
                  <span className="text-grim-gold font-mono font-bold text-xs">{group.count}×</span>
                  <span className="text-xs font-bold text-slate-200">{group.label}</span>
                </div>
              )}

              {/* Stats — 3×2 grid */}
              <div className="px-4 py-3">
                <div className="grid grid-cols-3 gap-1.5">
                  <StatCell label="M" value={group.stats.m} />
                  <StatCell label="T" value={group.stats.t} />
                  <StatCell label="SV" value={group.stats.sv} />
                  <StatCell label="W" value={group.stats.w} />
                  <StatCell label="LD" value={group.stats.ld} />
                  <StatCell label="OC" value={group.stats.oc} />
                </div>
              </div>

              {/* Weapons section */}
              <div className="border-t border-grim-700/30">
                {weaponCount > 0 ? (
                  <>
                    {/* Toggle header */}
                    <button
                      className="w-full px-4 py-1.5 flex items-center gap-2 text-left hover:bg-grim-800/40 transition-colors"
                      onClick={() => toggleWeapons(idx)}
                    >
                      {weaponsVisible
                        ? <ChevronDown size={11} className="text-slate-500 shrink-0" />
                        : <ChevronRight size={11} className="text-slate-500 shrink-0" />
                      }
                      <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Weapons</span>
                      <div className="flex items-center gap-1.5 ml-auto text-[10px]">
                        {rangedCount > 0 && (
                          <span className="flex items-center gap-0.5 text-blue-400/70">
                            <Crosshair size={9} />{rangedCount}
                          </span>
                        )}
                        {meleeCount > 0 && (
                          <span className="flex items-center gap-0.5 text-red-400/70">
                            <Sword size={9} />{meleeCount}
                          </span>
                        )}
                      </div>
                    </button>

                    {/* Weapon cards */}
                    {weaponsVisible && (
                      <div className="px-3 pb-3 space-y-1.5">
                        {group.stats.weapons.map((w, wIdx) => (
                          <div key={wIdx} className="bg-grim-800/40 rounded-lg p-2 border border-grim-700/20">
                            {/* Weapon name */}
                            <div className="flex items-center gap-1.5 mb-1.5">
                              {w.type === 'MELEE'
                                ? <Sword size={10} className="text-red-400 shrink-0" />
                                : <Crosshair size={10} className="text-blue-400 shrink-0" />
                              }
                              <span className="text-[11px] font-bold text-slate-200 truncate" title={w.name}>{w.name}</span>
                            </div>
                            {/* Weapon stats — 6-col grid */}
                            <div className="grid grid-cols-6 gap-0.5 text-center">
                              <WeaponStat label="RNG" value={w.range} />
                              <WeaponStat label="A" value={w.a} />
                              <WeaponStat label="HIT" value={w.skill} highlight />
                              <WeaponStat label="S" value={w.s} />
                              <WeaponStat label="AP" value={w.ap} />
                              <WeaponStat label="D" value={w.d} />
                            </div>
                            {/* Traits */}
                            {w.modifiers && w.modifiers.length > 0 && (
                              <div className="text-[8px] text-slate-500 mt-1.5 truncate" title={renderKeywords(w.modifiers) || ''}>
                                {renderKeywords(w.modifiers)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="px-4 py-2 text-[10px] text-slate-600 italic">No wargear equipped</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer — action buttons + wound controls */}
      <div className="px-4 py-2 bg-grim-800/50 border-t border-grim-700/40 shrink-0 flex items-center justify-between interactive">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onSelectIds(allModelIds)}
            className="p-1.5 rounded hover:bg-grim-700 text-slate-500 hover:text-white transition-colors"
            title="Select these models"
          >
            <MousePointer2 size={13} />
          </button>
          {allGroupIds.length > 0 && (
            <button
              onClick={() => onSelectUnit(allGroupIds)}
              className="p-1.5 rounded hover:bg-grim-700 text-slate-500 hover:text-blue-300 transition-colors"
              title="Select whole unit"
            >
              <Users size={13} />
            </button>
          )}
          <button
            onClick={() => onCenterView(allModelIds)}
            className="p-1.5 rounded hover:bg-grim-700 text-slate-500 hover:text-grim-gold transition-colors"
            title="Center view on selection"
          >
            <Eye size={13} />
          </button>
        </div>

        <div className="flex items-center gap-1 bg-grim-900/60 border border-grim-700/30 rounded-lg px-2 py-1">
          <button
            onClick={() => onAdjustWounds(allModelIds, -1)}
            className="w-5 h-5 flex items-center justify-center rounded bg-grim-800 text-red-400 hover:bg-red-900/40 hover:text-red-300 transition-colors font-bold text-xs"
            title="Damage"
          >
            -
          </button>
          <Heart size={11} className="text-slate-600 mx-0.5" />
          <button
            onClick={() => onAdjustWounds(allModelIds, 1)}
            className="w-5 h-5 flex items-center justify-center rounded bg-grim-800 text-green-400 hover:bg-green-900/40 hover:text-green-300 transition-colors font-bold text-xs"
            title="Heal"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
};

/** Stat cell for FIXED right panel — 3×2 grid style */
const StatCell = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-grim-800/50 rounded px-2 py-1.5 border border-grim-700/20 text-center">
    <div className="text-[7px] text-slate-500 font-bold uppercase tracking-wider leading-none mb-1">{label}</div>
    <div className="text-sm text-white font-bold font-mono leading-none">{value}</div>
  </div>
);

/** Weapon stat cell — small label + value */
const WeaponStat = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <div>
    <div className="text-[7px] text-slate-600 font-bold leading-none mb-0.5">{label}</div>
    <div className={`text-[10px] font-mono font-bold leading-none ${highlight ? 'text-grim-gold' : 'text-slate-300'}`}>{value}</div>
  </div>
);

/** Stat box for FLOATING hover bubble — vertical label+value */
const StatBox = ({ label, value }: { label: string, value: string }) => (
    <div className="flex-1 flex flex-col items-center border-r border-grim-700/30 last:border-0">
        <span className="text-[8px] text-slate-500 font-bold leading-none mb-0.5">{label}</span>
        <span className="text-white font-bold text-xs leading-none font-mono">{value}</span>
    </div>
);
