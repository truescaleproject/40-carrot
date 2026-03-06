import React, { useRef, useState, useEffect, useMemo, forwardRef, useImperativeHandle, useCallback, useLayoutEffect } from 'react';
import { BoardElement, DrawingLine, InteractionMode, ElementType, ViewportInfo, DeploymentZone } from '../types';
import { UnitCard } from './UnitCard';
import { ZoomIn, Skull, Flag, RotateCw, Lock } from 'lucide-react';
import { snapToGrid, calculateEllipseRadius, checkLineElementIntersections, isPointInRotatedRect, findSafeGroupPosition, calculateResizeDimensions } from '../utils/boardUtils';
import { BOARD_OFFSET } from '../constants';

export interface BoardRef {
  getViewport: () => ViewportInfo | null;
  adjustPan: (newPan: { x: number, y: number }) => void;
  handleExternalWheel: (event: WheelEvent) => void;
  resetView: () => void;
}

interface BoardProps {
  elements: BoardElement[];
  setElements: React.Dispatch<React.SetStateAction<BoardElement[]>>;
  lines: DrawingLine[];
  setLines: React.Dispatch<React.SetStateAction<DrawingLine[]>>;
  zones?: DeploymentZone[];
  mode: InteractionMode;
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  backgroundImage: string | null;
  activeColor: string;
  pixelsPerInch: number;
  boardWidth: number;
  boardHeight: number;
  onActionStart: () => void;
  sidebarHoveredId: string | null;
  onRightClick: () => void;
  labelFontSize: number;
  sidebarOpen: boolean;
  auraRadius: number | null;
  objectivesUnlocked: boolean;
  isTerrainLocked: boolean;
  showEdgeMeasurements?: boolean;
  boardCount?: number;
  showCoherencyAlerts: boolean;
  isTerrainVisible: boolean;
  areZonesVisible: boolean;
  onGroupRotationStart?: () => void;
  onGroupRotate?: (degrees: number) => void;
  onGroupRotationEnd?: () => void;
  onFocusedBoardChange?: (index: number) => void;
  displayMode?: 'desktop' | 'projector';
  isSpacePressed?: boolean;
  isTabPressed?: boolean;
  onInteraction?: () => void;
  onHover?: (id: string | null) => void;
}

const RESIZE_HANDLES = [
    { id: 'n', cursor: 'ns-resize', style: { top: '-6px', left: '50%', transform: 'translateX(-50%)', width: '12px', height: '12px' } },
    { id: 's', cursor: 'ns-resize', style: { bottom: '-6px', left: '50%', transform: 'translateX(-50%)', width: '12px', height: '12px' } },
    { id: 'e', cursor: 'ew-resize', style: { right: '-6px', top: '50%', transform: 'translateY(-50%)', width: '12px', height: '12px' } },
    { id: 'w', cursor: 'ew-resize', style: { left: '-6px', top: '50%', transform: 'translateY(-50%)', width: '12px', height: '12px' } },
    { id: 'nw', cursor: 'nwse-resize', style: { top: '-6px', left: '-6px', width: '12px', height: '12px' } },
    { id: 'ne', cursor: 'nesw-resize', style: { top: '-6px', right: '-6px', width: '12px', height: '12px' } },
    { id: 'sw', cursor: 'nesw-resize', style: { bottom: '-6px', left: '-6px', width: '12px', height: '12px' } },
    { id: 'se', cursor: 'nwse-resize', style: { bottom: '-6px', right: '-6px', width: '12px', height: '12px' } },
];

const getClientCoords = (event: React.MouseEvent | React.TouchEvent | React.PointerEvent | MouseEvent | TouchEvent) => {
    if ('touches' in event) {
        if (event.touches && event.touches.length > 0) return { x: event.touches[0].clientX, y: event.touches[0].clientY };
        if (event.changedTouches && event.changedTouches.length > 0) return { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY };
        return { x: 0, y: 0 };
    }
    return { x: (event as any).clientX, y: (event as any).clientY };
};

const BoardElementItem = React.memo(({ 
    element, isSelected, isDragged, isHovered, isSidebarHovered, isIntersected, isCoherencyBroken, 
    mode, isTerrainLocked, objectivesUnlocked, labelFontSize, onContextMenu, handleRotationStart, handleResizeStart,
    setHoveredElement, lineScale, isMultiSelection, isEditing, onTextChange, onTextBlur
}: any) => {
    const isSlain = element.type === ElementType.MODEL && element.currentWounds === 0;
    const effectiveShape = element.shape || (element.type === ElementType.MODEL ? 'CIRCLE' : 'RECTANGLE');
    const isRectangular = effectiveShape === 'RECTANGLE';
    const isOval = Math.abs(element.width - element.height) > 0.1;
    const isText = element.type === ElementType.TEXT;
    const isRotatable = isSelected && !isMultiSelection && mode === InteractionMode.SELECT && !element.locked && (effectiveShape === 'RECTANGLE' || isOval || isText);
    const isResizable = isSelected && !isMultiSelection && (element.type === ElementType.TERRAIN || isText) && (!isTerrainLocked || isText) && !element.locked;
    const isObjective = element.type === ElementType.OBJECTIVE;
    const isLockedTerrain = element.type === ElementType.TERRAIN && isTerrainLocked;
    
    const zIndex = (isDragged ? 1000 : (element.type === ElementType.MODEL ? 30 : (element.type === ElementType.OBJECTIVE ? 5 : (isText ? 40 : 10)))) 
        + (isSelected ? 10 : 0) 
        + (isSidebarHovered ? 60 : 0) 
        + (isHovered ? 60 : 0);
    
    const transitionClass = isDragged ? '' : 'transition-opacity duration-300 ease-out';
    const shadows: string[] = [];
    if (element.type === ElementType.MODEL && element.strokeColor) shadows.push(`inset 0 0 0 ${3 * lineScale}px ${element.strokeColor}`);
    if (isIntersected) shadows.push(`0 0 15px 4px rgba(250, 204, 21, 0.6)`);
    else if (isSidebarHovered) shadows.push(`0 0 0 ${2 * lineScale}px #22d3ee`, `0 0 20px 5px rgba(34,211,238,0.6)`);
    else if (isCoherencyBroken) shadows.push(`0 0 0 ${2 * lineScale}px #ef4444`, `0 0 35px 5px rgba(239,68,68,1)`);
    else if (isHovered && !isDragged && element.type === ElementType.MODEL) shadows.push(`0 0 0 ${2 * lineScale}px rgba(255,255,255,0.8)`, `0 0 15px 2px rgba(255,255,255,0.6)`);
    else if (element.type === ElementType.OBJECTIVE) shadows.push(`0 0 10px 1px rgba(251, 191, 36, 0.4)`);
    else if (!isText) shadows.push(`0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)`);
    
    const finalBoxShadow = shadows.join(', ');
    let extraClasses = '';
    if (isSidebarHovered) extraClasses += ' brightness-125 z-50';
    else if (isHovered && !isDragged && element.type === ElementType.MODEL) extraClasses += ' brightness-110';
    if (isRectangular || element.type === ElementType.OBJECTIVE) extraClasses += ' rounded-sm';
    if (isSlain) extraClasses += ' grayscale brightness-50 opacity-90';

    const scaleTransform = isSidebarHovered ? 'scale(1.1)' : '';
    const rotationTransform = `rotate(${element.rotation}deg)`;
    const objectiveStyle: React.CSSProperties = isObjective ? {
        backgroundColor: 'rgba(30, 41, 59, 0.8)', border: `${2 * lineScale}px solid #fbbf24`, color: '#fbbf24',
        borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 'bold', fontFamily: 'monospace', pointerEvents: objectivesUnlocked ? 'auto' : 'none'
    } : {};

    const maxWounds = element.stats ? parseInt(element.stats.w) : 1;
    const currentWounds = element.currentWounds ?? maxWounds;
    const showWoundCounter = element.type === ElementType.MODEL && (maxWounds > 1 || currentWounds < maxWounds);
    
    return (
        <div
            className={`absolute flex items-center justify-center group pointer-events-auto ${extraClasses} ${transitionClass}`}
            style={{
                left: element.x - BOARD_OFFSET, top: element.y - BOARD_OFFSET, width: element.width, height: element.height,
                backgroundColor: !isObjective && !isText ? (element.image ? 'transparent' : element.color) : undefined,
                backgroundImage: element.image ? `url(${element.image})` : 'none',
                backgroundSize: 'cover', backgroundPosition: 'center', boxShadow: finalBoxShadow,
                transform: `${rotationTransform} ${scaleTransform}`,
                borderRadius: !isRectangular && !isObjective && !isText ? '50%' : undefined,
                zIndex: zIndex,
                outline: isSelected ? `${2 * lineScale}px dashed rgba(57, 255, 20, 0.8)` : undefined,
                outlineOffset: isSelected ? '2px' : undefined,
                border: isIntersected ? '2px solid #facc15' : undefined, 
                pointerEvents: isLockedTerrain ? 'none' : 'auto',
                cursor: element.locked ? 'not-allowed' : (mode === InteractionMode.SELECT ? 'move' : undefined),
                ...objectiveStyle
            }}
            onContextMenu={(e) => onContextMenu(e, element.id)}
            onMouseEnter={() => setHoveredElement(element)}
            onMouseLeave={() => setHoveredElement(null)}
        >
            {element.locked && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none drop-shadow-md">
                    <Lock size={Math.min(element.width, element.height) * 0.4} className="text-white opacity-80" />
                </div>
            )}
            
            {isText ? (
                isEditing ? (
                    <textarea
                        autoFocus
                        className="w-full h-full bg-grim-900/80 text-white p-2 border border-grim-gold rounded resize-none focus:outline-none font-mono leading-tight"
                        style={{ color: element.color, fontSize: `${labelFontSize * 1.5}px` }}
                        value={element.label}
                        onChange={(e) => onTextChange(element.id, e.target.value)}
                        onBlur={() => onTextBlur(element.id)}
                        onKeyDown={(e) => e.stopPropagation()} 
                        onMouseDown={(e) => e.stopPropagation()}
                    />
                ) : (
                    <div className="w-full h-full p-2 overflow-hidden whitespace-pre-wrap font-mono leading-tight pointer-events-none flex items-start" style={{ color: element.color, fontSize: `${labelFontSize * 1.5}px` }}>
                        {element.label || <span className="opacity-50 italic">Empty Note</span>}
                    </div>
                )
            ) : (
                isObjective ? (
                    <span className="text-[10px] pointer-events-none" style={{fontSize: `${Math.max(10, labelFontSize * 0.7)}px`}}>{element.label}</span>
                ) : (
                    !element.image && element.type !== ElementType.MODEL && !element.locked && (
                        <span 
                        className="text-white font-bold pointer-events-none drop-shadow-md text-center px-1 overflow-hidden"
                        style={{ fontSize: `${labelFontSize}px`, transform: `rotate(${-element.rotation}deg)` }}
                        >
                        {element.label}
                        </span>
                    )
                )
            )}

            {showWoundCounter && !isSlain && (
                <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none select-none">
                    <span className="text-white/50 font-bold font-mono drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]" style={{ fontSize: `${Math.min(element.width, element.height) * 0.5}px` }}>{currentWounds}</span>
                </div>
            )}
            {isSlain && (
                <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
                    <Skull className="text-red-500 drop-shadow-[0_2px_4px_rgba(0,0,0,1)]" strokeWidth={2.5} size={Math.min(element.width, element.height) * 0.6} />
                </div>
            )}
            {isRotatable && (
                <>
                    <div className="absolute -top-2 -left-2 w-3 h-3 bg-white border border-black rounded-full cursor-crosshair z-40 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity" onPointerDown={(e) => handleRotationStart(e, element)} onTouchStart={(e) => handleRotationStart(e, element)}/>
                    <div className="absolute -top-2 -right-2 w-3 h-3 bg-white border border-black rounded-full cursor-crosshair z-40 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity" onPointerDown={(e) => handleRotationStart(e, element)} onTouchStart={(e) => handleRotationStart(e, element)}/>
                    <div className="absolute -bottom-2 -left-2 w-3 h-3 bg-white border border-black rounded-full cursor-crosshair z-40 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity" onPointerDown={(e) => handleRotationStart(e, element)} onTouchStart={(e) => handleRotationStart(e, element)}/>
                    <div className="absolute -bottom-2 -right-2 w-3 h-3 bg-white border border-black rounded-full cursor-crosshair z-40 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity" onPointerDown={(e) => handleRotationStart(e, element)} onTouchStart={(e) => handleRotationStart(e, element)}/>
                </>
            )}
            {isResizable && (
                <>
                    <div className="absolute flex flex-col items-center z-50" style={{ bottom: '100%', left: '50%', transform: `translateX(-50%)`, transformOrigin: 'bottom center' }}>
                        <div className="w-6 h-6 bg-white border border-grim-700 rounded-full shadow-md flex items-center justify-center cursor-crosshair hover:bg-grim-gold hover:border-grim-gold text-grim-900 transition-colors mb-0.5" onPointerDown={(e) => handleRotationStart(e, element)} onTouchStart={(e) => handleRotationStart(e, element)} title="Rotate">
                            <RotateCw size={12} />
                        </div>
                        <div className="w-0.5 h-4 bg-white border-x border-grim-700"></div>
                    </div>
                    {RESIZE_HANDLES.map(h => (
                        <div key={h.id} className="absolute bg-white border border-grim-900 shadow-sm z-50 hover:bg-grim-gold transition-colors" style={{ cursor: h.cursor, ...h.style, transform: `${h.style.transform || ''}` }} onPointerDown={(e) => handleResizeStart(e, h.id, element)} onTouchStart={(e) => handleResizeStart(e, h.id, element)} />
                    ))}
                </>
            )}
        </div>
    );
});

export const Board = forwardRef<BoardRef, BoardProps>(({
  elements, setElements, lines, setLines, zones = [], mode, selectedIds, setSelectedIds,
  backgroundImage, activeColor, pixelsPerInch, boardWidth, boardHeight, onActionStart,
  sidebarHoveredId, onRightClick, labelFontSize, sidebarOpen, auraRadius, objectivesUnlocked,
  isTerrainLocked, showEdgeMeasurements, boardCount = 1,
  showCoherencyAlerts, isTerrainVisible, areZonesVisible, onGroupRotationStart, onGroupRotate, onGroupRotationEnd, onFocusedBoardChange,
  displayMode = 'desktop', isSpacePressed = false, isTabPressed = false, onInteraction, onHover
}, ref) => {
  const boardPixelWidth = boardWidth * pixelsPerInch;
  const boardPixelHeight = boardHeight * pixelsPerInch;
  const hGap = 12 * pixelsPerInch, hPitch = boardPixelWidth + hGap, vPitch = boardPixelHeight + (20 * pixelsPerInch);
  const lineScale = displayMode === 'projector' ? 2.5 : 1;

  const [scale, setScale] = useState(0.5);
  const [pan, setPan] = useState({ x: 50, y: 50 });
  const [isAdjustingPan, setIsAdjustingPan] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentLine, setCurrentLine] = useState<DrawingLine | null>(null);
  const [intersectedIds, setIntersectedIds] = useState<string[]>([]);
  const [selectionBoxStart, setSelectionBoxStart] = useState<{ x: number, y: number } | null>(null);
  const [currentSelectionBox, setCurrentSelectionBox] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
  const [activeDragMode, setActiveDragMode] = useState<'PAN' | 'SELECT' | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number, y: number } | null>(null);
  const [draggedElementId, setDraggedElementId] = useState<string | null>(null);
  const [initialElementPositions, setInitialElementPositions] = useState<Record<string, { x: number, y: number }>>({});
  const [isRotating, setIsRotating] = useState(false);
  const [isGroupRotating, setIsGroupRotating] = useState(false);
  const [rotationSnap, setRotationSnap] = useState<{ startAngle: number, currentRotation: number, id?: string, center?: {x: number, y: number} } | null>(null);
  const [hoveredElement, setHoveredElement] = useState<BoardElement | null>(null);
  const [cursorPos, setCursorPos] = useState<{x: number, y: number} | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [resizeState, setResizeState] = useState<{ 
      handle: string;
      id: string; 
      startMouseX: number; 
      startMouseY: number; 
      startWidth: number; 
      startHeight: number; 
      startX: number; 
      startY: number; 
      centerX: number; 
      centerY: number; 
      rotation: number; 
  } | null>(null);

  const elementMap = useMemo(() => new Map(elements.map(e => [e.id, e])), [elements]);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedElements = useMemo(() => elements.filter(el => selectedIdSet.has(el.id)), [elements, selectedIdSet]);

  useEffect(() => {
      if (onHover) {
          onHover(hoveredElement ? hoveredElement.id : null);
      }
  }, [hoveredElement, onHover]);

  const activeLabelOverlays = useMemo(() => {
    const overlays: { x: number, y: number, text: string, key: string, width: number, height: number, anchorX: number, anchorY: number }[] = [];
    
    // 1. Identify "Active" Models (Selected, Hovered, or Sidebar-Hovered)
    const activeIds = new Set<string>();
    
    // Add Selected (hovered units get the floating stat tooltip instead of labels)
    selectedIds.forEach(id => activeIds.add(id));

    // Filter to get objects
    const activeElements = elements.filter(e => activeIds.has(e.id) && e.type === ElementType.MODEL);
    
    if (activeElements.length === 0) return overlays;

    // 2. Grouping
    // Elements with groupId: group by groupId (squads stay cohesive).
    // Ungrouped elements: spatially cluster by shared label to reduce clutter.
    const groups = new Map<string, BoardElement[]>();

    // Step A: Group elements that have a groupId (existing behavior)
    const ungrouped: BoardElement[] = [];
    activeElements.forEach(el => {
        if (el.groupId) {
            if (!groups.has(el.groupId)) groups.set(el.groupId, []);
            groups.get(el.groupId)!.push(el);
        } else {
            ungrouped.push(el);
        }
    });

    // Step B: For ungrouped elements, bucket by label then spatially cluster
    const labelBuckets = new Map<string, BoardElement[]>();
    ungrouped.forEach(el => {
        const label = el.label || 'Unknown';
        if (!labelBuckets.has(label)) labelBuckets.set(label, []);
        labelBuckets.get(label)!.push(el);
    });

    labelBuckets.forEach((els, label) => {
        if (els.length === 1) {
            groups.set(els[0].id, els);
            return;
        }
        // Spatial clustering via union-find
        const parent = els.map((_, i) => i);
        const find = (i: number): number => parent[i] === i ? i : (parent[i] = find(parent[i]));
        const union = (a: number, b: number) => { parent[find(a)] = find(b); };

        const avgSize = els.reduce((s, e) => s + Math.max(e.width, e.height), 0) / els.length;
        const threshold = avgSize * 3;

        for (let i = 0; i < els.length; i++) {
            const ci = { x: els[i].x + els[i].width / 2, y: els[i].y + els[i].height / 2 };
            for (let j = i + 1; j < els.length; j++) {
                const cj = { x: els[j].x + els[j].width / 2, y: els[j].y + els[j].height / 2 };
                const dist = Math.hypot(ci.x - cj.x, ci.y - cj.y);
                if (dist < threshold) union(i, j);
            }
        }

        // Collect clusters
        const clusters = new Map<number, BoardElement[]>();
        els.forEach((el, i) => {
            const root = find(i);
            if (!clusters.has(root)) clusters.set(root, []);
            clusters.get(root)!.push(el);
        });

        clusters.forEach((clusterEls, root) => {
            groups.set(`ungrouped-${label}-${root}`, clusterEls);
        });
    });

    // 3. Generate Initial Positions
    groups.forEach((els, key) => {
        // Use the label of the first element. If grouped, they should share labels.
        const first = els[0];
        const baseLabel = first.groupLabel || first.label || "Unknown";
        const text = els.length > 1 ? `${baseLabel} ×${els.length}` : baseLabel;
        
        // Estimate Screen Size
        const screenWidth = (text.length * (labelFontSize * 0.6)) + 16;
        const screenHeight = labelFontSize + 10;
        
        const boardW = screenWidth / scale;
        const boardH = screenHeight / scale;

        if (els.length > 1) {
            let minX = Infinity, maxX = -Infinity, minY = Infinity;
            els.forEach(e => {
                minX = Math.min(minX, e.x);
                maxX = Math.max(maxX, e.x + e.width);
                minY = Math.min(minY, e.y);
            });
            const centerX = (minX + maxX) / 2;
            overlays.push({
                x: centerX,
                y: minY,
                text: text,
                key: `group-${key}`,
                width: boardW,
                height: boardH,
                anchorX: centerX,
                anchorY: minY
            });
        } else {
            const el = els[0];
            overlays.push({
                x: el.x + el.width / 2,
                y: el.y,
                text: text,
                key: `single-${el.id}`,
                width: boardW,
                height: boardH,
                anchorX: el.x + el.width / 2,
                anchorY: el.y
            });
        }
    });

    // 4. Collision Resolution (Iterative relaxation)
    const iterations = 10;
    const verticalOffset = 10 / scale; // Gap between unit top and label bottom

    for (let iter = 0; iter < iterations; iter++) {
        for (let i = 0; i < overlays.length; i++) {
            const a = overlays[i];
            
            // Define Box A (Bottom-Center anchor)
            const aB = a.y - verticalOffset;
            const aT = aB - a.height;
            const aL = a.x - a.width / 2;
            const aR = a.x + a.width / 2;

            for (let j = i + 1; j < overlays.length; j++) {
                const b = overlays[j];
                
                const bB = b.y - verticalOffset;
                const bT = bB - b.height;
                const bL = b.x - b.width / 2;
                const bR = b.x + b.width / 2;

                // Check Overlap
                const overlapX = Math.min(aR, bR) - Math.max(aL, bL);
                const overlapY = Math.min(aB, bB) - Math.max(aT, bT);

                if (overlapX > 0 && overlapY > 0) {
                    // Push apart along smallest overlap axis
                    if (overlapX < overlapY) {
                        const move = overlapX / 2;
                        if (a.x < b.x) { a.x -= move; b.x += move; } 
                        else { a.x += move; b.x -= move; }
                    } else {
                        const move = overlapY / 2;
                        if (a.y < b.y) { a.y -= move; b.y += move; } 
                        else { a.y += move; b.y -= move; }
                    }
                }
            }
        }
        
        // Apply weak attraction to original anchor to prevent drifting too far
        for (let i = 0; i < overlays.length; i++) {
            const a = overlays[i];
            const dx = a.anchorX - a.x;
            const dy = a.anchorY - a.y;
            a.x += dx * 0.05;
            a.y += dy * 0.05;
        }
    }

    return overlays;
  }, [selectedIds, elements, elementMap, scale, labelFontSize]);

  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const clickStartRef = useRef<{ x: number, y: number } | null>(null);
  const lastTouchDistance = useRef<number | null>(null);
  const lastTouchCenter = useRef<{ x: number, y: number } | null>(null);
  const lastClickTime = useRef<number>(0);
  const lastClickId = useRef<string | null>(null);
  const rafRef = useRef<number | null>(null);
  const panRef = useRef(pan);
  const scaleRef = useRef(scale);
  const selectedIdsRef = useRef(selectedIds);
  const activeDragModeRef = useRef(activeDragMode);
  const draggedElementIdRef = useRef(draggedElementId);
  const onActionStartRef = useRef(onActionStart);
  const lastFocusedIndexRef = useRef<number>(-1);

  useEffect(() => { panRef.current = pan; }, [pan]);
  useEffect(() => { scaleRef.current = scale; }, [scale]);
  useEffect(() => { selectedIdsRef.current = selectedIds; }, [selectedIds]);
  useEffect(() => { activeDragModeRef.current = activeDragMode; }, [activeDragMode]);
  useEffect(() => { draggedElementIdRef.current = draggedElementId; }, [draggedElementId]);
  useEffect(() => { onActionStartRef.current = onActionStart; }, [onActionStart]);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  const dragCollisionData = useRef<{ selected: { id: string, offsetX: number, offsetY: number, width: number, height: number, rotation: number }[], static: { x: number, y: number, width: number, height: number, rotation: number }[] } | null>(null);

  const enforceSelectionRules = useCallback((ids: string[]) => {
      const selection = ids.map(id => elementMap.get(id)).filter((e): e is BoardElement => !!e);
      const hasModel = selection.some(e => e.type === ElementType.MODEL);
      const hasTerrain = selection.some(e => e.type === ElementType.TERRAIN);
      
      if (hasModel && hasTerrain) {
          // Models take precedence; remove terrain from selection
          return ids.filter(id => elementMap.get(id)?.type !== ElementType.TERRAIN);
      }
      return ids;
  }, [elementMap]);

  const handleSetHoveredElement = useCallback((element: BoardElement | null) => {
    setHoveredElement(prev => { if (prev === element || (prev && element && prev.id === element.id) || (!prev && !element)) return prev; return element; });
  }, []);

  const handleTextChange = useCallback((id: string, newLabel: string) => {
      setElements(prev => prev.map(el => el.id === id ? { ...el, label: newLabel } : el));
  }, [setElements]);

  const handleTextBlur = useCallback((id: string) => {
      setEditingId(null);
  }, []);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    const TOOLBAR_AREA_HEIGHT_PX = 60, TOP_CLEARANCE_INCHES = 2, BOTTOM_PADDING_PX = 60, HORIZONTAL_PADDING_FACTOR = 0.95, totalTopClearance = TOOLBAR_AREA_HEIGHT_PX + (TOP_CLEARANCE_INCHES * pixelsPerInch), contentWidth = boardPixelWidth, totalContentHeight = boardPixelHeight + (20 * pixelsPerInch), sidebarWidth = sidebarOpen ? 320 : 0, visibleWidth = window.innerWidth - sidebarWidth, visibleHeight = window.innerHeight - totalTopClearance - BOTTOM_PADDING_PX;
    const scaleX = (visibleWidth * HORIZONTAL_PADDING_FACTOR) / contentWidth, scaleY = (visibleHeight * HORIZONTAL_PADDING_FACTOR) / totalContentHeight, newScale = Math.min(scaleX, scaleY, 1), containerCenterX = visibleWidth / 2, boardContentCenterX = BOARD_OFFSET + (boardPixelWidth / 2), newPanX = containerCenterX - (boardContentCenterX * newScale), usableTop = totalTopClearance, usableBottom = window.innerHeight - BOTTOM_PADDING_PX, containerCenterY = usableTop + ((usableBottom - usableTop) / 2), boardContentCenterY = BOARD_OFFSET + (boardPixelHeight / 2), newPanY = containerCenterY - (boardContentCenterY * newScale);
    setScale(newScale); setPan({ x: newPanX, y: newPanY });
  }, []);

  // Focused Map Calculation Effect
  useEffect(() => {
    if (!wrapperRef.current) return;
    const wrapperRect = wrapperRef.current.getBoundingClientRect();
    const centerX = wrapperRect.width / 2;
    const centerY = wrapperRect.height / 2;
    const boardX = (centerX - pan.x) / scale;
    const boardY = (centerY - pan.y) / scale;
    const relX = boardX - BOARD_OFFSET;
    const relY = boardY - BOARD_OFFSET;
    if (hPitch <= 0 || vPitch <= 0) return;
    let col = Math.floor(relX / hPitch);
    let row = Math.floor(relY / vPitch);
    if (col < 0) col = 0; if (col > 2) col = 2; if (row < 0) row = 0;
    let index = row * 3 + col;
    if (index < 0) index = 0; if (index >= boardCount) index = boardCount - 1;
    if (index !== lastFocusedIndexRef.current) { lastFocusedIndexRef.current = index; if (onFocusedBoardChange) onFocusedBoardChange(index); }
  }, [pan, scale, boardCount, hPitch, vPitch, onFocusedBoardChange]);

  useEffect(() => { if (isAdjustingPan) { const timer = setTimeout(() => setIsAdjustingPan(false), 300); return () => clearTimeout(timer); } }, [isAdjustingPan]);

  const getBoardBoundsForPoint = (x: number, y: number) => {
      const relX = x - BOARD_OFFSET, relY = y - BOARD_OFFSET, col = Math.floor(relX / hPitch), row = Math.floor(relY / vPitch), startX = BOARD_OFFSET + (col * hPitch), startY = BOARD_OFFSET + (row * vPitch);
      return { minX: startX, maxX: startX + boardPixelWidth, minY: startY, maxY: startY + boardPixelHeight };
  };

  const processWheelEvent = useCallback((event: WheelEvent) => {
      if ((event.metaKey || event.ctrlKey || event.shiftKey) && !event.altKey) {
          event.preventDefault(); event.stopPropagation();
          const target = event.currentTarget as HTMLElement || document.body, rect = target.getBoundingClientRect ? target.getBoundingClientRect() : { left: 0, top: 0 }, mouseX = event.clientX - rect.left, mouseY = event.clientY - rect.top, zoomSensitivity = 0.002, currentScale = scaleRef.current, currentPan = panRef.current;
          let delta = event.deltaY; if (event.shiftKey && delta === 0) delta = event.deltaX;
          const zoomFactor = Math.exp(-delta * zoomSensitivity), newScale = Math.min(Math.max(0.1, currentScale * zoomFactor), 5), newPanX = mouseX - (mouseX - currentPan.x) * (newScale / currentScale), newPanY = mouseY - (mouseY - currentPan.y) * (newScale / currentScale);
          setScale(newScale); setPan({ x: newPanX, y: newPanY }); 
          scaleRef.current = newScale; panRef.current = { x: newPanX, y: newPanY };
          return;
      }
      if (event.altKey) {
          event.preventDefault(); event.stopPropagation(); if (activeDragModeRef.current === 'SELECT' && draggedElementIdRef.current) return;
          const direction = event.deltaY > 0 ? 1 : -1; onActionStartRef.current();
          setElements(prevElements => {
              const selectedSet = new Set(selectedIdsRef.current), selected = prevElements.filter(el => selectedSet.has(el.id));
              if (selected.length === 0 || selected.some(el => el.locked)) return prevElements;
              const isTerrainOnly = selected.every(e => e.type === ElementType.TERRAIN || e.type === ElementType.TEXT), isShiftHeld = event.shiftKey, rotationAmount = direction * ((isTerrainOnly && isShiftHeld) ? 15 : 5);
              let cx = 0, cy = 0;
              if (selected.length === 1) { cx = selected[0].x + selected[0].width / 2; cy = selected[0].y + selected[0].height / 2; }
              else { let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity; selected.forEach(el => { minX = Math.min(minX, el.x); minY = Math.min(minY, el.y); maxX = Math.max(maxX, el.x + el.width); maxY = Math.max(maxY, el.y + el.height); }); cx = (minX + maxX) / 2; cy = (minY + maxY) / 2; }
              const rads = (rotationAmount * Math.PI) / 180, cos = Math.cos(rads), sin = Math.sin(rads);
              return prevElements.map(el => {
                  if (!selectedSet.has(el.id)) return el; let newRotation = (el.rotation + rotationAmount) % 360; if (newRotation < 0) newRotation += 360;
                  if (selected.length === 1) return { ...el, rotation: newRotation }; const elCx = el.x + el.width / 2, elCy = el.y + el.height / 2, dx = elCx - cx, dy = elCy - cy; return { ...el, x: (dx * cos - dy * sin) + cx - el.width / 2, y: (dx * sin + dy * cos) + cy - el.height / 2, rotation: newRotation };
              });
          }); return;
      }
      event.preventDefault(); event.stopPropagation(); const currentPan = panRef.current;
      let dx = event.deltaX, dy = event.deltaY; if (event.deltaMode === 1) { dx *= 20; dy *= 20; }
      const newPan = { x: currentPan.x - dx, y: currentPan.y - dy };
      setPan(newPan);
      panRef.current = newPan;
      if (onInteraction && (dx !== 0 || dy !== 0)) onInteraction();
  }, [setElements, onInteraction]);

  const resetView = useCallback(() => {
      const windowWidth = window.innerWidth, windowHeight = window.innerHeight, sidebarWidth = sidebarOpen ? 320 : 0, visibleWidth = windowWidth - sidebarWidth, containerCenterX = visibleWidth / 2, containerCenterY = windowHeight / 2;
      const viewportCenterX = (containerCenterX - panRef.current.x) / scaleRef.current, viewportCenterY = (containerCenterY - panRef.current.y) / scaleRef.current, relX = viewportCenterX - BOARD_OFFSET, relY = viewportCenterY - BOARD_OFFSET;
      let targetBoardIndex = Math.max(0, Math.min(boardCount - 1, Math.floor(relY / vPitch) * 3 + Math.floor(relX / hPitch)));
      const targetCol = targetBoardIndex % 3, targetRow = Math.floor(targetBoardIndex / 3), boardCenterX = BOARD_OFFSET + (targetCol * hPitch) + (boardPixelWidth / 2), boardCenterY = BOARD_OFFSET + (targetRow * vPitch) + (boardPixelHeight / 2), newScale = 0.5;
      setPan({ x: windowWidth / 2 - boardCenterX * newScale, y: windowHeight / 2 - boardCenterY * newScale }); setScale(newScale);
      if (onFocusedBoardChange) onFocusedBoardChange(targetBoardIndex);
  }, [boardCount, boardPixelHeight, boardPixelWidth, hPitch, vPitch, sidebarOpen, onFocusedBoardChange]);

  useImperativeHandle(ref, (): BoardRef => ({
    getViewport: (): ViewportInfo | null => {
      if (typeof window === 'undefined') return null; 
      const rect = wrapperRef.current.getBoundingClientRect();
      const tlX = (0 - pan.x) / scale, tlY = (0 - pan.y) / scale;
      const brX = (rect.width - pan.x) / scale, brY = (rect.height - pan.y) / scale;
      return { center: { x: (tlX + brX) / 2, y: (tlY + brY) / 2 }, topLeft: { x: tlX, y: tlY }, bottomRight: { x: brX, y: brY }, scale, pixelsPerInch, pan: { ...pan } };
    },
    adjustPan: (newPan: { x: number, y: number }) => { setIsAdjustingPan(true); setPan(newPan); },
    handleExternalWheel: (event: WheelEvent) => { processWheelEvent(event); },
    resetView: resetView
  }));

  const getBoardCoords = (event: React.MouseEvent | React.TouchEvent | React.PointerEvent | MouseEvent | TouchEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 }; const rect = containerRef.current.getBoundingClientRect(), { x: clientX, y: clientY } = getClientCoords(event);
    return { x: (clientX - rect.left) / scale, y: (clientY - rect.top) / scale };
  };

  const isClosingLoopOrBorder = (x: number, y: number) => {
      const relX = x - BOARD_OFFSET, relY = y - BOARD_OFFSET, col = Math.floor(relX / hPitch), row = Math.floor(relY / vPitch), boardStartX = BOARD_OFFSET + (col * hPitch), boardStartY = BOARD_OFFSET + (row * vPitch);
      if (Math.abs(x - boardStartX) < 2.0 || Math.abs(x - (boardStartX + boardPixelWidth)) < 2.0 || Math.abs(y - boardStartY) < 2.0 || Math.abs(y - (boardStartX + boardPixelHeight)) < 2.0) return true;
      return lines.filter(l => l.isDeployment).some(l => (Math.abs(l.x1 - x) < 2.0 && Math.abs(l.y1 - y) < 2.0) || (Math.abs(l.x2 - x) < 2.0 && Math.abs(l.y2 - y) < 2.0));
  };

  useEffect(() => {
    const handleNativeWheel = (event: WheelEvent) => processWheelEvent(event);
    const container = containerRef.current?.parentElement; if (container) container.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => { if (container) container.removeEventListener('wheel', handleNativeWheel); };
  }, [processWheelEvent]);

  const elementsSortedByLayer = useMemo(() => [...elements].filter(element => isTerrainVisible || (element.type !== ElementType.TERRAIN && element.type !== ElementType.TEXT)).sort((a, b) => { const score = (t: ElementType) => t === ElementType.MODEL ? 3 : (t === ElementType.TEXT ? 2 : (t === ElementType.OBJECTIVE ? 1 : 0)); return score(a.type) - score(b.type); }), [elements, isTerrainVisible]);
  const selectionBounds = useMemo(() => { if (selectedIds.length <= 1) return null; let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, count = 0; selectedIds.forEach(id => { const el = elementMap.get(id); if (el) { minX = Math.min(minX, el.x); minY = Math.min(minY, el.y); maxX = Math.max(maxX, el.x + el.width); maxY = Math.max(maxY, el.y + el.height); count++; } }); return count > 1 ? { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY } : null; }, [selectedIds, elementMap]);

  const outOfCoherencyIds = useMemo(() => {
    if (!showCoherencyAlerts || elements.length === 0) return new Set<string>();
    const ids = new Set<string>(), models = elements.filter(e => e.type === ElementType.MODEL && e.groupId && e.currentWounds !== 0); if (models.length === 0) return ids;
    const isDragging = draggedElementId !== null, selectedGroupIds = isDragging ? new Set(selectedElements.map(e => e.groupId).filter(Boolean)) : null, groups: Record<string, BoardElement[]> = {};
    models.forEach(m => { if (isDragging && selectedGroupIds && !selectedGroupIds.has(m.groupId!)) return; if (!groups[m.groupId!]) groups[m.groupId!] = []; groups[m.groupId!].push(m); });
    Object.values(groups).forEach(group => {
        if (group.length < 2) return; const requiredNeighbors = group.length >= 7 ? 2 : 1, adjacency: Record<string, string[]> = {}; group.forEach(m => adjacency[m.id] = []);
        group.forEach(model => { const r1 = Math.max(model.width, model.height) / 2, x1 = model.x + model.width / 2, y1 = model.y + model.height / 2; let coherentNeighbors = 0; for (const other of group) { if (model.id === other.id) continue; const r2 = Math.max(other.width, other.height) / 2, dist = Math.hypot((other.x + other.width/2) - x1, (other.y + other.height/2) - y1); if ((dist - r1 - r2) <= 2 * pixelsPerInch) { coherentNeighbors++; adjacency[model.id].push(other.id); } } if (coherentNeighbors < requiredNeighbors) ids.add(model.id); });
        const visited = new Set<string>(), components: string[][] = []; group.forEach(start => { if (visited.has(start.id)) return; const comp: string[] = [], stack = [start.id]; visited.add(start.id); while (stack.length > 0) { const curr = stack.pop()!; comp.push(curr); (adjacency[curr] || []).forEach(n => { if (!visited.has(n)) { visited.add(n); stack.push(n); } }); } components.push(comp); });
        if (components.length > 1) { components.sort((a, b) => b.length - a.length); for (let i = 1; i < components.length; i++) components[i].forEach(id => ids.add(id)); }
    }); return ids;
  }, [elements, pixelsPerInch, showCoherencyAlerts, draggedElementId, selectedElements]);

  const handleRotationStart = (event: React.MouseEvent | React.TouchEvent | React.PointerEvent, element: BoardElement) => { 
      // Prevent Pointer events from interfering with Touch events logic
      if ('pointerType' in event && (event as React.PointerEvent).pointerType === 'touch') return;
      event.stopPropagation(); 
      if (element.locked) return; 
      onActionStart(); 
      if ('pointerId' in event && wrapperRef.current) wrapperRef.current.setPointerCapture((event as React.PointerEvent).pointerId);
      const coords = getBoardCoords(event), centerX = element.x + element.width / 2, centerY = element.y + element.height / 2; setRotationSnap({ startAngle: Math.atan2(coords.y - centerY, coords.x - centerX) * (180 / Math.PI), currentRotation: element.rotation, id: element.id }); setIsRotating(true); 
  };
  
  const handleResizeStart = (event: React.MouseEvent | React.TouchEvent | React.PointerEvent, handle: string, element: BoardElement) => { 
      // Prevent Pointer events from interfering with Touch events logic
      if ('pointerType' in event && (event as React.PointerEvent).pointerType === 'touch') return;
      event.stopPropagation(); 
      event.preventDefault(); 
      if (element.locked) return; 
      onActionStart(); 
      if ('pointerId' in event && wrapperRef.current) wrapperRef.current.setPointerCapture((event as React.PointerEvent).pointerId);
      const coords = getBoardCoords(event); 
      setResizeState({ 
          handle, 
          id: element.id,
          startMouseX: coords.x, 
          startMouseY: coords.y, 
          startWidth: element.width, 
          startHeight: element.height, 
          startX: element.x, 
          startY: element.y, 
          centerX: element.x + element.width / 2,
          centerY: element.y + element.height / 2,
          rotation: element.rotation 
      }); 
  };
  
  const handlePointerDown = (event: React.MouseEvent | React.TouchEvent | React.PointerEvent) => {
    // Prevent Pointer events from interfering with Touch events logic
    if ('pointerType' in event && (event as React.PointerEvent).pointerType === 'touch') return;

    // Pointer Capture for Mouse/Pen to handle dragging outside
    if ('pointerId' in event) {
         (event.currentTarget as Element).setPointerCapture((event as React.PointerEvent).pointerId);
    }

    if ('touches' in event && event.touches.length === 2) { 
        event.stopPropagation(); 
        lastTouchDistance.current = Math.hypot(event.touches[0].clientX - event.touches[1].clientX, event.touches[0].clientY - event.touches[1].clientY); 
        lastTouchCenter.current = { x: (event.touches[0].clientX + event.touches[1].clientX) / 2, y: (event.touches[0].clientY + event.touches[1].clientY) / 2 }; 
        setActiveDragMode(null);
        setDragStart(null);
        clickStartRef.current = null;
        setIsDrawing(false);
        setCurrentLine(null);
        setIsRotating(false);
        setIsGroupRotating(false);
        setRotationSnap(null);
        setResizeState(null);
        setSelectionBoxStart(null);
        setCurrentSelectionBox(null);
        setDraggedElementId(null);
        dragCollisionData.current = null;
        return; 
    }
    const isMiddleClick = 'button' in event && event.button === 1, isLeftClick = !('button' in event) || event.button === 0, isRightClick = 'button' in event && event.button === 2;
    if (isRightClick || (!isLeftClick && !isMiddleClick) || resizeState || isGroupRotating) return;
    const { x: clientX, y: clientY } = getClientCoords(event);
    clickStartRef.current = { x: clientX, y: clientY };

    if (mode === InteractionMode.PAN || isMiddleClick || (isLeftClick && isSpacePressed)) {
        setActiveDragMode('PAN'); setDragStart({ x: clientX - pan.x, y: clientY - pan.y }); return;
    }
    let coords = getBoardCoords(event);
    if (mode === InteractionMode.DEPLOYMENT) {
      event.stopPropagation(); coords = snapToGrid(coords.x, coords.y, pixelsPerInch, boardPixelWidth, boardPixelHeight, boardCount);
      if (isDrawing && currentLine) { onActionStart(); let { x: endX, y: endY } = coords; if ((event as React.MouseEvent).shiftKey) { const dx = Math.abs(endX - currentLine.x1), dy = Math.abs(endY - currentLine.y1); dx > dy ? (endY = currentLine.y1) : (endX = currentLine.x1); } const newLine = { ...currentLine, x2: endX, y2: endY } as DrawingLine; setLines(prev => [...prev, newLine]); if (isClosingLoopOrBorder(endX, endY)) { setIsDrawing(false); setCurrentLine(null); } else setCurrentLine({ x1: endX, y1: endY, x2: endX, y2: endY, color: activeColor, id: Math.random().toString(), isDeployment: true }); }
      else { onActionStart(); setIsDrawing(true); setCurrentLine({ x1: coords.x, y1: coords.y, x2: coords.x, y2: coords.y, color: activeColor, id: Math.random().toString(), isDeployment: true }); }
      return; 
    }
    if (mode === InteractionMode.DRAW || mode === InteractionMode.MEASURE || mode === InteractionMode.ARROW) { 
        onActionStart(); 
        setIsDrawing(true); 
        setCurrentLine({ 
            x1: coords.x, y1: coords.y, x2: coords.x, y2: coords.y, 
            color: activeColor, 
            id: Math.random().toString(36).substring(2, 11), 
            isDeployment: false,
            isArrow: mode === InteractionMode.ARROW
        }); 
        return; 
    }
    if (mode === InteractionMode.TEXT) {
        const clickedElement = [...elementsSortedByLayer].reverse().find(element => { 
            if (element.locked) return false; 
            return isPointInRotatedRect({ x: coords.x, y: coords.y }, { ...element, width: element.width, height: element.height }); 
        });
        if (clickedElement && clickedElement.type === ElementType.TEXT) {
             onActionStart();
             setSelectedIds([clickedElement.id]);
             
             // Initiate Drag
             setActiveDragMode('SELECT'); 
             setDragStart({ x: clientX, y: clientY }); 
             setDraggedElementId(clickedElement.id);
             
             // Setup initial positions for drag
             const positions: Record<string, {x: number, y: number}> = {};
             positions[clickedElement.id] = { x: clickedElement.x, y: clickedElement.y };
             setInitialElementPositions(positions);
             
             // Collision data (static empty for text usually, but needed for drag handler structure)
             dragCollisionData.current = { 
                 selected: [{ id: clickedElement.id, offsetX: clickedElement.width / 2, offsetY: clickedElement.height / 2, width: clickedElement.width, height: clickedElement.height, rotation: clickedElement.rotation }], 
                 static: [] 
             };
             
             return;
        }
    }
    if (mode === InteractionMode.SELECT) {
      const clickedElement = [...elementsSortedByLayer].reverse().find(element => { if ((element.type === ElementType.OBJECTIVE && !objectivesUnlocked) || (element.type === ElementType.TERRAIN && isTerrainLocked)) return false; return isPointInRotatedRect({ x: coords.x, y: coords.y }, { ...element, width: element.width + Math.max(0, 10 / scale), height: element.height + Math.max(0, 10 / scale) }); });
      if (isTabPressed && clickedElement && clickedElement.type === ElementType.MODEL && !('touches' in event) && clickedElement.stats) { onActionStart(); setElements(prev => prev.map(el => { if (el.id !== clickedElement.id) return el; const max = parseInt(el.stats?.w || '1') || 1, current = el.currentWounds ?? max, newWounds = current === 0 ? max : Math.max(0, current - 1); return { ...el, currentWounds: newWounds }; })); return; }
      if (clickedElement) {
        const now = Date.now(), isDoubleClick = clickedElement.id === lastClickId.current && (now - lastClickTime.current) < 300; lastClickTime.current = now; lastClickId.current = clickedElement.id; onActionStart(); 
        let newSelectedIds = [...selectedIds]; 
        const isMultiSelect = (event as React.MouseEvent).shiftKey || (event as React.MouseEvent).ctrlKey || (event as React.MouseEvent).metaKey;
        let wasDeselected = false;

        if (isDoubleClick) { 
            if (clickedElement.type === ElementType.TEXT) {
                setEditingId(clickedElement.id);
            }
            if (isMultiSelect && newSelectedIds.includes(clickedElement.id)) {
                newSelectedIds = newSelectedIds.filter(id => id !== clickedElement.id);
                wasDeselected = true;
            } else {
                newSelectedIds = isMultiSelect ? [...newSelectedIds, clickedElement.id] : [clickedElement.id];
            }
            newSelectedIds = enforceSelectionRules(Array.from(new Set(newSelectedIds)));
            setSelectedIds(newSelectedIds);
        }
        else { 
            let idsToToggle: string[];
            if (isMultiSelect && selectedIds.includes(clickedElement.id)) {
                idsToToggle = [clickedElement.id];
            } else {
                idsToToggle = clickedElement.groupId ? elements.filter(el => el.groupId === clickedElement.groupId).map(el => el.id) : [clickedElement.id];
            }

            if (isMultiSelect) { 
                const allTargetsSelected = idsToToggle.every(id => selectedIds.includes(id));
                if (allTargetsSelected) {
                    newSelectedIds = newSelectedIds.filter(id => !idsToToggle.includes(id));
                    wasDeselected = true;
                } else {
                    newSelectedIds = [...newSelectedIds, ...idsToToggle.filter(id => !selectedIds.includes(id))];
                }
                newSelectedIds = enforceSelectionRules(newSelectedIds);
                setSelectedIds(newSelectedIds); 
            } else if (!selectedIds.includes(clickedElement.id)) { 
                newSelectedIds = idsToToggle; 
                newSelectedIds = enforceSelectionRules(newSelectedIds);
                setSelectedIds(newSelectedIds); 
            } 
        }

        const effectiveSelection = (isDoubleClick || isMultiSelect || !selectedIds.includes(clickedElement.id)) ? newSelectedIds : selectedIds;

        if (!wasDeselected && !effectiveSelection.some(id => elementMap.get(id)?.locked)) { 
            setActiveDragMode('SELECT'); 
            setDragStart({ x: clientX, y: clientY }); 
            setDraggedElementId(clickedElement.id); 
            const positions: Record<string, {x: number, y: number}> = {}; 
            elements.forEach(el => { if (effectiveSelection.includes(el.id)) positions[el.id] = { x: el.x, y: el.y }; }); 
            setInitialElementPositions(positions); 
            const selectedModels = elements.filter(el => effectiveSelection.includes(el.id) && el.type === ElementType.MODEL), staticModels = elements.filter(el => !effectiveSelection.includes(el.id) && el.type === ElementType.MODEL); 
            dragCollisionData.current = { selected: selectedModels.map(el => ({ id: el.id, offsetX: el.width / 2, offsetY: el.height / 2, width: el.width, height: el.height, rotation: el.rotation })), static: staticModels.map(el => ({ x: el.x + el.width / 2, y: el.y + el.height / 2, width: el.width, height: el.height, rotation: el.rotation })) }; 
        }
        else setActiveDragMode(null);
      } else { lastClickId.current = null; if (!(event as React.MouseEvent).shiftKey && !(event as React.MouseEvent).ctrlKey && !(event as React.MouseEvent).metaKey) setSelectedIds([]); setSelectionBoxStart({ x: coords.x, y: coords.y }); setCurrentSelectionBox({ x: coords.x, y: coords.y, width: 0, height: 0 }); }
    }
  };

  const handlePointerMove = (event: React.MouseEvent | React.TouchEvent | React.PointerEvent) => {
    // Prevent Pointer events from interfering with Touch events logic
    if ('pointerType' in event && (event as React.PointerEvent).pointerType === 'touch') return;

    if ('touches' in event && event.touches.length === 2) {
        event.stopPropagation();
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        const currentDistance = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
        const currentCenter = { x: (touch1.clientX + touch2.clientX) / 2, y: (touch1.clientY + touch2.clientY) / 2 };
        
        if (lastTouchDistance.current !== null && lastTouchCenter.current !== null) {
            const currentScale = scaleRef.current;
            const currentPan = panRef.current;
            
            const zoomFactor = currentDistance / lastTouchDistance.current;
            const newScale = Math.min(Math.max(0.1, currentScale * zoomFactor), 5);
            
            const dx = currentCenter.x - lastTouchCenter.current.x;
            const dy = currentCenter.y - lastTouchCenter.current.y;
            
            const newPanX = currentCenter.x - (currentCenter.x - currentPan.x) * (newScale / currentScale) + dx;
            const newPanY = currentCenter.y - (currentCenter.y - currentPan.y) * (newScale / currentScale) + dy;
            
            setScale(newScale);
            setPan({ x: newPanX, y: newPanY });
            scaleRef.current = newScale;
            panRef.current = { x: newPanX, y: newPanY };
            if (onInteraction) onInteraction();
        }
        
        lastTouchDistance.current = currentDistance;
        lastTouchCenter.current = currentCenter;
        return;
    }

    const { x: clientX, y: clientY } = getClientCoords(event), shiftKey = 'shiftKey' in event ? event.shiftKey : false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
        if (!containerRef.current) return; const rect = containerRef.current.getBoundingClientRect(), coords = { x: (clientX - rect.left) / scale, y: (clientY - rect.top) / scale };
        setCursorPos(prev => { if (prev && Math.abs(prev.x - coords.x) < 0.5 && Math.abs(prev.y - coords.y) < 0.5) return prev; return coords; });
        if (activeDragMode === 'PAN' && dragStart) { setPan({ x: clientX - dragStart.x, y: clientY - dragStart.y }); if (onInteraction) onInteraction(); return; }
        if (mode === InteractionMode.SELECT && selectionBoxStart && !draggedElementId) { const w = coords.x - selectionBoxStart.x, h = coords.y - selectionBoxStart.y, newBox = { x: w < 0 ? coords.x : selectionBoxStart.x, y: h < 0 ? coords.y : selectionBoxStart.y, width: Math.abs(w), height: Math.abs(h) }; setCurrentSelectionBox(prev => { if (prev && Math.abs(prev.x - newBox.x) < 1 && Math.abs(prev.y - newBox.y) < 1 && Math.abs(prev.width - newBox.width) < 1 && Math.abs(prev.height - newBox.height) < 1) return prev; return newBox; }); }
        if (activeDragMode === 'SELECT' && draggedElementId && dragCollisionData.current) { const dx = (clientX - (dragStart?.x || 0)) / scale, dy = (clientY - (dragStart?.y || 0)) / scale, isTerrainSelection = selectedElements.length > 0 && selectedElements.every(e => e.type === ElementType.TERRAIN); setElements(prev => prev.map(el => { if (initialElementPositions[el.id]) { let newX = initialElementPositions[el.id].x + dx, newY = initialElementPositions[el.id].y + dy; if (el.type === ElementType.OBJECTIVE) { const snapped = snapToGrid(newX + el.width/2, newY + el.height/2, pixelsPerInch, boardPixelWidth, boardPixelHeight, boardCount); newX = snapped.x - el.width/2; newY = snapped.y - el.height/2; } else if (isTerrainSelection && shiftKey && el.type === ElementType.TERRAIN) { const snapped = snapToGrid(newX + el.width/2, newY + el.height/2, pixelsPerInch, boardPixelWidth, boardPixelHeight, boardCount, 0.5); newX = snapped.x - el.width/2; newY = snapped.y - el.height/2; } return { ...el, x: newX, y: newY }; } return el; })); if (onInteraction) onInteraction(); }
        if ((mode === InteractionMode.DRAW || mode === InteractionMode.MEASURE || mode === InteractionMode.DEPLOYMENT || mode === InteractionMode.ARROW) && isDrawing && currentLine) { let targetX = coords.x, targetY = coords.y; if (mode === InteractionMode.DEPLOYMENT) { const snapped = snapToGrid(coords.x, coords.y, pixelsPerInch, boardPixelWidth, boardPixelHeight, boardCount); targetX = snapped.x; targetY = snapped.y; if (shiftKey) { const dx = Math.abs(targetX - currentLine.x1), dy = Math.abs(targetY - currentLine.y1); dx > dy ? (targetY = currentLine.y1) : (targetX = currentLine.x1); } } setCurrentLine(prev => { if (prev && Math.abs(prev.x2 - targetX) < 0.1 && Math.abs(prev.y2 - targetY) < 0.1) return prev; return { ...prev!, x2: targetX, y2: targetY } as DrawingLine; }); if (mode === InteractionMode.MEASURE) setIntersectedIds(prev => { const ni = checkLineElementIntersections({x: currentLine.x1, y: currentLine.y1}, {x: targetX, y: targetY}, elements); return (prev.length === ni.length && prev.every((id, i) => id === ni[i])) ? prev : ni; }); }
        if (isRotating && rotationSnap && rotationSnap.id) { const activeId = rotationSnap.id, el = elementMap.get(activeId); if (el) { const rads = Math.atan2(coords.y - (el.y + el.height/2), coords.x - (el.x + el.width/2)), deg = rads * (180 / Math.PI), delta = deg - rotationSnap.startAngle; let newRot = (rotationSnap.currentRotation + delta) % 360; if ((el.type === ElementType.TERRAIN || el.type === ElementType.TEXT) && shiftKey) newRot = Math.round(newRot / 15) * 15; setElements(prev => prev.map(e => e.id === activeId ? { ...e, rotation: newRot } : e)); } }
        if (isGroupRotating && rotationSnap && onGroupRotate) { const centerX = rotationSnap.center ? rotationSnap.center.x : (selectionBounds ? selectionBounds.minX + selectionBounds.width/2 : 0), centerY = rotationSnap.center ? rotationSnap.center.y : (selectionBounds ? selectionBounds.minY + selectionBounds.height/2 : 0), rads = Math.atan2(coords.y - centerY, coords.x - centerX), deg = rads * (180 / Math.PI); let delta = deg - rotationSnap.startAngle; const isTerrainOnly = selectedIds.length > 0 && selectedIds.every(id => elementMap.get(id)?.type === ElementType.TERRAIN); if (isTerrainOnly && shiftKey) delta = Math.round(delta / 15) * 15; onGroupRotate(delta); }
        if (resizeState) { 
            const { handle, id, startWidth, startHeight, centerX, centerY, rotation } = resizeState;
            const element = elementMap.get(id); 
            if (element && (element.type === ElementType.TERRAIN || element.type === ElementType.TEXT)) { 
                const { width: newW, height: newH } = calculateResizeDimensions(handle, coords.x, coords.y, centerX, centerY, startWidth, startHeight, rotation);
                setElements(prev => prev.map(e => e.id === id ? { 
                    ...e, 
                    x: centerX - newW / 2, 
                    y: centerY - newH / 2, 
                    width: newW, 
                    height: newH 
                } : e)); 
            } 
        }
    });
  };

  const handlePointerUp = (event: React.MouseEvent | React.TouchEvent | React.PointerEvent) => {
    // Prevent Pointer events from interfering with Touch events logic
    if ('pointerType' in event && (event as React.PointerEvent).pointerType === 'touch') return;

    if ('pointerId' in event) {
         (event.currentTarget as Element).releasePointerCapture((event as React.PointerEvent).pointerId);
    }

    if (lastTouchDistance.current !== null) {
        lastTouchDistance.current = null;
        lastTouchCenter.current = null;
        clickStartRef.current = null;
        return;
    }

    const { x: clientX, y: clientY } = getClientCoords(event);
    const coords = getBoardCoords(event);
    
    // Check for drag or pan to prevent accidental text creation
    const dist = clickStartRef.current ? Math.hypot(clientX - clickStartRef.current.x, clientY - clickStartRef.current.y) : 0;
    const isClick = dist < 5 && clickStartRef.current !== null;
    const wasPanning = activeDragMode === 'PAN';

    // Capture dragging state before cleanup for text mode logic
    const wasDraggingText = mode === InteractionMode.TEXT && activeDragMode === 'SELECT' && draggedElementId;
    const currentDraggedId = draggedElementId;

    if (activeDragMode === 'PAN') { setActiveDragMode(null); setDragStart(null); }
    if (activeDragMode === 'SELECT' && selectedIds.length > 0 && draggedElementId) {
        setElements(prev => { const movingIds = selectedIds, staticEls = prev.filter(e => !movingIds.includes(e.id)), movingModels = prev.filter(e => movingIds.includes(e.id) && e.type === ElementType.MODEL); if (movingModels.length === 0) return prev; const offset = findSafeGroupPosition(movingModels, staticEls, 0); if (offset === null) return prev.map(e => (movingIds.includes(e.id) && initialElementPositions[e.id]) ? { ...e, x: initialElementPositions[e.id].x, y: initialElementPositions[e.id].y } : e); if (Math.abs(offset.x) < 0.1 && Math.abs(offset.y) < 0.1) return prev; return prev.map(e => movingIds.includes(e.id) ? { ...e, x: e.x + offset.x, y: e.y + offset.y } : e); }); setActiveDragMode(null); setDragStart(null); setDraggedElementId(null); dragCollisionData.current = null;
    }
    if (resizeState) setResizeState(null); if (isRotating) { setIsRotating(false); setRotationSnap(null); } if (isGroupRotating) { setIsGroupRotating(false); setRotationSnap(null); if (onGroupRotationEnd) onGroupRotationEnd(); }
    if (mode === InteractionMode.SELECT && selectionBoxStart) { 
        const box = { x: Math.min(selectionBoxStart.x, coords.x), y: Math.min(selectionBoxStart.y, coords.y), w: Math.abs(coords.x - selectionBoxStart.x), h: Math.abs(coords.y - selectionBoxStart.y) }; 
        if (box.w > 5 || box.h > 5) { 
            const hits = elementsSortedByLayer.filter(el => { if (el.locked || (el.type === ElementType.TERRAIN && isTerrainLocked) || (el.type === ElementType.OBJECTIVE && !objectivesUnlocked) || el.type === ElementType.TEXT) return false; const corners = ((e: BoardElement) => { const cx = e.x + e.width / 2, cy = e.y + e.height / 2, w = e.width / 2, h = e.height / 2, rad = (e.rotation * Math.PI) / 180, cos = Math.cos(rad), sin = Math.sin(rad), corners = [{ x: -w, y: -h }, { x: w, y: -h }, { x: w, y: h }, { x: -w, y: h }]; return corners.map(p => ({ x: cx + (p.x * cos - p.y * sin), y: cy + (p.x * sin + p.y * cos) })); })(el), minX = Math.min(...corners.map(p => p.x)), maxX = Math.max(...corners.map(p => p.x)), minY = Math.min(...corners.map(p => p.y)), maxY = Math.max(...corners.map(p => p.y)); return (minX < box.x + box.w && maxX > box.x && minY < box.y + box.h && maxY > box.y); }).map(e => e.id); 
            if (hits.length > 0) { 
                onActionStart(); 
                const isMulti = (event as React.MouseEvent).shiftKey || (event as React.MouseEvent).ctrlKey || (event as React.MouseEvent).metaKey; 
                let nextIds = isMulti ? Array.from(new Set([...selectedIds, ...hits])) : hits;
                nextIds = enforceSelectionRules(nextIds);
                setSelectedIds(nextIds); 
            } 
        } 
        setSelectionBoxStart(null); 
        setCurrentSelectionBox(null); 
    }
    if (isDrawing && currentLine && mode !== InteractionMode.DEPLOYMENT) { setIsDrawing(false); if ((mode === InteractionMode.DRAW || mode === InteractionMode.ARROW) && Math.hypot(currentLine.x2 - currentLine.x1, currentLine.y2 - currentLine.y1) > 0.1) setLines(prev => [...prev, currentLine as DrawingLine]); setCurrentLine(null); setIntersectedIds([]); }
    
    // Create text element or edit existing if mode is TEXT
    if (mode === InteractionMode.TEXT && !isRotating && !wasPanning && isClick) {
        if (wasDraggingText && currentDraggedId) {
             // We clicked on an existing text element (drag initiated but not moved much)
             setEditingId(currentDraggedId);
        } else if (!wasDraggingText && !isDrawing && !draggedElementId) {
             // We clicked empty space
             if (selectedIds.length > 0) {
                 // Deselect if anything is selected
                 setSelectedIds([]);
                 setEditingId(null);
             } else {
                 // Create new text only if nothing is selected and valid space
                 const hasOverlap = elementsSortedByLayer.some(el => isPointInRotatedRect({ x: coords.x, y: coords.y }, el));
                 if (!hasOverlap) {
                    onActionStart();
                    const newText: BoardElement = {
                        id: Math.random().toString(36).substring(2, 11),
                        type: ElementType.TEXT,
                        x: coords.x - 100, // Centered on click roughly
                        y: coords.y - 25,
                        width: 200,
                        height: 100, // Default box size
                        rotation: 0,
                        label: "Double-click to edit text",
                        color: activeColor,
                        locked: false
                    };
                    setElements(prev => [...prev, newText]);
                    setEditingId(newText.id);
                    setSelectedIds([newText.id]);
                 }
             }
        }
    }

    lastTouchDistance.current = null; lastTouchCenter.current = null; 
    clickStartRef.current = null; // Clear click start
  };

  const snappedCursor = cursorPos ? snapToGrid(cursorPos.x, cursorPos.y, pixelsPerInch, boardPixelWidth, boardPixelHeight, boardCount) : null;
  const isClosingLoop = snappedCursor ? isClosingLoopOrBorder(snappedCursor.x, snappedCursor.y) : false, gridSize = pixelsPerInch, counterScale = 1 / Math.max(scale, 0.1);
  
  const zoneWidth = 24 * pixelsPerInch;
  const zoneHeight = 12 * pixelsPerInch;
  const zoneGap = 4 * pixelsPerInch;
  const totalZonesWidth = (zoneWidth * 2) + zoneGap;
  const marginX = (boardPixelWidth - totalZonesWidth) / 2;
  const zoneRelativeY = boardPixelHeight + (2 * pixelsPerInch);
  const relativeLeftZoneX = marginX;
  const relativeRightZoneX = marginX + zoneWidth + zoneGap;

  return (
    <div 
      ref={wrapperRef}
      className="w-full h-full bg-grim-900 overflow-hidden relative select-none"
      onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}
      onTouchStart={handlePointerDown} onTouchMove={handlePointerMove} onTouchEnd={handlePointerUp}
      onContextMenu={(event) => { event.preventDefault(); if (isDrawing && mode === InteractionMode.DEPLOYMENT) { setIsDrawing(false); setCurrentLine(null); } else onRightClick(); }}
      style={{ cursor: (mode === InteractionMode.PAN || activeDragMode === 'PAN' || isSpacePressed) ? (activeDragMode === 'PAN' ? 'grabbing' : 'grab') : (mode === InteractionMode.TEXT ? 'text' : 'default'), touchAction: 'none' }}
    >
      <div 
        ref={containerRef}
        className="absolute origin-top-left will-change-transform"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, width: '5000px', height: '5000px', transition: isAdjustingPan ? 'transform 300ms ease-out' : undefined }}
      >
        <svg className="absolute inset-0 pointer-events-none opacity-10" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="globalGridPattern" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse" x={BOARD_OFFSET} y={BOARD_OFFSET}><path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} fill="none" stroke="#475569" strokeWidth="1"/></pattern></defs><rect width="100%" height="100%" fill="url(#globalGridPattern)" /></svg>
        {Array.from({ length: boardCount }).map((_, boardIndex) => {
            const col = boardIndex % 3, row = Math.floor(boardIndex / 3), offX = BOARD_OFFSET + (col * hPitch), offY = BOARD_OFFSET + (row * vPitch);
            return (
                <React.Fragment key={boardIndex}>
                    <div className="absolute ring-2 ring-grim-gold bg-grim-800/20 shadow-2xl" style={{ left: offX, top: offY, width: boardPixelWidth, height: boardPixelHeight }}>
                        {backgroundImage && <img src={backgroundImage} alt="Battlefield" className="w-full h-full object-cover opacity-80 pointer-events-none select-none" />}
                        <svg className="absolute inset-0 pointer-events-none opacity-20" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><defs><pattern id={`boardGridPattern-${boardIndex}`} width={gridSize} height={gridSize} patternUnits="userSpaceOnUse"><path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} fill="none" stroke="#94a3b8" strokeWidth="1"/></pattern></defs><rect width="100%" height="100%" fill={`url(#boardGridPattern-${boardIndex})`} /></svg>
                        
                        <div className="absolute bottom-full left-0 mb-2 bg-grim-900/90 border border-grim-700/80 text-grim-gold text-[10px] font-mono font-bold px-3 py-1 rounded-sm shadow-[0_0_15px_rgba(0,0,0,0.5)] pointer-events-none select-none z-10 backdrop-blur-sm flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-grim-gold animate-pulse"></div>
                            <span>BATTLEFIELD {boardIndex + 1}</span>
                        </div>
                    </div>
                    <div className="absolute bg-red-900/20 border-2 border-dashed border-red-800 flex items-center justify-center pointer-events-none" style={{ left: offX + relativeLeftZoneX, top: offY + zoneRelativeY, width: zoneWidth, height: zoneHeight }}>{boardIndex === 0 && <div className="text-red-500/50 font-bold uppercase tracking-[0.2em] text-2xl flex items-center gap-4"><Flag size={32} /> Attacker Muster</div>}</div>
                    <div className="absolute bg-blue-900/20 border-2 border-dashed border-blue-800 flex items-center justify-center pointer-events-none" style={{ left: offX + relativeRightZoneX, top: offY + zoneRelativeY, width: zoneWidth, height: zoneHeight }}>{boardIndex === 0 && <div className="text-blue-500/50 font-bold uppercase tracking-[0.2em] text-2xl flex items-center gap-4"><Flag size={32} /> Defender Muster</div>}</div>
                </React.Fragment>
            );
        })}
        <div style={{ transform: `translate(${BOARD_OFFSET}px, ${BOARD_OFFSET}px)`, width: '100%', height: '100%', pointerEvents: 'none' }}>
            <svg className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-visible z-0">
            {areZonesVisible && zones.map(zone => <polygon key={zone.id} points={zone.points.map(p => `${p.x - BOARD_OFFSET},${p.y - BOARD_OFFSET}`).join(' ')} fill={zone.color} stroke={zone.color.replace('0.3)', '0.8)')} strokeWidth={2 * lineScale} className="pointer-events-none" />)}
            {elements.map(el => el.type === ElementType.OBJECTIVE && <circle key={`obj-aura-${el.id}`} cx={el.x + el.width/2 - BOARD_OFFSET} cy={el.y + el.height/2 - BOARD_OFFSET} r={el.width/2 + (3 * pixelsPerInch)} fill="rgba(34, 197, 94, 0.1)" stroke="rgba(34, 197, 94, 0.5)" strokeWidth={2 * lineScale} strokeDasharray="5,5" className="pointer-events-none opacity-50" />)}
            {auraRadius !== null && selectedElements.map(el => el.type === ElementType.MODEL && el.currentWounds !== 0 && <circle key={`aura-${el.id}`} cx={el.x - BOARD_OFFSET + el.width/2} cy={el.y - BOARD_OFFSET + el.height/2} r={Math.max(el.width, el.height)/2 + (auraRadius * pixelsPerInch)} fill="none" stroke="#2dd4bf" strokeWidth={2 * lineScale} strokeDasharray="8 4" className="pointer-events-none opacity-80" />)}
            </svg>
            {elementsSortedByLayer.map(element => {
                const buffer = 500, viewMinX = (0 - pan.x) / scale - buffer, viewMinY = (0 - pan.y) / scale - buffer, viewMaxX = (window.innerWidth - pan.x) / scale + buffer, viewMaxY = (window.innerHeight - pan.y) / scale + buffer;
                const isSelected = selectedIdSet.has(element.id); if (!isSelected && draggedElementId !== element.id && (element.x + element.width < viewMinX || element.x > viewMaxX || element.y + element.height < viewMinY || element.y > viewMaxY)) return null;
                const isHovered = (hoveredElement?.id === element.id) || (hoveredElement?.groupId && hoveredElement.groupId === element.groupId && hoveredElement.groupId !== undefined);
                const isEditing = editingId === element.id;
                
                // Show label only for non-Model types (like Text, Objectives) that handle their own internal labels or need a generic label.
                // Models now use the activeLabelOverlays system for collision-resolved labels.
                const showLabel = (
                    element.type !== ElementType.MODEL && 
                    element.type !== ElementType.OBJECTIVE && 
                    element.type !== ElementType.TERRAIN && 
                    element.type !== ElementType.TEXT
                );

                const containerZIndex = draggedElementId === element.id 
                    ? 1500 
                    : (isSelected 
                        ? (showLabel ? 250 : 200) 
                        : 190);

                return (
                    <React.Fragment key={element.id}>
                        <BoardElementItem 
                            element={element} isSelected={isSelected} isDragged={draggedElementId === element.id} isHovered={isHovered} 
                            isSidebarHovered={sidebarHoveredId === element.id} isIntersected={intersectedIds.includes(element.id)} 
                            isCoherencyBroken={showCoherencyAlerts && element.type === ElementType.MODEL && element.currentWounds !== 0 && outOfCoherencyIds.has(element.id)} 
                            mode={mode} isTerrainLocked={isTerrainLocked} objectivesUnlocked={objectivesUnlocked} labelFontSize={labelFontSize} 
                            onContextMenu={(e: any, id: string) => { e.preventDefault(); if (selectedIdSet.has(id) && selectedIdSet.size > 1) { e.stopPropagation(); setSelectedIds([id]); } }} 
                            handleRotationStart={handleRotationStart} handleResizeStart={handleResizeStart} setHoveredElement={handleSetHoveredElement} 
                            lineScale={lineScale} isMultiSelection={selectedIdSet.size > 1}
                            isEditing={isEditing} onTextChange={handleTextChange} onTextBlur={handleTextBlur}
                        />
                        <div className={`absolute pointer-events-none ${draggedElementId === element.id ? '' : 'transition-opacity duration-300 ease-out'}`} style={{ left: element.x - BOARD_OFFSET, top: element.y - BOARD_OFFSET, width: element.width, height: element.height, zIndex: containerZIndex }}>
                            {showLabel && (() => {
                                const text = element.label;
                                const w = (text.length * (labelFontSize * 0.6) + 16) / scale;
                                const h = (labelFontSize + 10) / scale;
                                const cx = element.x + element.width / 2;
                                const bottomY = element.y - (10 / scale);
                                const isHovered = cursorPos && 
                                    cursorPos.x >= cx - w/2 && cursorPos.x <= cx + w/2 &&
                                    cursorPos.y >= bottomY - h && cursorPos.y <= bottomY;

                                return (
                                    <div className={`absolute bg-grim-gold text-grim-900 px-1.5 py-0.5 rounded font-bold pointer-events-none whitespace-nowrap z-30 shadow-[0_4px_4px_rgba(0,0,0,0.5)] border border-grim-900/50 transition-opacity duration-200 ${isHovered ? 'opacity-25' : 'opacity-100'}`} style={{ left: '50%', bottom: '100%', marginBottom: `${10 * counterScale}px`, transform: `translateX(-50%) scale(${counterScale})`, transformOrigin: 'bottom center', fontSize: `${labelFontSize}px` }}>{element.label}</div>
                                );
                            })()}
                            {showCoherencyAlerts && element.type === ElementType.MODEL && element.currentWounds !== 0 && outOfCoherencyIds.has(element.id) && (() => {
                                const text = "BREAKING COHERENCY";
                                const w = (text.length * (labelFontSize * 0.8 * 0.6) + 10) / scale; // 0.8 size factor
                                const h = (labelFontSize * 0.8 + 10) / scale;
                                const cx = element.x + element.width / 2;
                                const topY = element.y + element.height + (10 / scale);
                                const isHovered = cursorPos && 
                                    cursorPos.x >= cx - w/2 && cursorPos.x <= cx + w/2 &&
                                    cursorPos.y >= topY && cursorPos.y <= topY + h;

                                return (
                                    <div className={`absolute bg-red-600 text-white px-1 py-0.5 rounded font-bold pointer-events-none whitespace-nowrap z-30 animate-pulse transition-opacity duration-200 ${isHovered ? 'opacity-25' : 'opacity-100'}`} style={{ left: '50%', top: '100%', marginTop: `${10 * counterScale}px`, transform: `translateX(-50%) scale(${counterScale})`, transformOrigin: 'top center', fontSize: `${labelFontSize * 0.8}px` }}>BREAKING COHERENCY</div>
                                );
                            })()}
                        </div>
                    </React.Fragment>
                );
            })}
            
            {/* Deduplicated & Resolved Active Labels (Selected or Hovered) */}
            {activeLabelOverlays.map(overlay => {
                const verticalOffset = 10 / scale;
                const isLabelHovered = cursorPos && 
                    cursorPos.x >= overlay.x - overlay.width / 2 &&
                    cursorPos.x <= overlay.x + overlay.width / 2 &&
                    cursorPos.y >= overlay.y - overlay.height - verticalOffset &&
                    cursorPos.y <= overlay.y - verticalOffset;

                return (
                    <div 
                        key={overlay.key}
                        className={`absolute bg-grim-gold text-grim-900 px-1.5 py-0.5 rounded font-bold pointer-events-none whitespace-nowrap z-[200] shadow-[0_4px_4px_rgba(0,0,0,0.5)] border border-grim-900/50 transition-opacity duration-200 ${isLabelHovered ? 'opacity-25' : 'opacity-100'}`}
                        style={{
                            left: overlay.x - BOARD_OFFSET,
                            top: overlay.y - BOARD_OFFSET,
                            transform: `translate(-50%, -100%) translateY(-${10 * counterScale}px) scale(${counterScale})`,
                            transformOrigin: 'bottom center',
                            fontSize: `${labelFontSize}px`
                        }}
                    >
                        {overlay.text}
                    </div>
                );
            })}

            <svg className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-visible z-[300]">
            {lines.map(line => {
                const x1 = line.x1 - BOARD_OFFSET, y1 = line.y1 - BOARD_OFFSET, x2 = line.x2 - BOARD_OFFSET, y2 = line.y2 - BOARD_OFFSET, dist = Math.hypot(line.x2 - line.x1, line.y2 - line.y1);
                const angle = Math.atan2(y2 - y1, x2 - x1);
                const arrowheadSize = 10 * lineScale;
                return (
                <g key={line.id}>
                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={line.color} strokeWidth={4 * lineScale} strokeLinecap="round" className="opacity-70" />
                    {line.isArrow && (
                        <polygon 
                            points={`0,0 ${-arrowheadSize},-5 ${-arrowheadSize},5`} 
                            transform={`translate(${x2},${y2}) rotate(${angle * 180 / Math.PI})`} 
                            fill={line.color} 
                            className="opacity-70"
                        />
                    )}
                    {(!line.isDeployment || mode === InteractionMode.DEPLOYMENT) && ( <g transform={`translate(${(x1 + x2) / 2}, ${(y1 + y2) / 2}) scale(${counterScale})`}><text x="0" y="0" fill="white" className="font-bold font-mono drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]" textAnchor="middle" dy="-8" style={{ fontSize: `${labelFontSize}px` }}>{(dist / pixelsPerInch).toFixed(1)}"</text></g>)}
                </g>
            )})}
            {currentLine && currentLine.x1 !== undefined && (() => {
                const x1 = currentLine.x1 - BOARD_OFFSET, y1 = currentLine.y1 - BOARD_OFFSET, x2 = (currentLine.x2 || 0) - BOARD_OFFSET, y2 = (currentLine.y2 || 0) - BOARD_OFFSET;
                const angle = Math.atan2(y2 - y1, x2 - x1);
                const arrowheadSize = 10 * lineScale;
                return (
                    <g>
                        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={currentLine.color} strokeWidth={mode === InteractionMode.MEASURE ? (2 * lineScale) : (4 * lineScale)} strokeDasharray={mode === InteractionMode.MEASURE ? "5,5" : "0"} className="opacity-80" />
                        {currentLine.isArrow && (
                            <polygon 
                                points={`0,0 ${-arrowheadSize},-5 ${-arrowheadSize},5`} 
                                transform={`translate(${x2},${y2}) rotate(${angle * 180 / Math.PI})`} 
                                fill={currentLine.color} 
                                className="opacity-80"
                            />
                        )}
                        <g transform={`translate(${(x1 + x2) / 2}, ${(y1 + y2) / 2}) scale(${counterScale})`}>
                            <text x="0" y="0" fill="white" className="font-bold font-mono drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]" textAnchor="middle" dy="-10" style={{ fontSize: `${labelFontSize}px` }}>{(Math.hypot(x2 - x1, y2 - y1) / pixelsPerInch).toFixed(1)}"</text>
                        </g>
                    </g>
                );
            })()}
            {currentSelectionBox && <rect x={currentSelectionBox.x - BOARD_OFFSET} y={currentSelectionBox.y - BOARD_OFFSET} width={currentSelectionBox.width} height={currentSelectionBox.height} fill="rgba(251, 191, 36, 0.1)" stroke="rgba(251, 191, 36, 0.8)" strokeWidth={1 * lineScale} strokeDasharray="4 2" />}
            {draggedElementId && initialElementPositions[draggedElementId] && (() => { const el = elementMap.get(draggedElementId); if (!el) return null; const sx = initialElementPositions[draggedElementId].x + el.width/2 - BOARD_OFFSET, sy = initialElementPositions[draggedElementId].y + el.height/2 - BOARD_OFFSET, ex = el.x + el.width/2 - BOARD_OFFSET, ey = el.y + el.height/2 - BOARD_OFFSET; return (<g><line x1={sx} y1={sy} x2={ex} y2={ey} stroke="white" strokeWidth={2 * lineScale} strokeDasharray="5,5" className="opacity-80" /><g transform={`translate(${(sx+ex)/2}, ${(sy+ey)/2}) scale(${counterScale})`}><text x="0" y="0" fill="white" className="font-bold font-mono drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]" textAnchor="middle" dy="-10" style={{ fontSize: `${labelFontSize}px` }}>{(Math.hypot(el.x - initialElementPositions[draggedElementId].x, el.y - initialElementPositions[draggedElementId].y) / pixelsPerInch).toFixed(1)}"</text></g></g>); })()}
            {showEdgeMeasurements && cursorPos && (() => { const relX = cursorPos.x - BOARD_OFFSET, relY = cursorPos.y - BOARD_OFFSET, col = Math.floor(relX / hPitch), row = Math.floor(relY / vPitch), boardIdx = row * 3 + col; if (col < 0 || col > 2 || row < 0 || boardIdx >= boardCount) return null; const bounds = getBoardBoundsForPoint(cursorPos.x, cursorPos.y), linesToDraw = [{ x1: cursorPos.x, y1: cursorPos.y, x2: bounds.minX, y2: cursorPos.y }, { x1: cursorPos.x, y1: cursorPos.y, x2: bounds.maxX, y2: cursorPos.y }, { x1: cursorPos.x, y1: cursorPos.y, x2: cursorPos.x, y2: bounds.minY }, { x1: cursorPos.x, y1: cursorPos.y, x2: cursorPos.x, y2: bounds.maxY }]; return linesToDraw.map((l, i) => { const dist = Math.hypot(l.x2 - l.x1, l.y2 - l.y1) / pixelsPerInch; if (dist < 0.1) return null; return ( <g key={`edge-${i}`}><line x1={l.x1 - BOARD_OFFSET} y1={l.y1 - BOARD_OFFSET} x2={l.x2 - BOARD_OFFSET} y2={l.y2 - BOARD_OFFSET} stroke="#22d3ee" strokeWidth={2 * lineScale} strokeDasharray="4 4" opacity="0.8" /><g transform={`translate(${(l.x1 + l.x2)/2 - BOARD_OFFSET}, ${(l.y1 + l.y2)/2 - BOARD_OFFSET}) scale(${counterScale})`}><text fill="#22d3ee" className="font-mono font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" textAnchor="middle" dy={Math.abs(l.y2 - l.y1) < 1 ? -6 : 4} dx={Math.abs(l.x2 - l.x1) < 1 ? 6 : 0} style={{ fontSize: `${labelFontSize}px` }}>{dist.toFixed(1)}"</text></g></g>); }); })()}
            {elements.map(el => { if (el.type !== ElementType.OBJECTIVE || !selectedIdSet.has(el.id)) return null; const cx = el.x + el.width/2, cy = el.y + el.height/2, bounds = getBoardBoundsForPoint(cx, cy), dL = cx - bounds.minX, dR = bounds.maxX - cx, dT = cy - bounds.minY, dB = bounds.maxY - cy, showL = dL <= dR + 0.1, showR = dR <= dL + 0.1, showT = dT <= dB + 0.1, showB = dB <= dT + 0.1, ltd = []; if (showL) ltd.push({ x1: cx, y1: cy, x2: bounds.minX, y2: cy }); if (showR) ltd.push({ x1: cx, y1: cy, x2: bounds.maxX, y2: cy }); if (showT) ltd.push({ x1: cx, y1: cy, x2: cx, y2: bounds.minY }); if (showB) ltd.push({ x1: cx, y1: cy, x2: cx, y2: bounds.maxY }); return (<g key={`obj-meas-${el.id}`}>{ltd.map((d, i) => { const dist = Math.hypot(d.x2 - d.x1, d.y2 - d.y1) / pixelsPerInch; return (<React.Fragment key={i}><line x1={d.x1 - BOARD_OFFSET} y1={d.y1 - BOARD_OFFSET} x2={d.x2 - BOARD_OFFSET} y2={d.y2 - BOARD_OFFSET} stroke="rgba(251, 191, 36, 0.6)" strokeWidth={2 * lineScale} strokeDasharray="3 3" /><g transform={`translate(${(d.x1 + d.x2)/2 - BOARD_OFFSET}, ${(d.y1 + d.y2)/2 - BOARD_OFFSET}) scale(${counterScale})`}><text fill="#fbbf24" className="font-mono font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" textAnchor="middle" dy={Math.abs(d.y2 - d.y1) < 1 ? -6 : 4} dx={Math.abs(d.x2 - d.x1) < 1 ? 6 : 0} style={{ fontSize: `${labelFontSize}px` }}>{dist.toFixed(1)}"</text></g></React.Fragment>); })}</g>); })}
            </svg>
            
            {mode === InteractionMode.DEPLOYMENT && snappedCursor && (
                <>
                    <div 
                        className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[1000] shadow-[0_0_10px_rgba(251,191,36,0.6)] flex items-center justify-center opacity-80 rounded-full border border-grim-gold"
                        style={{
                            left: snappedCursor.x - BOARD_OFFSET,
                            top: snappedCursor.y - BOARD_OFFSET,
                            transform: `translate(-50%, -50%) scale(${counterScale})`,
                            width: `16px`,
                            height: `16px`
                        }}
                    >
                        <div className="absolute w-full h-[1px] bg-grim-gold/60"></div>
                        <div className="absolute h-full w-[1px] bg-grim-gold/60"></div>
                    </div>
                    <div 
                        className="absolute pointer-events-none z-[1000] bg-grim-900/90 border border-grim-700 text-grim-gold px-1.5 py-0.5 rounded text-[10px] font-mono font-bold whitespace-nowrap shadow-lg backdrop-blur-sm"
                        style={{
                            left: snappedCursor.x - BOARD_OFFSET,
                            top: snappedCursor.y - BOARD_OFFSET,
                            transform: `translate(-50%, -100%) translateY(${-12 * counterScale}px) scale(${counterScale})`,
                            transformOrigin: 'bottom center',
                            fontSize: `${labelFontSize}px`
                        }}
                    >
                       {`X: ${((snappedCursor.x - BOARD_OFFSET) / pixelsPerInch).toFixed(1)}" Y: ${((snappedCursor.y - BOARD_OFFSET) / pixelsPerInch).toFixed(1)}"`}
                    </div>
                </>
            )}
        </div>
      </div>
    </div>
  );
});