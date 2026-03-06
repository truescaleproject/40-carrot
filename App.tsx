import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Board, BoardRef } from './components/Board';
import { Sidebar } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import { BottomControls, ActiveBottomPanel } from './components/BottomControls';
import { MobileLayout } from './components/MobileLayout';
import { SelectedUnitsTooltip } from './components/SelectedUnitsTooltip';
import { WelcomeBanner } from './components/WelcomeBanner';
import { ImportSummaryToast, ImportSummaryData } from './components/ImportSummaryToast';
import { ConnectionStatus } from './components/ConnectionStatus';
import { QuickMenu } from './components/QuickMenu';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useHistory } from './hooks/useHistory';
import { useKeyboardControls } from './hooks/useKeyboardControls';
import { useIsMobile } from './hooks/useIsMobile';
import { ThemeContext } from './context/ThemeContext';
import { themes } from './styles/themes';
import { 
  BoardElement, DrawingLine, DeploymentZone, InteractionMode, 
  AppSettings, ElementType, ModelStats, Weapon, AiDeploymentItem,
  ViewportInfo
} from './types';
import { BOARD_OFFSET, DEFAULT_MODEL_STATS, COLORS, APP_VERSION } from './constants';
import { safeLocalStorageGet, safeLocalStorageSet } from './utils/storageUtils';
import { snapToGrid, findSafeGroupPosition, checkCollision, findSafePosition, detectZones, getHexPositions } from './utils/boardUtils';
import { migrateSaveData } from './utils/migrationUtils';
import { PRESET_MAPS } from './data/presetMaps';
import { convertUnitCardsToBoardElements } from './utils/dataCardConversion';
import { UnitCardData } from './types/dataCards';

const DataCardsPanel = React.lazy(() => import('./components/DataCards/DataCardsPanel').then(m => ({ default: m.DataCardsPanel })));

const DEFAULT_SETTINGS: AppSettings = {
  labelFontSize: 12,
  showCoherencyAlerts: true,
  theme: 'grimdark',
  displayMode: 'desktop',
  showQuickMenu: true,
  aiFeaturesEnabled: false
};

const DEFAULT_BOARD_WIDTH = 60;
const DEFAULT_BOARD_HEIGHT = 44;
const DEFAULT_PPI = 25.4;

export const App = () => {
  // State Initialization
  const [elements, setElements] = useState<BoardElement[]>([]);
  const [lines, setLines] = useState<DrawingLine[]>([]);
  const [zones, setZones] = useState<DeploymentZone[]>([]);
  
  const { history, redoStack, saveHistory, undo, redo } = useHistory(() => ({ elements, lines, zones }));
  const isMobile = useIsMobile();

  const [mode, setMode] = useState<InteractionMode>(InteractionMode.SELECT);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [activeBottomPanel, setActiveBottomPanel] = useState<ActiveBottomPanel>('NONE');
  
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = safeLocalStorageGet('appSettings');
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  });

  const [boardWidth, setBoardWidth] = useState(DEFAULT_BOARD_WIDTH);
  const [boardHeight, setBoardHeight] = useState(DEFAULT_BOARD_HEIGHT);
  const [boardCount, setBoardCount] = useState(1);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [activeColor, setActiveColor] = useState(COLORS[0]);
  const [auraRadius, setAuraRadius] = useState<number | null>(null);
  const [focusedBoardIndex, setFocusedBoardIndex] = useState(0);
  
  const [creationType, setCreationType] = useState<ElementType>(ElementType.MODEL);
  const [newElementLabel, setNewElementLabel] = useState('New Unit');
  const [creationSide, setCreationSide] = useState<'ATTACKER' | 'DEFENDER'>('ATTACKER');
  const [deployCount, setDeployCount] = useState<number | ''>(1);
  const [newElementWidth, setNewElementWidth] = useState(32); // 32mm default
  const [newElementHeight, setNewElementHeight] = useState(32);
  const [isDeployStatsOpen, setIsDeployStatsOpen] = useState(false);
  const [newElementStats, setNewElementStats] = useState<ModelStats>(JSON.parse(JSON.stringify(DEFAULT_MODEL_STATS)));
  const [addingModifierToWeaponId, setAddingModifierToWeaponId] = useState<string | null>(null);

  const [welcomeDismissed, setWelcomeDismissed] = useState(() => !!safeLocalStorageGet('welcomeDismissed'));
  const [importSummary, setImportSummary] = useState<ImportSummaryData | null>(null);
  
  const [isTerrainLocked, setIsTerrainLocked] = useState(false);
  const [isObjectivesLocked, setIsObjectivesLocked] = useState(false);
  const [isTerrainVisible, setIsTerrainVisible] = useState(true);
  const [areZonesVisible, setAreZonesVisible] = useState(true);
  const [showEdgeMeasurements, setShowEdgeMeasurements] = useState(false);
  const [sidebarHoveredId, setSidebarHoveredId] = useState<string | null>(null);
  const [boardHoveredId, setBoardHoveredId] = useState<string | null>(null);
  const [isResetConfirming, setIsResetConfirming] = useState(false);
  const [showDataCards, setShowDataCards] = useState(false);

  const boardRef = useRef<BoardRef | null>(null);

  // Derived State
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedElements = useMemo(() => elements.filter(e => selectedIdSet.has(e.id)), [elements, selectedIdSet]);
  const singleSelectedElement = selectedElements.length === 1 ? selectedElements[0] : null;
  const isSingleGroup = selectedElements.length > 0 && new Set(selectedElements.map(e => e.groupId)).size === 1 && !!selectedElements[0].groupId;
  const groupLabel = isSingleGroup ? (selectedElements[0].groupLabel || '') : '';
  const groupColor = isSingleGroup ? (selectedElements[0].strokeColor || selectedElements[0].color) : '';
  
  const unitCompositionElements = useMemo(() => {
      if (singleSelectedElement && singleSelectedElement.groupId) {
          return elements.filter(e => e.groupId === singleSelectedElement.groupId);
      }
      if (selectedElements.length > 0) {
          return selectedElements;
      }
      return [];
  }, [elements, singleSelectedElement, selectedElements]);

  // Tooltip Data Generation
  const generateStatsData = useCallback((targets: BoardElement[]) => {
      // Filter for models with stats only
      const validTargets = targets.filter(e => e.type === ElementType.MODEL && e.stats);

      if (validTargets.length === 0) {
          return null;
      }

      const groupsMap: Record<string, { count: number; label: string; stats: ModelStats; modelIds: string[]; groupIds: string[] }> = {};

      validTargets.forEach(el => {
          // Group identical models by signature (label + stats)
          const sig = `${el.label}|${JSON.stringify(el.stats)}`;
          
          if (!groupsMap[sig]) {
              groupsMap[sig] = {
                  count: 0,
                  label: el.label,
                  stats: el.stats!,
                  modelIds: [],
                  groupIds: []
              };
          }
          
          groupsMap[sig].count++;
          groupsMap[sig].modelIds.push(el.id);
          if (el.groupId && !groupsMap[sig].groupIds.includes(el.groupId)) {
              groupsMap[sig].groupIds.push(el.groupId);
          }
      });

      const groups = Object.values(groupsMap);
      const totalCount = validTargets.length;
      
      // Determine display name for the tooltip header
      let squadName = "Selection";
      const isSingleGroup = validTargets.length > 0 && new Set(validTargets.map(e => e.groupId)).size === 1 && !!validTargets[0].groupId;
      
      if (validTargets.length > 0) {
          if (isSingleGroup) squadName = validTargets[0].groupLabel || "Squad";
          else if (validTargets.length === 1) squadName = validTargets[0].label;
          else squadName = "Multiple Units";
      }

      return { groups, totalCount, squadName };
  }, []);

  const selectionData = useMemo(() => generateStatsData(selectedElements), [selectedElements, generateStatsData]);
  
  const hoverData = useMemo(() => {
      const id = boardHoveredId || sidebarHoveredId;
      if (!id) return null;
      // Don't show hover bubble if the item is already in the selection (redundant)
      if (selectedIdSet.has(id)) return null;
      
      const el = elements.find(e => e.id === id);
      return el ? generateStatsData([el]) : null;
  }, [boardHoveredId, sidebarHoveredId, elements, selectedIdSet, generateStatsData]);

  // Effects
  useEffect(() => {
    // Dismiss splash screen on mount
    const splash = document.getElementById('splash');
    if (splash) {
      splash.classList.add('hidden');
      setTimeout(() => splash.remove(), 500);
    }
  }, []);

  useEffect(() => {
    safeLocalStorageSet('appSettings', JSON.stringify(settings));
  }, [settings]);

  // ... (Keep existing Helper Functions and Effects) ...
  const getBoardIndexForPoint = (x: number, y: number) => {
      const hGap = 12 * DEFAULT_PPI;
      const hPitch = (boardWidth * DEFAULT_PPI) + hGap;
      const vPitch = (boardHeight * DEFAULT_PPI) + (20 * DEFAULT_PPI);
      const relX = x - BOARD_OFFSET;
      const relY = y - BOARD_OFFSET;
      const col = Math.floor(relX / hPitch);
      const row = Math.floor(relY / vPitch);
      return row * 3 + col;
  };

  // Zone Detection Effect
  useEffect(() => {
      const deploymentLines = lines.filter(l => l.isDeployment);
      
      if (deploymentLines.length === 0) {
          return;
      }

      // Group lines by board to support multi-board layouts
      const linesByBoard: Record<number, DrawingLine[]> = {};
      
      deploymentLines.forEach(line => {
          // Use midpoint to determine board
          const midX = (line.x1 + line.x2) / 2;
          const midY = (line.y1 + line.y2) / 2;
          const bIdx = getBoardIndexForPoint(midX, midY);
          
          if (bIdx >= 0 && bIdx < boardCount) {
              if (!linesByBoard[bIdx]) linesByBoard[bIdx] = [];
              linesByBoard[bIdx].push(line);
          }
      });

      const foundZones: DeploymentZone[] = [];
      const linesToDelete = new Set<string>();

      // Process each board
      Object.entries(linesByBoard).forEach(([_, bLines]) => {
          const result = detectZones(bLines, boardWidth, boardHeight, DEFAULT_PPI, boardCount);
          if (result) {
              foundZones.push(result.red);
              foundZones.push(result.blue);
              result.usedLineIds.forEach(id => linesToDelete.add(id));
          }
      });

      if (foundZones.length > 0) {
          setZones(prev => {
              const boardsWithNewZones = new Set(foundZones.map(z => z.boardIndex));
              // Remove old zones on the boards where new ones are being created to allow replacement
              const unaffectedZones = prev.filter(z => !boardsWithNewZones.has(z.boardIndex));
              return [...unaffectedZones, ...foundZones];
          });

          // Delete the lines that were used to create the zones
          setLines(prev => prev.filter(l => !linesToDelete.has(l.id)));
      }
  }, [lines, boardWidth, boardHeight, boardCount]);

  // --- ACTIONS & HANDLERS ---
  // (Keep all existing action handlers exactly as they are)
  const updateNewElementStat = useCallback((key: keyof Omit<ModelStats, 'weapons'>, val: string) => {
      setNewElementStats(prev => ({ ...prev, [key]: val }));
  }, []);

  const addNewElementWeapon = useCallback(() => {
      setNewElementStats(prev => ({
          ...prev,
          weapons: [...prev.weapons, {
              id: Math.random().toString(36).substring(2, 11),
              name: 'New Weapon',
              type: 'RANGED',
              range: '24"',
              a: '1',
              skill: '3+',
              s: '4',
              ap: '0',
              d: '1',
              modifiers: []
          }]
      }));
  }, []);

  const removeNewElementWeapon = useCallback((id: string) => {
      setNewElementStats(prev => ({
          ...prev,
          weapons: prev.weapons.filter(w => w.id !== id)
      }));
  }, []);

  const updateNewElementWeapon = useCallback((id: string, updates: Partial<Weapon>) => {
      setNewElementStats(prev => ({
          ...prev,
          weapons: prev.weapons.map(w => w.id === id ? { ...w, ...updates } : w)
      }));
  }, []);

  const addNewElementWeaponModifier = useCallback((weaponId: string, type: string) => {
      setNewElementStats(prev => ({
          ...prev,
          weapons: prev.weapons.map(w => {
              if (w.id !== weaponId) return w;
              return { ...w, modifiers: [...(w.modifiers || []), { id: Math.random().toString(36).substring(2, 11), type }] };
          })
      }));
  }, []);

  const removeNewElementWeaponModifier = useCallback((weaponId: string, modId: string) => {
      setNewElementStats(prev => ({
          ...prev,
          weapons: prev.weapons.map(w => {
              if (w.id !== weaponId) return w;
              return { ...w, modifiers: (w.modifiers || []).filter(m => m.id !== modId) };
          })
      }));
  }, []);

  const updateNewElementWeaponModifier = useCallback((wId: string, mId: string, field: 'value' | 'keyword', val: string) => {
      setNewElementStats(prev => ({
          ...prev,
          weapons: prev.weapons.map(w => {
              if (w.id !== wId) return w;
              return { 
                  ...w, 
                  modifiers: (w.modifiers || []).map(m => m.id === mId ? { ...m, [field]: val } : m)
              };
          })
      }));
  }, []);

  const addElement = useCallback((type: ElementType, source: 'SIDEBAR' | 'QUICK_MENU' = 'SIDEBAR') => {
      saveHistory({ elements, lines, zones });
      
      const count = typeof deployCount === 'number' ? Math.max(1, deployCount) : 1;
      const newEls: BoardElement[] = [];
      
      const hGap = 12 * DEFAULT_PPI;
      const hPitch = (boardWidth * DEFAULT_PPI) + hGap;
      const vPitch = (boardHeight * DEFAULT_PPI) + (20 * DEFAULT_PPI);
      
      const row = Math.floor(focusedBoardIndex / 3);
      const col = focusedBoardIndex % 3;
      
      const boardStartX = BOARD_OFFSET + (col * hPitch);
      const boardStartY = BOARD_OFFSET + (row * vPitch);
      
      let spawnX = boardStartX + (boardWidth * DEFAULT_PPI) / 2;
      let spawnY = boardStartY + (boardHeight * DEFAULT_PPI) / 2;

      if (source === 'QUICK_MENU' && boardRef.current) {
          const viewport = boardRef.current.getViewport();
          if (viewport) {
              spawnX = viewport.center.x;
              spawnY = viewport.center.y;
          }
      } 
      else if (source === 'SIDEBAR' && type === ElementType.MODEL) {
          const zoneWidth = 24 * DEFAULT_PPI;
          const zoneHeight = 12 * DEFAULT_PPI;
          const zoneGap = 4 * DEFAULT_PPI;
          const totalZonesWidth = (zoneWidth * 2) + zoneGap;
          const marginX = ((boardWidth * DEFAULT_PPI) - totalZonesWidth) / 2;
          const zoneRelativeY = (boardHeight * DEFAULT_PPI) + (2 * DEFAULT_PPI);

          if (creationSide === 'ATTACKER') {
              spawnX = boardStartX + marginX + (zoneWidth / 2);
              spawnY = boardStartY + zoneRelativeY + (zoneHeight / 2);
          } else {
              spawnX = boardStartX + marginX + zoneWidth + zoneGap + (zoneWidth / 2);
              spawnY = boardStartY + zoneRelativeY + (zoneHeight / 2);
          }
      }

      const groupId = (type === ElementType.MODEL && count > 1) 
          ? `group-${Math.random().toString(36).substring(2, 11)}` 
          : undefined;

      for (let i = 0; i < count; i++) {
          const { x, y } = findSafePosition(
              spawnX, 
              spawnY, 
              newElementWidth, 
              newElementHeight, 
              [...elements, ...newEls], 
              type === ElementType.MODEL ? 0 : 20,
              0, 
              type 
          );

          newEls.push({
              id: Math.random().toString(36).substring(2, 11),
              type: type,
              x: x - newElementWidth / 2,
              y: y - newElementHeight / 2,
              width: newElementWidth,
              height: newElementHeight,
              rotation: 0,
              label: count > 1 ? `${newElementLabel} ${i + 1}` : newElementLabel,
              color: activeColor,
              strokeColor: activeColor,
              side: creationSide,
              stats: type === ElementType.MODEL ? JSON.parse(JSON.stringify(newElementStats)) : undefined,
              currentWounds: type === ElementType.MODEL ? (parseInt(newElementStats.w) || 1) : undefined,
              groupId: groupId,
              groupLabel: groupId ? newElementLabel : undefined
          });
      }

      setElements(prev => [...prev, ...newEls]);
  }, [
      elements, deployCount, focusedBoardIndex, boardWidth, boardHeight, 
      newElementWidth, newElementHeight, newElementLabel, activeColor, 
      creationSide, newElementStats, saveHistory
  ]);

  const deleteSelected = useCallback(() => { 
      if (selectedIds.length === 0) return; 
      saveHistory({ elements, lines, zones }); 
      setElements(prev => prev.filter(e => !selectedIdSet.has(e.id))); 
      setSelectedIds([]); 
  }, [selectedIds, selectedIdSet, saveHistory, elements, lines, zones]);

  const groupSelected = useCallback(() => {
      if (selectedIds.length < 2) return;
      saveHistory({ elements, lines, zones });
      const newGroupId = `group-${Math.random().toString(36).substring(2, 11)}`;
      const firstModel = elements.find(e => e.id === selectedIds[0]);
      const label = firstModel?.groupLabel || "New Group";
      const color = firstModel?.strokeColor || firstModel?.color || activeColor;
      
      setElements(prev => prev.map(e => selectedIdSet.has(e.id) ? { ...e, groupId: newGroupId, groupLabel: label, strokeColor: color } : e));
  }, [selectedIds, selectedIdSet, saveHistory, elements, lines, zones, activeColor]);

  const ungroupSelected = useCallback(() => {
      saveHistory({ elements, lines, zones });
      setElements(prev => prev.map(e => selectedIdSet.has(e.id) ? { ...e, groupId: undefined, groupLabel: undefined } : e));
  }, [selectedIds, selectedIdSet, saveHistory, elements, lines, zones]);

  const onGroupToggle = useCallback(() => { 
      if (isSingleGroup) ungroupSelected(); else groupSelected(); 
  }, [isSingleGroup, ungroupSelected, groupSelected]);
  
  const onClearLines = useCallback(() => { 
      saveHistory({ elements, lines, zones }); 
      setLines(prev => prev.filter(l => {
          const midX = (l.x1 + l.x2) / 2;
          const midY = (l.y1 + l.y2) / 2;
          return getBoardIndexForPoint(midX, midY) !== focusedBoardIndex;
      })); 
  }, [saveHistory, elements, lines, zones, focusedBoardIndex, boardWidth, boardHeight]);

  const onClearZones = useCallback(() => { 
      saveHistory({ elements, lines, zones }); 
      setZones(prev => prev.filter(z => z.boardIndex !== focusedBoardIndex)); 
  }, [saveHistory, elements, lines, zones, focusedBoardIndex]);

  const onClearText = useCallback(() => {
      saveHistory({ elements, lines, zones });
      setElements(prev => prev.filter(e => e.type !== ElementType.TEXT));
  }, [saveHistory, elements, lines, zones]);

  const rotateGroup = useCallback((degrees: number) => { 
      saveHistory({ elements, lines, zones }); 
      setElements(prev => prev.map(e => selectedIdSet.has(e.id) ? { ...e, rotation: (e.rotation + degrees) % 360 } : e)); 
  }, [selectedIds, selectedIdSet, saveHistory, elements, lines, zones]);

  const updateSelectedLabel = useCallback((label: string) => {
      saveHistory({ elements, lines, zones });
      setElements(prev => prev.map(el => selectedIdSet.has(el.id) ? { ...el, label } : el));
  }, [selectedIdSet, saveHistory, elements, lines, zones]);

  const updateSelectedSide = useCallback((side: 'ATTACKER' | 'DEFENDER') => {
      saveHistory({ elements, lines, zones });
      setElements(prev => prev.map(el => selectedIdSet.has(el.id) ? { ...el, side } : el));
  }, [selectedIdSet, saveHistory, elements, lines, zones]);

  const updateSelectedDimensions = useCallback((dim: 'width' | 'height', val: number) => {
      saveHistory({ elements, lines, zones });
      setElements(prev => prev.map(el => {
          if (!selectedIdSet.has(el.id)) return el;
          
          if (dim === 'width') {
              const diff = val - el.width;
              return { ...el, width: val, x: el.x - (diff / 2) };
          } else {
              const diff = val - el.height;
              return { ...el, height: val, y: el.y - (diff / 2) };
          }
      }));
  }, [selectedIdSet, saveHistory, elements, lines, zones]);

  const updateSelectedRotation = useCallback((rotation: number) => {
      saveHistory({ elements, lines, zones });
      setElements(prev => prev.map(el => selectedIdSet.has(el.id) ? { ...el, rotation } : el));
  }, [selectedIdSet, saveHistory, elements, lines, zones]);

  const updateSelectedModelStat = useCallback((key: keyof Omit<ModelStats, 'weapons'>, val: string) => {
      saveHistory({ elements, lines, zones });
      setElements(prev => prev.map(el => {
          if (!selectedIdSet.has(el.id) || !el.stats) return el;
          return { ...el, stats: { ...el.stats, [key]: val } };
      }));
  }, [selectedIdSet, saveHistory, elements, lines, zones]);

  const adjustWounds = useCallback((ids: string[], delta: number) => {
      const idSet = new Set(ids);
      setElements(prev => prev.map(el => {
          if (!idSet.has(el.id)) return el;
          const max = parseInt(el.stats?.w || '1') || 1;
          const current = el.currentWounds ?? max;
          return { ...el, currentWounds: Math.max(0, Math.min(max, current + delta)) };
      }));
  }, []);

  const addWeapon = useCallback(() => {
      saveHistory({ elements, lines, zones });
      const newWeapon: Weapon = {
          id: Math.random().toString(36).substring(2, 11),
          name: 'New Weapon',
          type: 'RANGED',
          range: '24"',
          a: '1',
          skill: '3+',
          s: '4',
          ap: '0',
          d: '1',
          modifiers: []
      };
      setElements(prev => prev.map(el => {
          if (!selectedIdSet.has(el.id) || !el.stats) return el;
          return { ...el, stats: { ...el.stats, weapons: [...el.stats.weapons, newWeapon] } };
      }));
  }, [selectedIdSet, saveHistory, elements, lines, zones]);

  const removeWeapon = useCallback((weaponId: string) => {
      saveHistory({ elements, lines, zones });
      setElements(prev => prev.map(el => {
          if (!selectedIdSet.has(el.id) || !el.stats) return el;
          return { ...el, stats: { ...el.stats, weapons: el.stats.weapons.filter(w => w.id !== weaponId) } };
      }));
  }, [selectedIdSet, saveHistory, elements, lines, zones]);

  const updateWeapon = useCallback((weaponId: string, updates: Partial<Weapon>) => {
      saveHistory({ elements, lines, zones });
      setElements(prev => prev.map(el => {
          if (!selectedIdSet.has(el.id) || !el.stats) return el;
          return { 
              ...el, 
              stats: { 
                  ...el.stats, 
                  weapons: el.stats.weapons.map(w => w.id === weaponId ? { ...w, ...updates } : w) 
              } 
          };
      }));
  }, [selectedIdSet, saveHistory, elements, lines, zones]);

  const addWeaponModifier = useCallback((weaponId: string, type: string) => {
      saveHistory({ elements, lines, zones });
      setElements(prev => prev.map(el => {
          if (!selectedIdSet.has(el.id) || !el.stats) return el;
          return {
              ...el,
              stats: {
                  ...el.stats,
                  weapons: el.stats.weapons.map(w => {
                      if (w.id !== weaponId) return w;
                      return { ...w, modifiers: [...(w.modifiers || []), { id: Math.random().toString(36).substring(2, 11), type }] };
                  })
              }
          };
      }));
  }, [selectedIdSet, saveHistory, elements, lines, zones]);

  const removeWeaponModifier = useCallback((weaponId: string, modId: string) => {
      saveHistory({ elements, lines, zones });
      setElements(prev => prev.map(el => {
          if (!selectedIdSet.has(el.id) || !el.stats) return el;
          return {
              ...el,
              stats: {
                  ...el.stats,
                  weapons: el.stats.weapons.map(w => {
                      if (w.id !== weaponId) return w;
                      return { ...w, modifiers: (w.modifiers || []).filter(m => m.id !== modId) };
                  })
              }
          };
      }));
  }, [selectedIdSet, saveHistory, elements, lines, zones]);

  const updateWeaponModifier = useCallback((wId: string, mId: string, field: 'value' | 'keyword', val: string) => {
      saveHistory({ elements, lines, zones });
      setElements(prev => prev.map(el => {
          if (!selectedIdSet.has(el.id) || !el.stats) return el;
          return {
              ...el,
              stats: {
                  ...el.stats,
                  weapons: el.stats.weapons.map(w => {
                      if (w.id !== wId) return w;
                      return { 
                          ...w, 
                          modifiers: (w.modifiers || []).map(m => m.id === mId ? { ...m, [field]: val } : m)
                      };
                  })
              }
          };
      }));
  }, [selectedIdSet, saveHistory, elements, lines, zones]);

  const removeElementImage = useCallback(() => {
      saveHistory({ elements, lines, zones });
      setElements(prev => prev.map(el => selectedIdSet.has(el.id) ? { ...el, image: undefined } : el));
  }, [selectedIdSet, saveHistory, elements, lines, zones]);

  const updateBatchColor = useCallback((color: string) => {
      saveHistory({ elements, lines, zones });
      setElements(prev => prev.map(el => selectedIdSet.has(el.id) ? { ...el, color, strokeColor: color } : el));
  }, [selectedIdSet, saveHistory, elements, lines, zones]);

  const updateGroupLabel = useCallback((label: string) => {
      saveHistory({ elements, lines, zones });
      setElements(prev => prev.map(el => selectedIdSet.has(el.id) ? { ...el, groupLabel: label } : el));
  }, [selectedIdSet, saveHistory, elements, lines, zones]);

  const updateGroupColor = useCallback((color: string) => {
      saveHistory({ elements, lines, zones });
      setElements(prev => prev.map(el => selectedIdSet.has(el.id) ? { ...el, strokeColor: color } : el));
  }, [selectedIdSet, saveHistory, elements, lines, zones]);

  const toggleLocked = useCallback((ids: string[]) => {
      setElements(prev => prev.map(el => ids.includes(el.id) ? { ...el, locked: !el.locked } : el));
  }, []);

  const updateSelectedShape = useCallback((shape: 'CIRCLE' | 'RECTANGLE') => {
      saveHistory({ elements, lines, zones });
      setElements(prev => prev.map(el => selectedIdSet.has(el.id) ? { ...el, shape } : el));
  }, [selectedIdSet, saveHistory, elements, lines, zones]);

  // Board Settings Handlers
  const handleResetBoard = useCallback(() => {
      if (isResetConfirming) {
          saveHistory({ elements, lines, zones });
          setElements([]);
          setLines([]);
          setZones([]);
          setIsResetConfirming(false);
      } else {
          setIsResetConfirming(true);
          setTimeout(() => setIsResetConfirming(false), 3000);
      }
  }, [isResetConfirming, saveHistory, elements, lines, zones]);

  const handleClearBoardImage = useCallback(() => setBackgroundImage(null), []);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>, target: 'model' | 'map') => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
          const result = ev.target?.result as string;
          if (target === 'map') {
              setBackgroundImage(result);
          } else {
              saveHistory({ elements, lines, zones });
              setElements(prev => prev.map(el => selectedIdSet.has(el.id) ? { ...el, image: result } : el));
          }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
  }, [selectedIdSet, saveHistory, elements, lines, zones]);

  const handleExportState = useCallback(() => {
      const data = {
          version: APP_VERSION,
          elements, lines, zones, boardWidth, boardHeight, boardCount, settings
      };
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `40carrot-save-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
  }, [elements, lines, zones, boardWidth, boardHeight, boardCount, settings]);

  const handleImportState = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
          try {
              const data = JSON.parse(ev.target?.result as string);
              saveHistory({ elements, lines, zones });
              if (data.elements) setElements(data.elements);
              if (data.lines) setLines(data.lines);
              if (data.zones) setZones(data.zones);
              if (data.boardWidth) setBoardWidth(data.boardWidth);
              if (data.boardHeight) setBoardHeight(data.boardHeight);
              if (data.boardCount) setBoardCount(data.boardCount);
              if (data.settings) setSettings(data.settings);
          } catch (err) {
              console.error("Failed to load state", err);
              alert("Invalid save file");
          }
      };
      reader.readAsText(file);
      e.target.value = '';
  }, [saveHistory, elements, lines, zones]);

  const handleExportTerrain = useCallback(() => {
      const terrain = elements.filter(e => e.type === ElementType.TERRAIN);
      const data = {
          name: "Custom Map",
          version: '1.0',
          boardWidth, boardHeight,
          terrain
      };
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `terrain-map-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
  }, [elements, boardWidth, boardHeight]);

  const handleImportTerrain = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
          try {
              const data = JSON.parse(ev.target?.result as string);
              if (data.terrain) {
                  saveHistory({ elements, lines, zones });
                  // Keep non-terrain, add new terrain
                  setElements(prev => [...prev.filter(e => e.type !== ElementType.TERRAIN), ...data.terrain]);
                  if (data.boardWidth) setBoardWidth(data.boardWidth);
                  if (data.boardHeight) setBoardHeight(data.boardHeight);
              }
          } catch (err) {
              console.error("Failed to load map", err);
              alert("Invalid map file");
          }
      };
      reader.readAsText(file);
      e.target.value = '';
  }, [saveHistory, elements, lines, zones]);

  const handleDuplicateBoard = useCallback(() => {
    if (boardCount >= 9) return;

    saveHistory({ elements, lines, zones });
    
    const sourceIndex = boardCount - 1;
    const targetIndex = boardCount;

    const hGap = 12 * DEFAULT_PPI;
    const hPitch = (boardWidth * DEFAULT_PPI) + hGap;
    const vPitch = (boardHeight * DEFAULT_PPI) + (20 * DEFAULT_PPI);

    const srcCol = sourceIndex % 3;
    const srcRow = Math.floor(sourceIndex / 3);
    const srcOffsetX = BOARD_OFFSET + (srcCol * hPitch);
    const srcOffsetY = BOARD_OFFSET + (srcRow * vPitch);

    const tgtCol = targetIndex % 3;
    const tgtRow = Math.floor(targetIndex / 3);
    const tgtOffsetX = BOARD_OFFSET + (tgtCol * hPitch);
    const tgtOffsetY = BOARD_OFFSET + (tgtRow * vPitch);

    const dx = tgtOffsetX - srcOffsetX;
    const dy = tgtOffsetY - srcOffsetY;

    const groupRemap = new Map<string, string>();
    const newElements = [...elements];

    elements.forEach(el => {
        const cx = el.x + el.width / 2;
        const cy = el.y + el.height / 2;
        if (getBoardIndexForPoint(cx, cy) === sourceIndex) {
            let newGroupId = el.groupId;
            if (el.groupId) {
                if (!groupRemap.has(el.groupId)) {
                    groupRemap.set(el.groupId, `group-${Math.random().toString(36).substring(2, 11)}`);
                }
                newGroupId = groupRemap.get(el.groupId);
            }

            newElements.push({
                ...el,
                id: Math.random().toString(36).substring(2, 11),
                x: el.x + dx,
                y: el.y + dy,
                groupId: newGroupId,
            });
        }
    });

    const newLines = [...lines];
    lines.forEach(l => {
        const midX = (l.x1 + l.x2) / 2;
        const midY = (l.y1 + l.y2) / 2;
        if (getBoardIndexForPoint(midX, midY) === sourceIndex) {
            newLines.push({
                ...l,
                id: Math.random().toString(36).substring(2, 11),
                x1: l.x1 + dx,
                y1: l.y1 + dy,
                x2: l.x2 + dx,
                y2: l.y2 + dy
            });
        }
    });

    const newZones = [...zones];
    zones.forEach(z => {
        if (z.boardIndex === sourceIndex) {
            newZones.push({
                ...z,
                id: Math.random().toString(36).substring(2, 11),
                boardIndex: targetIndex,
                points: z.points.map(p => ({ x: p.x + dx, y: p.y + dy }))
            });
        }
    });

    setElements(newElements);
    setLines(newLines);
    setZones(newZones);
    setBoardCount(prev => prev + 1);
    setFocusedBoardIndex(targetIndex);
    
  }, [saveHistory, elements, lines, zones, boardCount, boardWidth, boardHeight]);

  const handleDeleteBattlefield = useCallback(() => {
    saveHistory({ elements, lines, zones });
    setBoardCount(prev => Math.max(prev - 1, 1));
  }, [saveHistory, elements, lines, zones]);

  const handleLoadPresetMap = useCallback((index: number) => {
      if (index >= 0 && index < PRESET_MAPS.length) {
          const map = PRESET_MAPS[index];
          saveHistory({ elements, lines, zones });
          setElements(prev => [...prev.filter(e => e.type !== ElementType.TERRAIN), ...map.terrain]);
          setBoardWidth(map.boardWidth);
          setBoardHeight(map.boardHeight);
      }
  }, [saveHistory, elements, lines, zones]);

  const onCopy = useCallback(() => { 
      if (selectedIds.length === 0) return;
      const selected = elements.filter(e => selectedIds.includes(e.id));
      const json = JSON.stringify(selected);
      if (navigator.clipboard) {
          navigator.clipboard.writeText(json).catch(err => console.error("Copy failed", err));
      } else {
          console.warn("Clipboard API not available");
      }
  }, [selectedIds, elements]);

  const onPaste = useCallback(() => { 
      if (navigator.clipboard) {
          navigator.clipboard.readText().then(text => {
              try {
                  const pasted = JSON.parse(text);
                  if (Array.isArray(pasted) && pasted.every((e: any) => e.type && e.id)) {
                      saveHistory({ elements, lines, zones });
                      
                      // 1. Calculate Center of Paste Group
                      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                      pasted.forEach((e: any) => {
                          minX = Math.min(minX, e.x);
                          minY = Math.min(minY, e.y);
                          maxX = Math.max(maxX, e.x + e.width);
                          maxY = Math.max(maxY, e.y + e.height);
                      });
                      
                      const groupCenterX = (minX + maxX) / 2;
                      const groupCenterY = (minY + maxY) / 2;

                      // 2. Determine Target Location (Viewport Center)
                      let targetX = groupCenterX + 20; // Fallback
                      let targetY = groupCenterY + 20;

                      if (boardRef.current) {
                          const viewport = boardRef.current.getViewport();
                          if (viewport) {
                              targetX = viewport.center.x;
                              targetY = viewport.center.y;
                          }
                      }

                      const dx = targetX - groupCenterX;
                      const dy = targetY - groupCenterY;

                      // 3. Create Tentative Elements at Target
                      let newElements = pasted.map((e: any) => ({
                          ...e,
                          id: Math.random().toString(36).substring(2, 11),
                          x: e.x + dx,
                          y: e.y + dy
                      })) as BoardElement[];

                      // 4. Resolve Group Collision (Move whole group to safe spot if needed)
                      // Only check collision for Models and Terrain
                      const collidableElements = newElements.filter(e => e.type === ElementType.MODEL || e.type === ElementType.TERRAIN);
                      
                      if (collidableElements.length > 0) {
                          const safeOffset = findSafeGroupPosition(collidableElements, elements, 0);
                          if (safeOffset) {
                              newElements = newElements.map(e => ({
                                  ...e,
                                  x: e.x + safeOffset.x,
                                  y: e.y + safeOffset.y
                              }));
                          }
                      }

                      setElements(prev => [...prev, ...newElements]);
                      setSelectedIds(newElements.map(e => e.id));
                  }
              } catch (err) {
                  console.error("Paste failed: invalid data", err);
              }
          }).catch(err => console.error("Paste failed", err));
      }
  }, [saveHistory, elements, lines, zones]);

  const onUndo = useCallback(() => {
      undo({ elements, lines, zones }, (state) => {
          setElements(state.elements);
          setLines(state.lines);
          setZones(state.zones);
      });
  }, [undo, elements, lines, zones]);
  
  const onRedo = useCallback(() => {
      redo({ elements, lines, zones }, (state) => {
          setElements(state.elements);
          setLines(state.lines);
          setZones(state.zones);
      });
  }, [redo, elements, lines, zones]);

  const applyFormation = useCallback((type: 'LINE_COHERENCY' | 'BASE_TO_BASE' | 'CIRCLE', ids?: string[]) => {
      const targetIds = ids || selectedIds;
      if (targetIds.length < 2) return;
      
      saveHistory({ elements, lines, zones });
      
      const targets = elements.filter(e => targetIds.includes(e.id));
      // Calculate geometric center of selection to keep formation in place
      const minX = Math.min(...targets.map(e => e.x));
      const maxX = Math.max(...targets.map(e => e.x + e.width));
      const minY = Math.min(...targets.map(e => e.y));
      const maxY = Math.max(...targets.map(e => e.y + e.height));
      const startX = (minX + maxX) / 2;
      const startY = (minY + maxY) / 2;

      const count = targets.length;
      // Average width for spacing calculations.
      // Note: In 40k, coherency is measured base-to-base.
      // Center-to-Center Distance = (Radius1 + Radius2) + Gap.
      // Assuming models are roughly same size for the formation logic or using avg.
      const avgWidth = targets.reduce((acc, t) => acc + t.width, 0) / count;
      
      let newPositions: {id: string, x: number, y: number}[] = [];

      if (type === 'BASE_TO_BASE') {
          // Min Coherency: Hexagonal packing, touching as much as possible.
          // Gap 0 or very small (1px buffer to avoid overlap bugs).
          const spacing = avgWidth + 1; 
          const hexCoords = getHexPositions(count, spacing);
          newPositions = targets.map((t, i) => ({
              id: t.id,
              x: startX + hexCoords[i].x - t.width / 2,
              y: startY + hexCoords[i].y - t.height / 2
          }));

      } else if (type === 'CIRCLE') {
          // 6" diameter = 3" radius
          const minRadiusInches = 3;
          const minRadiusPx = minRadiusInches * DEFAULT_PPI;

          // Circumference ~ count * (width)
          // Ensure no overlap: ArcLength >= width
          const requiredCircumference = count * (avgWidth + 2); // 2px buffer
          const overlapRadiusPx = requiredCircumference / (2 * Math.PI);

          // "The circle gets bigger if the models cannot create a six in circle without overlapping"
          const finalRadius = Math.max(minRadiusPx, overlapRadiusPx);

          const angleStep = (2 * Math.PI) / count;
          // Start angle -90 (top)
          const startAngle = -Math.PI / 2;

          newPositions = targets.map((t, i) => {
              const theta = startAngle + (i * angleStep);
              return {
                  id: t.id,
                  x: startX + (Math.cos(theta) * finalRadius) - t.width / 2,
                  y: startY + (Math.sin(theta) * finalRadius) - t.height / 2
              };
          });

      } else if (type === 'LINE_COHERENCY') {
          // Max Coherency: 1.9" gap between bases.
          // Center-to-center = Width + 1.9".
          const coherencyGap = 1.9 * DEFAULT_PPI;
          const spacing = avgWidth + coherencyGap;

          const offsets: {x: number, y: number}[] = [];

          if (count < 7) {
              // Simple Line
              const totalLen = (count - 1) * spacing;
              const lineStart = -(totalLen / 2);

              for (let i = 0; i < count; i++) {
                  offsets.push({ x: lineStart + (i * spacing), y: 0 });
              }
          } else {
              // Triangle Ends (Bone/Dumbbell Shape)
              // Left Triangle (Indices 0,1,2)
              // 0,1 vertical base, 2 tip pointing right
              const triHeight = spacing * 0.866; // height of equilateral triangle with side 'spacing'
              
              offsets.push({ x: 0, y: -spacing/2 }); // 0 (Top left)
              offsets.push({ x: 0, y: spacing/2 });  // 1 (Bottom left)
              offsets.push({ x: triHeight, y: 0 });  // 2 (Tip of left, start of spine)

              let currentX = triHeight;
              
              // Spine (Indices 3 to N-4)
              // Left Tri uses 3. Right Tri uses 3. Spine uses N - 6.
              const spineCount = count - 6;
              
              for (let i = 0; i < spineCount; i++) {
                  currentX += spacing;
                  offsets.push({ x: currentX, y: 0 });
              }

              // Right Triangle (Indices N-3, N-2, N-1)
              // Connects to last spine point (which is at currentX)
              // Tip (N-3) points left towards spine.
              currentX += spacing;
              const rightTipX = currentX;
              
              offsets.push({ x: rightTipX, y: 0 }); // Tip (N-3)
              offsets.push({ x: rightTipX + triHeight, y: -spacing/2 }); // Base Top (N-2)
              offsets.push({ x: rightTipX + triHeight, y: spacing/2 });  // Base Bottom (N-1)

              // Center the whole shape relative to startX/startY
              const totalWidth = (rightTipX + triHeight);
              const shiftX = -(totalWidth / 2);

              for (let i=0; i<offsets.length; i++) {
                  offsets[i].x += shiftX;
              }
          }
          
          newPositions = targets.map((t, i) => ({
              id: t.id,
              x: startX + offsets[i].x - t.width / 2,
              y: startY + offsets[i].y - t.height / 2
          }));
      }
      
      setElements(prev => prev.map(e => {
          const update = newPositions.find(p => p.id === e.id);
          return update ? { ...e, x: update.x, y: update.y } : e;
      }));
  }, [selectedIds, elements, saveHistory]);

  const cycleAuraRadius = useCallback(() => {
      setAuraRadius(prev => prev === null ? 3 : (prev === 3 ? 6 : (prev === 6 ? 9 : (prev === 9 ? 12 : null))));
  }, []);

  const toggleEdgeMeasurements = useCallback(() => setShowEdgeMeasurements(prev => !prev), []);
  const toggleTerrainVisibility = useCallback(() => setIsTerrainVisible(prev => !prev), []);
  const toggleTerrainLock = useCallback(() => setIsTerrainLocked(prev => !prev), []);
  
  const onResetView = useCallback(() => {
      if (boardRef.current) boardRef.current.resetView();
  }, []);

  // --- NEW HANDLERS FOR BOTTOM CONTROLS ---

  const handleSpawnObjectives = useCallback((count: number) => {
      saveHistory({ elements, lines, zones });
      
      const newObjectives: BoardElement[] = [];
      const hGap = 12 * DEFAULT_PPI;
      const hPitch = (boardWidth * DEFAULT_PPI) + hGap;
      const vPitch = (boardHeight * DEFAULT_PPI) + (20 * DEFAULT_PPI);
      
      const row = Math.floor(focusedBoardIndex / 3);
      const col = focusedBoardIndex % 3;
      
      const boardStartX = BOARD_OFFSET + (col * hPitch);
      const boardStartY = BOARD_OFFSET + (row * vPitch);
      const centerX = boardStartX + (boardWidth * DEFAULT_PPI) / 2;
      const centerY = boardStartY + (boardHeight * DEFAULT_PPI) / 2;

      // 40mm marker size
      const markerSize = (40 / 25.4) * DEFAULT_PPI; 

      const createObj = (x: number, y: number, label: string) => ({
          id: Math.random().toString(36).substring(2, 11),
          type: ElementType.OBJECTIVE,
          x: x - markerSize/2,
          y: y - markerSize/2,
          width: markerSize,
          height: markerSize,
          rotation: 0,
          label,
          color: 'rgba(251, 191, 36, 0.2)', // transparent gold
          locked: false
      });

      if (count === 5) {
          const offsetX = (boardWidth / 4) * DEFAULT_PPI;
          const offsetY = (boardHeight / 4) * DEFAULT_PPI;
          newObjectives.push(createObj(centerX, centerY, "1"));
          newObjectives.push(createObj(centerX - offsetX, centerY - offsetY, "2"));
          newObjectives.push(createObj(centerX + offsetX, centerY - offsetY, "3"));
          newObjectives.push(createObj(centerX - offsetX, centerY + offsetY, "4"));
          newObjectives.push(createObj(centerX + offsetX, centerY + offsetY, "5"));
      } else if (count === 6) {
           const dx = (boardWidth / 4) * DEFAULT_PPI;
           const dy = (boardHeight / 4) * DEFAULT_PPI;
           newObjectives.push(createObj(centerX - dx, centerY - (dy/2), "1"));
           newObjectives.push(createObj(centerX + dx, centerY - (dy/2), "2"));
           newObjectives.push(createObj(centerX - dx, centerY + (dy/2), "3"));
           newObjectives.push(createObj(centerX + dx, centerY + (dy/2), "4"));
           newObjectives.push(createObj(centerX, centerY - dy * 1.2, "5"));
           newObjectives.push(createObj(centerX, centerY + dy * 1.2, "6"));
      } else {
          const spacing = (boardWidth / (count + 1)) * DEFAULT_PPI;
          const startX = boardStartX + spacing;
          for (let i = 0; i < count; i++) {
              newObjectives.push(createObj(startX + (i * spacing), centerY, (i+1).toString()));
          }
      }

      setElements(prev => [...prev, ...newObjectives]);
  }, [focusedBoardIndex, boardWidth, boardHeight, saveHistory, elements, lines, zones]);

  const handleClearObjectives = useCallback(() => {
      saveHistory({ elements, lines, zones });
      const hGap = 12 * DEFAULT_PPI;
      const hPitch = (boardWidth * DEFAULT_PPI) + hGap;
      const vPitch = (boardHeight * DEFAULT_PPI) + (20 * DEFAULT_PPI);

      setElements(prev => prev.filter(e => {
          if (e.type !== ElementType.OBJECTIVE) return true;
          const cx = e.x + e.width/2;
          const cy = e.y + e.height/2;
          const relX = cx - BOARD_OFFSET;
          const relY = cy - BOARD_OFFSET;
          const col = Math.floor(relX / hPitch);
          const row = Math.floor(relY / vPitch);
          const bIdx = row * 3 + col;
          return bIdx !== focusedBoardIndex;
      }));
  }, [focusedBoardIndex, boardWidth, boardHeight, saveHistory, elements, lines, zones]);

  const handleArmyImport = useCallback((newElements: BoardElement[], side: 'ATTACKER' | 'DEFENDER') => {
      saveHistory({ elements, lines, zones });
      
      const hGap = 12 * DEFAULT_PPI;
      const hPitch = (boardWidth * DEFAULT_PPI) + hGap;
      const vPitch = (boardHeight * DEFAULT_PPI) + (20 * DEFAULT_PPI);
      const row = Math.floor(focusedBoardIndex / 3);
      const col = focusedBoardIndex % 3;
      const boardStartX = BOARD_OFFSET + (col * hPitch);
      const boardStartY = BOARD_OFFSET + (row * vPitch);
      
      const boardCenterX = boardStartX + (boardWidth * DEFAULT_PPI) / 2;
      const boardCenterY = boardStartY + (boardHeight * DEFAULT_PPI) / 2;

      const finalElements: BoardElement[] = [];
      const placed: BoardElement[] = [...elements]; 

      // 1. Group incoming elements
      const groups = new Map<string, BoardElement[]>();
      // Fallback for elements without IDs or Groups
      newElements.forEach(el => {
          const key = el.groupId || `individual-${el.id}`;
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key)!.push(el);
      });

      // 2. Process groups
      groups.forEach((groupModels) => {
          if (groupModels.length === 0) return;

          // Calculate formatting parameters
          const count = groupModels.length;
          // Use max width to ensure spacing fits the largest base in group
          const maxBaseSize = Math.max(...groupModels.map(m => Math.max(m.width, m.height)));
          const spacing = maxBaseSize + (2 * (DEFAULT_PPI / 25.4)); // 2mm gap between bases
          
          // Estimate group footprint radius for safe placement
          const groupRadius = Math.max(maxBaseSize, Math.sqrt(count) * (spacing / 1.5));
          const groupDiameter = groupRadius * 2;

          // Find center for the group
          // We request a buffer of 2 inches (2 * DEFAULT_PPI) between this group's "bounding box" and anything else
          const { x: groupCx, y: groupCy } = findSafePosition(
              boardCenterX,
              boardCenterY,
              groupDiameter,
              groupDiameter,
              placed,
              2 * DEFAULT_PPI, // 2 inches buffer
              0,
              ElementType.MODEL
          );

          // Get formation offsets (relative to center 0,0)
          const offsets = getHexPositions(count, spacing);

          groupModels.forEach((model, i) => {
              if (offsets[i]) {
                  const modelX = groupCx + offsets[i].x - model.width / 2;
                  const modelY = groupCy + offsets[i].y - model.height / 2;
                  
                  const placedEl = { ...model, x: modelX, y: modelY };
                  finalElements.push(placedEl);
                  placed.push(placedEl);
              } else {
                  // Fallback if offset missing
                  const placedEl = { ...model, x: groupCx - model.width/2, y: groupCy - model.height/2 };
                  finalElements.push(placedEl);
                  placed.push(placedEl);
              }
          });
      });

      setElements(prev => [...prev, ...finalElements]);
      
      const units = new Set(finalElements.map(e => e.groupId || e.id)).size;
      setImportSummary({
          unitCount: units,
          modelCount: finalElements.length,
          side,
          ids: finalElements.map(e => e.id)
      });

  }, [focusedBoardIndex, boardWidth, boardHeight, saveHistory, elements, lines, zones]);

  const handleDataCardsDeploy = useCallback((units: UnitCardData[], side: 'ATTACKER' | 'DEFENDER') => {
      const boardElements = convertUnitCardsToBoardElements(units, side, DEFAULT_PPI);
      handleArmyImport(boardElements, side);
      setShowDataCards(false);
  }, [handleArmyImport]);

  const handleAiDeploy = useCallback((items: AiDeploymentItem[]) => {
      saveHistory({ elements, lines, zones });
      const newEls: BoardElement[] = [];
      const placed: BoardElement[] = [...elements];

      const hGap = 12 * DEFAULT_PPI;
      const hPitch = (boardWidth * DEFAULT_PPI) + hGap;
      const vPitch = (boardHeight * DEFAULT_PPI) + (20 * DEFAULT_PPI);
      const row = Math.floor(focusedBoardIndex / 3);
      const col = focusedBoardIndex % 3;
      const boardStartX = BOARD_OFFSET + (col * hPitch);
      const boardStartY = BOARD_OFFSET + (row * vPitch);
      const cx = boardStartX + (boardWidth * DEFAULT_PPI) / 2;
      const cy = boardStartY + (boardHeight * DEFAULT_PPI) / 2;

      items.forEach(item => {
          const width = (item.width || 1) * DEFAULT_PPI;
          const height = (item.height || 1) * DEFAULT_PPI;
          const targetX = cx + ((item.x || 0) * DEFAULT_PPI);
          const targetY = cy + ((item.y || 0) * DEFAULT_PPI);

          const { x, y } = findSafePosition(targetX, targetY, width, height, placed, 0, 0, item.type === 'TERRAIN' ? ElementType.TERRAIN : ElementType.MODEL);
          
          const el: BoardElement = {
              id: Math.random().toString(36).substring(2, 11),
              type: item.type === 'TERRAIN' ? ElementType.TERRAIN : ElementType.MODEL,
              x: x - width/2,
              y: y - height/2,
              width, height,
              rotation: 0,
              label: item.name,
              color: item.color || (item.type === 'TERRAIN' ? COLORS[6] : COLORS[0]),
              stats: item.type === 'MODEL' ? JSON.parse(JSON.stringify(DEFAULT_MODEL_STATS)) : undefined,
              side: 'ATTACKER' 
          };
          newEls.push(el);
          placed.push(el);
      });

      setElements(prev => [...prev, ...newEls]);
  }, [focusedBoardIndex, boardWidth, boardHeight, saveHistory, elements, lines, zones]);

  const { isSpacePressed, isTabPressed } = useKeyboardControls({
      mode, setMode, setSidebarOpen,
      onCopy, onPaste, onDelete: deleteSelected, onGroupToggle,
      onUndo, onRedo, onClearLines, onClearZones,
      onToggleTerrainLock: toggleTerrainLock, onResetView,
      applyFormation, cycleAuraRadius, toggleEdgeMeasurements, toggleTerrainVisibility,
      canUndo: history.length > 0, canRedo: redoStack.length > 0
  });

  const theme = themes[settings.theme] || themes['grimdark'];

  return (
    <ThemeContext.Provider value={{ theme, setTheme: () => {} }}>
      <ErrorBoundary>
        <div className="w-full h-screen overflow-hidden text-text-primary bg-grim-900" style={{
            '--color-grim-900': theme.colors.grim[900],
            '--color-grim-800': theme.colors.grim[800],
            '--color-grim-700': theme.colors.grim[700],
            '--color-grim-600': theme.colors.grim[600],
            '--color-grim-500': theme.colors.grim[500],
            '--color-grim-accent': theme.colors.grim.accent,
            '--color-grim-gold': theme.colors.grim.gold,
            '--text-primary': theme.colors.text.primary,
            '--text-secondary': theme.colors.text.secondary,
            '--text-muted': theme.colors.text.muted,
        } as React.CSSProperties}>
            <ConnectionStatus />
            
            {isMobile ? (
                <MobileLayout 
                    boardRef={boardRef}
                    elements={elements} setElements={setElements}
                    lines={lines} setLines={setLines}
                    zones={zones} setZones={setZones}
                    mode={mode} setMode={setMode}
                    selectedIds={selectedIds} setSelectedIds={setSelectedIds}
                    backgroundImage={backgroundImage}
                    activeColor={activeColor}
                    pixelsPerInch={DEFAULT_PPI}
                    boardWidth={boardWidth} boardHeight={boardHeight} boardCount={boardCount}
                    onActionStart={() => {}}
                    onRightClick={() => {}}
                    undo={onUndo} redo={onRedo}
                    canUndo={history.length > 0} canRedo={redoStack.length > 0}
                    labelFontSize={settings.labelFontSize}
                    auraRadius={auraRadius}
                    objectivesUnlocked={!isObjectivesLocked}
                    isTerrainLocked={isTerrainLocked}
                    showEdgeMeasurements={showEdgeMeasurements}
                    showCoherencyAlerts={settings.showCoherencyAlerts}
                    isTerrainVisible={isTerrainVisible}
                    areZonesVisible={areZonesVisible}
                    onMobileAdd={(type) => addElement(type, 'QUICK_MENU')}
                />
            ) : (
                <div className="flex h-full">
                    {sidebarOpen && (
                        <Sidebar 
                            sidebarOpen={sidebarOpen}
                            selectedIds={selectedIds}
                            singleSelectedElement={singleSelectedElement}
                            setCreationType={setCreationType}
                            creationType={creationType}
                            setNewElementWidth={setNewElementWidth}
                            setNewElementHeight={setNewElementHeight}
                            pixelsPerInch={DEFAULT_PPI}
                            duplicateSelected={onCopy}
                            deleteSelected={deleteSelected}
                            newElementLabel={newElementLabel} setNewElementLabel={setNewElementLabel}
                            deployCount={deployCount} setDeployCount={setDeployCount}
                            newElementWidth={newElementWidth} newElementHeight={newElementHeight}
                            isDeployStatsOpen={isDeployStatsOpen} setIsDeployStatsOpen={setIsDeployStatsOpen}
                            newElementStats={newElementStats} updateNewElementStat={updateNewElementStat}
                            newElementWeapons={newElementStats.weapons} updateNewElementWeapon={updateNewElementWeapon}
                            addNewElementWeapon={addNewElementWeapon} removeNewElementWeapon={removeNewElementWeapon}
                            addingModifierToWeaponId={addingModifierToWeaponId} setAddingModifierToWeaponId={setAddingModifierToWeaponId}
                            addNewElementWeaponModifier={addNewElementWeaponModifier} removeNewElementWeaponModifier={removeNewElementWeaponModifier}
                            updateNewElementWeaponModifier={updateNewElementWeaponModifier}
                            addElement={addElement}
                            boardWidth={boardWidth} setBoardWidth={setBoardWidth}
                            boardHeight={boardHeight} setBoardHeight={setBoardHeight}
                            boardCount={boardCount}
                            labelFontSize={settings.labelFontSize} setLabelFontSize={() => {}}
                            handleImageUpload={handleImageUpload} handleClearBoardImage={handleClearBoardImage}
                            hasBackgroundImage={!!backgroundImage}
                            handleResetBoard={handleResetBoard} isResetConfirming={isResetConfirming}
                            handleExportState={handleExportState} handleImportState={handleImportState}
                            handleExportTerrain={handleExportTerrain} handleImportTerrain={handleImportTerrain}
                            hasMultipleSelected={selectedIds.length > 1}
                            isSingleGroup={isSingleGroup}
                            distinctGroupIds={[]}
                            groupLabel={groupLabel} groupColor={groupColor}
                            groupSelected={groupSelected} ungroupSelected={ungroupSelected}
                            updateGroupLabel={updateGroupLabel} updateGroupColor={updateGroupColor}
                            activeColor={activeColor} setActiveColor={setActiveColor}
                            updateBatchColor={updateBatchColor}
                            updateSelectedLabel={updateSelectedLabel} updateSelectedDimensions={updateSelectedDimensions}
                            updateSelectedRotation={updateSelectedRotation} removeElementImage={removeElementImage}
                            updateSelectedModelStat={updateSelectedModelStat} addWeapon={addWeapon}
                            removeWeapon={removeWeapon} updateWeapon={updateWeapon}
                            addWeaponModifier={addWeaponModifier} removeWeaponModifier={removeWeaponModifier}
                            updateWeaponModifier={updateWeaponModifier}
                            unitCompositionElements={unitCompositionElements}
                            setSidebarHoveredId={setSidebarHoveredId} sidebarHoveredId={sidebarHoveredId}
                            setSelectedIds={setSelectedIds} adjustWounds={adjustWounds}
                            onHoverMove={() => {}} onHoverLeave={() => {}}
                            applyFormation={applyFormation}
                            creationSide={creationSide} setCreationSide={setCreationSide}
                            updateSelectedSide={updateSelectedSide}
                            handleDuplicateBoard={handleDuplicateBoard} handleDeleteBattlefield={handleDeleteBattlefield}
                            toggleLocked={toggleLocked}
                            rotateGroup={rotateGroup}
                            startGroupRotation={() => {}} applyGroupRotation={() => {}} commitGroupRotation={() => {}}
                            handleLoadPresetMap={handleLoadPresetMap} focusedBoardIndex={focusedBoardIndex}
                            updateSelectedShape={updateSelectedShape}
                        />
                    )}
                    <div className="flex-1 flex flex-col relative">
                        {showDataCards ? (
                          <React.Suspense fallback={<div className="flex-1 flex items-center justify-center"><span className="text-slate-500 text-sm">Loading Data Cards...</span></div>}>
                            <DataCardsPanel
                              isOpen={showDataCards}
                              onClose={() => setShowDataCards(false)}
                              onDeployToBoard={handleDataCardsDeploy}
                            />
                          </React.Suspense>
                        ) : (
                          <>
                            <Toolbar
                                mode={mode} setMode={setMode}
                                undo={onUndo} redo={onRedo}
                                canUndo={history.length > 0} canRedo={redoStack.length > 0}
                                sidebarOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                                auraRadius={auraRadius} cycleAuraRadius={cycleAuraRadius}
                                clearLines={onClearLines} clearDeploymentZones={onClearZones}
                                onClearText={onClearText}
                                isTerrainLocked={isTerrainLocked} toggleTerrainLock={toggleTerrainLock}
                                showEdgeMeasurements={showEdgeMeasurements} toggleEdgeMeasurements={toggleEdgeMeasurements}
                                isTerrainVisible={isTerrainVisible} toggleTerrainVisibility={toggleTerrainVisibility}
                                areZonesVisible={areZonesVisible} toggleZoneVisibility={() => setAreZonesVisible(!areZonesVisible)}
                            />
                            <div className="flex-1 relative overflow-hidden">
                                <Board
                                    ref={boardRef}
                                    elements={elements} setElements={setElements}
                                    lines={lines} setLines={setLines}
                                    zones={zones}
                                    mode={mode}
                                    selectedIds={selectedIds} setSelectedIds={setSelectedIds}
                                    backgroundImage={backgroundImage}
                                    activeColor={activeColor}
                                    pixelsPerInch={DEFAULT_PPI}
                                    boardWidth={boardWidth} boardHeight={boardHeight}
                                    onActionStart={() => saveHistory({ elements, lines, zones })}
                                    sidebarHoveredId={sidebarHoveredId}
                                    onRightClick={() => setSelectedIds([])}
                                    labelFontSize={settings.labelFontSize}
                                    sidebarOpen={sidebarOpen}
                                    auraRadius={auraRadius}
                                    objectivesUnlocked={!isObjectivesLocked}
                                    isTerrainLocked={isTerrainLocked}
                                    showEdgeMeasurements={showEdgeMeasurements}
                                    boardCount={boardCount}
                                    showCoherencyAlerts={settings.showCoherencyAlerts}
                                    isTerrainVisible={isTerrainVisible}
                                    areZonesVisible={areZonesVisible}
                                    displayMode={settings.displayMode}
                                    isSpacePressed={isSpacePressed}
                                    isTabPressed={isTabPressed}
                                    onFocusedBoardChange={setFocusedBoardIndex}
                                    onHover={setBoardHoveredId}
                                />
                            </div>
                          </>
                        )}
                        <BottomControls
                            activeBottomPanel={activeBottomPanel} setActiveBottomPanel={setActiveBottomPanel}
                            activeColor={activeColor} setActiveColor={setActiveColor}
                            elements={elements} boardWidth={boardWidth} boardHeight={boardHeight}
                            onDeploy={handleAiDeploy}
                            onImport={handleArmyImport}
                            getViewport={() => boardRef.current?.getViewport() || null}
                            onSpawnObjectives={handleSpawnObjectives}
                            onClearObjectives={handleClearObjectives}
                            appSettings={settings} onUpdateSetting={(k, v) => setSettings(p => ({...p, [k]: v}))}
                            onShowWelcome={() => setWelcomeDismissed(false)}
                            onBackupData={handleExportState} onRestoreData={handleImportState}
                            isObjectivesLocked={isObjectivesLocked}
                            toggleObjectiveLock={() => setIsObjectivesLocked(!isObjectivesLocked)}
                            onOpenDataCards={() => setShowDataCards(true)}
                        />
                        {settings.showQuickMenu && !sidebarOpen && activeBottomPanel === 'NONE' && (
                            <QuickMenu onAdd={(type) => addElement(type, 'QUICK_MENU')} />
                        )}
                        {!welcomeDismissed && (
                            <WelcomeBanner onDismiss={() => { setWelcomeDismissed(true); safeLocalStorageSet('welcomeDismissed', 'true'); }} sidebarOpen={sidebarOpen} />
                        )}
                        <ImportSummaryToast data={importSummary} onSelect={() => {
                            if (importSummary) setSelectedIds(importSummary.ids);
                        }} onFocus={() => { /* Center view logic */ }} onDismiss={() => setImportSummary(null)} />
                        <SelectedUnitsTooltip
                            selectionData={selectionData}
                            hoverData={hoverData}
                            sidebarOpen={sidebarOpen}
                            onSelectIds={setSelectedIds}
                            onSelectUnit={(groupIds) => {
                                const ids = elements.filter(e => e.groupId && groupIds.includes(e.groupId)).map(e => e.id);
                                setSelectedIds(ids);
                            }}
                            onCenterView={(ids) => {
                                if (ids.length > 0 && boardRef.current) {
                                    const selected = elements.filter(e => ids.includes(e.id));
                                    if (selected.length > 0) {
                                        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                                        selected.forEach(e => {
                                            minX = Math.min(minX, e.x);
                                            minY = Math.min(minY, e.y);
                                            maxX = Math.max(maxX, e.x + e.width);
                                            maxY = Math.max(maxY, e.y + e.height);
                                        });
                                        const cx = (minX + maxX) / 2;
                                        const cy = (minY + maxY) / 2;
                                        const viewport = boardRef.current.getViewport();
                                        if (viewport) {
                                            const newPanX = (window.innerWidth / 2) - (cx * viewport.scale);
                                            const newPanY = (window.innerHeight / 2) - (cy * viewport.scale);
                                            boardRef.current.adjustPan({ x: newPanX, y: newPanY });
                                        }
                                    }
                                }
                            }}
                            onAdjustWounds={adjustWounds}
                            elements={elements} selectedIds={selectedIds}
                            getViewport={() => boardRef.current?.getViewport() || null}
                        />
                        <React.Suspense fallback={null}>
                          {showDataCards && (
                            <DataCardsPanel
                              isOpen={showDataCards}
                              onClose={() => setShowDataCards(false)}
                              onDeployToBoard={handleDataCardsDeploy}
                            />
                          )}
                        </React.Suspense>
                    </div>
                </div>
            )}
        </div>
      </ErrorBoundary>
    </ThemeContext.Provider>
  );
};