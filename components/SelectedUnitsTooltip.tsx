
import React, { useState, useMemo, useEffect } from 'react';
import { ChevronDown, ChevronUp, Sword, Crosshair, Users, MousePointer2, Eye, Minus, Plus, Heart } from 'lucide-react';
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
  
  // Legacy/Compatibility props (if passed by old parent, though we updated App.tsx)
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
  // Backwards compatibility for props if needed
  const effectiveSelectionData = props.selectionData || (props.groups && props.groups.length > 0 ? {
      groups: props.groups,
      totalCount: props.totalCount || 0,
      squadName: props.squadName || ''
  } : null);

  return (
    <>
        {/* Selection Panel (Fixed) */}
        {effectiveSelectionData && (
            <TooltipPanel 
                data={effectiveSelectionData} 
                mode="FIXED" 
                {...props} 
            />
        )}

        {/* Hover Bubble (Floating) */}
        {props.hoverData && (
            <TooltipPanel 
                data={props.hoverData} 
                mode="FLOATING" 
                {...props} 
            />
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

  const toggleProfile = (idx: number) => {
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
          if (el.scrollHeight > el.clientHeight) {
              e.stopPropagation();
              return;
          }
      }
      
      if (onPassThroughWheel) {
          onPassThroughWheel(e.nativeEvent);
      }
  };

  const isFloating = mode === 'FLOATING';

  // Track cursor screen position for floating tooltip
  const [cursorScreenPos, setCursorScreenPos] = useState<{x: number, y: number} | null>(null);
  useEffect(() => {
      if (!isFloating) return;
      const handler = (e: MouseEvent) => setCursorScreenPos({ x: e.clientX, y: e.clientY });
      window.addEventListener('mousemove', handler);
      return () => window.removeEventListener('mousemove', handler);
  }, [isFloating]);

  // Calculate Anchor Position for Hover Mode (Floating Bubble)
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

      const screenX = pan.x + (worldCenterX * scale);
      const screenY = pan.y + (worldTopY * scale);

      return { x: screenX, y: screenY };
  }, [isFloating, data, elements, getViewport]);

  // For floating: wait for cursor position so it pops up right at the mouse (no animation)
  if (isFloating && !cursorScreenPos) return null;

  const isSingleModelSelection = data.groups.length === 1 && data.totalCount === 1;

  return (
    <div
      className={`
        ${isFloating
            ? 'fixed z-[65] pointer-events-none w-auto max-w-xs'
            : `fixed z-[55] bottom-[4.5rem] max-w-md w-full transition-all duration-300 ease-in-out animate-in fade-in ${sidebarOpen ? 'left-[21rem]' : 'left-4'}`
        }
        bg-grim-900/95 backdrop-blur-md
        border ${isFloating ? 'border-grim-700' : 'border-grim-gold/50'} rounded-lg shadow-2xl overflow-hidden
      `}
      onClick={!isFloating ? handleClick : undefined}
      onMouseMove={!isFloating ? handleMouseMove : undefined}
      onMouseLeave={() => setIsOverUnit(false)}
      onWheel={handleWheel}
      style={isFloating ? {
          left: (cursorScreenPos?.x ?? anchorPos?.x ?? 0) + 16,
          top: (cursorScreenPos?.y ?? anchorPos?.y ?? 0) - 15,
          transform: 'translateY(-100%)',
          cursor: 'default'
      } : { cursor: isOverUnit ? 'pointer' : 'default' }}
      title={isOverUnit && !isFloating ? "Click to select underlying unit" : undefined}
    >
      {/* Floating Tail Arrow - points left toward the cursor */}
      {isFloating && (
          <div className="absolute top-[calc(100%-12px)] right-full -mr-px w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[6px] border-r-grim-700"></div>
      )}

      {/* --- HEADER --- */}
      <div className={`${isFloating ? 'p-2' : 'p-3'} bg-grim-800/80 border-b border-grim-700 flex justify-between items-center interactive`}>
        <div className="flex items-center gap-3">
          <div className={`font-bold px-2 py-0.5 rounded text-xs ${isFloating ? 'bg-grim-800 text-slate-300 border border-grim-700' : 'bg-grim-gold text-grim-900'}`}>
            {data.totalCount} {data.totalCount === 1 ? 'MODEL' : 'MODELS'}
          </div>
          <div className="h-4 w-px bg-grim-600"></div>
          <span className="text-sm font-bold text-white uppercase tracking-wider truncate">
            {data.squadName}
          </span>
        </div>
      </div>

      {/* --- SCROLLABLE CONTENT --- */}
      <div className={`${isFloating ? 'p-1' : 'p-2 max-h-[40vh]'} overflow-y-auto scrollbar-thin scrollbar-thumb-grim-700 scrollbar-track-transparent space-y-2 interactive`}>
        {data.groups.map((group, idx) => {
          const isExpanded = isFloating ? true : (expandedProfiles[idx] ?? true);

          return (
            <div key={idx} className="bg-grim-800/40 rounded border border-grim-700/50 overflow-hidden">
              
              {/* Profile Header Row */}
              <div
                className={`p-2 flex flex-col gap-2 ${!isFloating ? 'hover:bg-grim-800/60 transition-colors cursor-pointer' : ''}`}
                onClick={!isFloating ? () => toggleProfile(idx) : undefined}
                onKeyDown={!isFloating ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleProfile(idx); } } : undefined}
                role={!isFloating ? 'button' : undefined}
                tabIndex={!isFloating ? 0 : undefined}
                aria-expanded={!isFloating ? isExpanded : undefined}
                aria-label={!isFloating ? `${group.label} profile, ${isExpanded ? 'collapse' : 'expand'}` : undefined}
              >
                {!isSingleModelSelection && (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-grim-gold font-mono font-bold text-xs">{group.count}x</span>
                            <span className="text-sm font-bold text-slate-200">{group.label}</span>
                        </div>
                        {!isFloating && (
                            <button className="text-slate-500 hover:text-white">
                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                        )}
                    </div>
                )}

                {/* Inline Stats */}
                <div className="flex items-center gap-2">
                    <div className="flex-1 flex bg-grim-900/50 rounded p-1 gap-px border border-grim-700/30">
                        <StatBox label="M" value={group.stats.m} />
                        <StatBox label="T" value={group.stats.t} />
                        <StatBox label="SV" value={group.stats.sv} />
                        <StatBox label="W" value={group.stats.w} />
                        <StatBox label="LD" value={group.stats.ld} />
                        <StatBox label="OC" value={group.stats.oc} />
                    </div>
                    {isSingleModelSelection && !isFloating && (
                         <div className="text-slate-500 hover:text-white px-1">
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </div>
                    )}
                </div>
              </div>

              {/* Collapsible Details (Weapons) - hidden in floating hover mode */}
              {isExpanded && !isFloating && (
                <div className="bg-black/20 border-t border-grim-700/30">
                    {/* Weapons List */}
                    <div className="p-2 pb-1">
                        {group.stats.weapons.length === 0 ? (
                            <div className="text-[10px] text-slate-500 italic text-center py-1">No wargear equipped</div>
                        ) : (
                            <div className="space-y-1.5">
                                {/* Table Header */}
                                <div className="grid grid-cols-[3fr_2rem_1.5rem_2rem_1.5rem_1.5rem_1.5rem] gap-1 text-[8px] uppercase font-bold text-slate-500 px-1">
                                    <span>Weapon</span>
                                    <span className="text-center">RNG</span>
                                    <span className="text-center">A</span>
                                    <span className="text-center">Hit</span>
                                    <span className="text-center">S</span>
                                    <span className="text-center">AP</span>
                                    <span className="text-center">D</span>
                                </div>
                                
                                {/* Weapon Rows */}
                                {group.stats.weapons.map((w, wIdx) => (
                                    <div key={wIdx} className="bg-grim-900/40 rounded p-1 border border-grim-700/20">
                                        <div className="grid grid-cols-[3fr_2rem_1.5rem_2rem_1.5rem_1.5rem_1.5rem] gap-1 items-center mb-0.5">
                                            <div className="flex items-center gap-1.5 overflow-hidden">
                                                {w.type === 'MELEE' ? <Sword size={10} className="text-red-400 shrink-0"/> : <Crosshair size={10} className="text-blue-400 shrink-0"/>}
                                                <span className="text-[10px] font-bold text-slate-200 truncate" title={w.name}>{w.name}</span>
                                            </div>
                                            <div className="text-[9px] text-center text-slate-300 font-mono">{w.range}</div>
                                            <div className="text-[9px] text-center text-slate-300 font-mono">{w.a}</div>
                                            <div className="text-[9px] text-center text-grim-gold font-mono">{w.skill}</div>
                                            <div className="text-[9px] text-center text-slate-300 font-mono">{w.s}</div>
                                            <div className="text-[9px] text-center text-slate-300 font-mono">{w.ap}</div>
                                            <div className="text-[9px] text-center text-slate-300 font-mono">{w.d}</div>
                                        </div>
                                        {/* Keywords */}
                                        {w.modifiers && w.modifiers.length > 0 && (
                                            <div className="text-[9px] text-slate-500 pl-4 truncate">
                                                <span className="text-slate-600 uppercase text-[8px] mr-1">Traits:</span>
                                                {renderKeywords(w.modifiers)}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Quick Actions Footer - Only visible when Selected (not floating hover) */}
                    {!isFloating && (
                        <div className="px-2 py-1.5 bg-grim-900/40 border-t border-grim-700/30 flex justify-between items-center gap-2">
                            <div className="flex items-center gap-1">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onSelectIds(group.modelIds); }}
                                    className="p-1 rounded hover:bg-grim-700 text-slate-400 hover:text-white transition-colors"
                                    title="Select only these models"
                                >
                                    <MousePointer2 size={12} />
                                </button>
                                {group.groupIds.length > 0 && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onSelectUnit(group.groupIds); }}
                                        className="p-1 rounded hover:bg-grim-700 text-slate-400 hover:text-blue-300 transition-colors"
                                        title="Select whole unit(s)"
                                    >
                                        <Users size={12} />
                                    </button>
                                )}
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onCenterView(group.modelIds); }}
                                    className="p-1 rounded hover:bg-grim-700 text-slate-400 hover:text-grim-gold transition-colors"
                                    title="Center view"
                                >
                                    <Eye size={12} />
                                </button>
                            </div>

                            <div className="flex items-center bg-grim-900 border border-grim-700 rounded px-1 py-0.5 gap-2">
                                <Heart size={10} className="text-slate-500"/>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onAdjustWounds(group.modelIds, -1); }}
                                        className="w-4 h-4 flex items-center justify-center rounded bg-grim-800 text-red-400 hover:bg-red-900/50 hover:text-red-300 transition-colors font-bold text-[10px]"
                                        title="Damage"
                                        aria-label={`Deal 1 damage to ${group.label}`}
                                    >
                                        -
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onAdjustWounds(group.modelIds, 1); }}
                                        className="w-4 h-4 flex items-center justify-center rounded bg-grim-800 text-green-400 hover:bg-green-900/50 hover:text-green-300 transition-colors font-bold text-[10px]"
                                        title="Heal"
                                        aria-label={`Heal 1 wound on ${group.label}`}
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const StatBox = ({ label, value }: { label: string, value: string }) => (
    <div className="flex-1 flex flex-col items-center border-r border-grim-700/30 last:border-0">
        <span className="text-[8px] text-slate-500 font-bold leading-none mb-0.5">{label}</span>
        <span className="text-white font-bold text-xs leading-none font-mono">{value}</span>
    </div>
);
