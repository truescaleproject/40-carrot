import React, { useState } from 'react';
import { Swords, Copy, Trash2, Settings, ChevronDown, ChevronUp, PlusSquare, Lightbulb } from 'lucide-react';
import { ElementType, ModelStats, Weapon, BoardElement } from '../types';
import { WorkspaceMode } from '../types/workspace';
import { BoardSettings } from './sidebar/BoardSettings';
import { CreationPanel } from './sidebar/CreationPanel';
import { EditPanelSingle } from './sidebar/EditPanelSingle';
import { EditPanelMulti } from './sidebar/EditPanelMulti';
import { UnitCompositionList } from './sidebar/UnitCompositionList';
import { WorkspaceTabs } from './workspaces/WorkspaceTabs';
import { PaintWorkspace } from './workspaces/PaintWorkspace';
import { BuildWorkspace } from './workspaces/BuildWorkspace';
import { FeatureRequestModal } from './workspaces/FeatureRequestModal';
import { COLORS, APP_VERSION } from '../constants';

interface SidebarProps {
  sidebarOpen: boolean;
  creationType: ElementType;
  setCreationType: (type: ElementType) => void;
  newElementLabel: string;
  setNewElementLabel: (label: string) => void;
  deployCount: number | '';
  setDeployCount: (count: number | '') => void;
  newElementWidth: number;
  setNewElementWidth: (width: number) => void;
  newElementHeight: number;
  setNewElementHeight: (height: number) => void;
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
  pixelsPerInch: number;
  boardWidth: number;
  setBoardWidth: (val: number) => void;
  boardHeight: number;
  setBoardHeight: (val: number) => void;
  boardCount: number;
  labelFontSize: number;
  setLabelFontSize: (val: number) => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>, target: 'model' | 'map') => void;
  handleClearBoardImage: () => void;
  hasBackgroundImage: boolean;
  handleResetBoard: () => void;
  isResetConfirming: boolean;
  handleExportState: () => void;
  handleImportState: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleExportTerrain: () => void;
  handleImportTerrain: (e: React.ChangeEvent<HTMLInputElement>) => void;
  selectedIds: string[];
  singleSelectedElement: BoardElement | null;
  hasMultipleSelected: boolean;
  isSingleGroup: boolean;
  distinctGroupIds: string[];
  groupLabel: string;
  groupColor: string;
  duplicateSelected: () => void;
  deleteSelected: () => void;
  groupSelected: () => void;
  ungroupSelected: () => void;
  updateGroupLabel: (label: string) => void;
  updateGroupColor: (color: string) => void;
  activeColor: string;
  setActiveColor: (color: string) => void;
  updateBatchColor: (color: string) => void;
  updateSelectedLabel: (label: string) => void;
  updateSelectedDimensions: (dim: 'width' | 'height', val: number) => void;
  updateSelectedRotation: (rotation: number) => void;
  removeElementImage: () => void;
  updateSelectedModelStat: (key: keyof Omit<ModelStats, 'weapons'>, val: string) => void;
  addWeapon: () => void;
  removeWeapon: (id: string) => void;
  updateWeapon: (id: string, updates: Partial<Weapon>) => void;
  addWeaponModifier: (wId: string, type: string) => void;
  removeWeaponModifier: (wId: string, mId: string) => void;
  updateWeaponModifier: (wId: string, mId: string, field: 'value' | 'keyword', val: string) => void;
  unitCompositionElements: BoardElement[];
  setSidebarHoveredId: (id: string | null) => void;
  sidebarHoveredId: string | null;
  setSelectedIds: (ids: string[]) => void;
  adjustWounds: (ids: string[], delta: number) => void;
  onHoverMove: (e: React.MouseEvent, text: string, sub?: string) => void;
  onHoverLeave: () => void;
  applyFormation: (type: 'LINE_COHERENCY' | 'BASE_TO_BASE' | 'CIRCLE', ids?: string[]) => void;
  creationSide: 'ATTACKER' | 'DEFENDER';
  setCreationSide: (side: 'ATTACKER' | 'DEFENDER') => void;
  updateSelectedSide: (side: 'ATTACKER' | 'DEFENDER') => void;
  handleDuplicateBoard: () => void;
  handleDeleteBattlefield: () => void;
  toggleLocked: (ids: string[]) => void;
  rotateGroup: (degrees: number) => void;
  startGroupRotation: () => void;
  applyGroupRotation: (angle: number) => void;
  commitGroupRotation: () => void;
  handleLoadPresetMap: (index: number) => void;
  focusedBoardIndex: number;
  updateSelectedShape: (shape: 'CIRCLE' | 'RECTANGLE') => void;
}

export const Sidebar: React.FC<SidebarProps> = (props) => {
    const {
        sidebarOpen, selectedIds, singleSelectedElement,
        setCreationType, creationType, setNewElementWidth, setNewElementHeight, pixelsPerInch,
        duplicateSelected, deleteSelected
    } = props;

    const [isBoardSettingsOpen, setIsBoardSettingsOpen] = useState(false);
    const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('PLAY');
    const [showFeatureRequest, setShowFeatureRequest] = useState(false);

    if (!sidebarOpen) return null;

    return (
        <div className="w-80 h-full bg-grim-900 border-r border-grim-700 flex flex-col overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-grim-700">
            {/* Header */}
            <div className="p-4 border-b border-grim-800 shrink-0">
                <div className="flex justify-between items-center mb-3">
                     <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-semibold italic text-grim-gold font-science tracking-widest flex items-center gap-2 drop-shadow-lg select-none">
                            <Swords size={26} strokeWidth={2.5} /> 40 CARROT
                        </h1>
                        <span className="text-[9px] font-mono text-grim-gold/50 bg-grim-gold/10 px-1.5 py-0.5 rounded-full border border-grim-gold/20 mt-1 select-none">
                            {APP_VERSION}
                        </span>
                     </div>
                     <div className="flex items-center gap-1">
                        <button
                            onClick={() => setShowFeatureRequest(true)}
                            className="p-2 rounded-full text-slate-500 hover:text-grim-gold hover:bg-grim-700 transition-colors"
                            title="Suggest a Feature"
                        >
                            <Lightbulb size={18} />
                        </button>
                        {workspaceMode === 'PLAY' && (
                            <button
                                onClick={() => setIsBoardSettingsOpen(!isBoardSettingsOpen)}
                                className={`p-2 rounded-full transition-colors ${isBoardSettingsOpen ? 'bg-grim-700 text-white' : 'text-slate-400 hover:text-white hover:bg-grim-700'}`}
                                title="Map Setup & Grid"
                            >
                                <Settings size={20} />
                            </button>
                        )}
                     </div>
                </div>

                {/* Workspace Mode Tabs */}
                <WorkspaceTabs activeMode={workspaceMode} onChange={setWorkspaceMode} />

                {/* Board Settings (Play mode only) */}
                {workspaceMode === 'PLAY' && isBoardSettingsOpen && (
                     <div className="p-2 bg-grim-900/50 animate-in slide-in-from-top-2 duration-200 border-t border-grim-800 -mx-4 px-4 pt-4 mt-3 mb-2 shadow-inner">
                         <BoardSettings
                            boardWidth={props.boardWidth} setBoardWidth={props.setBoardWidth}
                            boardHeight={props.boardHeight} setBoardHeight={props.setBoardHeight}
                            boardCount={props.boardCount}
                            handleResetBoard={props.handleResetBoard} isResetConfirming={props.isResetConfirming}
                            handleImageUpload={props.handleImageUpload}
                            handleClearBoardImage={props.handleClearBoardImage} hasBackgroundImage={props.hasBackgroundImage}
                            handleExportState={props.handleExportState} handleImportState={props.handleImportState}
                            handleExportTerrain={props.handleExportTerrain} handleImportTerrain={props.handleImportTerrain}
                            handleDuplicateBoard={props.handleDuplicateBoard}
                            handleDeleteBattlefield={props.handleDeleteBattlefield}
                            handleLoadPresetMap={props.handleLoadPresetMap}
                        />
                    </div>
                )}

                {/* Play Mode: Deploy/Edit Switcher */}
                {workspaceMode === 'PLAY' && (
                    <>
                        {selectedIds.length === 0 ? (
                            <div className="mt-3">
                                <div className="text-[10px] font-bold text-slate-500 uppercase mb-2 ml-1 flex items-center gap-1">
                                    <PlusSquare size={10}/> Deploy New Object
                                </div>
                                <div className="flex bg-grim-800 rounded p-1 mb-2">
                                    <button
                                        onClick={() => {
                                            setCreationType(ElementType.MODEL);
                                            const px = 32 / 25.4 * pixelsPerInch;
                                            setNewElementWidth(px);
                                            setNewElementHeight(px);
                                            if (props.creationSide === 'ATTACKER') {
                                                props.setActiveColor(COLORS[0]);
                                            } else {
                                                props.setActiveColor(COLORS[1]);
                                            }
                                        }}
                                        className={`flex-1 py-2 text-xs font-bold rounded transition-all ${creationType === ElementType.MODEL ? 'bg-grim-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        Unit
                                    </button>
                                    <button
                                        onClick={() => {
                                            setCreationType(ElementType.TERRAIN);
                                            setNewElementWidth(6 * pixelsPerInch);
                                            setNewElementHeight(4 * pixelsPerInch);
                                            props.setActiveColor(COLORS[6]);
                                        }}
                                        className={`flex-1 py-2 text-xs font-bold rounded transition-all ${creationType === ElementType.TERRAIN ? 'bg-grim-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        Terrain
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-grim-800 p-2 rounded text-center border border-grim-700 mt-3">
                                <span className="text-xs font-bold text-grim-gold uppercase tracking-wider">
                                    {selectedIds.length} {selectedIds.length === 1 ? 'Object' : 'Objects'} Selected
                                </span>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Content Area */}
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                {/* --- PLAY MODE --- */}
                {workspaceMode === 'PLAY' && (
                    <>
                        {selectedIds.length === 0 && (
                            <CreationPanel
                                creationType={props.creationType}
                                newElementLabel={props.newElementLabel} setNewElementLabel={props.setNewElementLabel}
                                creationSide={props.creationSide} setCreationSide={props.setCreationSide}
                                deployCount={props.deployCount} setDeployCount={props.setDeployCount}
                                newElementWidth={props.newElementWidth} setNewElementWidth={props.setNewElementWidth}
                                newElementHeight={props.newElementHeight} setNewElementHeight={props.setNewElementHeight}
                                pixelsPerInch={props.pixelsPerInch}
                                activeColor={props.activeColor} setActiveColor={props.setActiveColor}
                                isDeployStatsOpen={props.isDeployStatsOpen} setIsDeployStatsOpen={props.setIsDeployStatsOpen}
                                newElementStats={props.newElementStats} updateNewElementStat={props.updateNewElementStat}
                                newElementWeapons={props.newElementWeapons} updateNewElementWeapon={props.updateNewElementWeapon}
                                addNewElementWeapon={props.addNewElementWeapon} removeNewElementWeapon={props.removeNewElementWeapon}
                                addingModifierToWeaponId={props.addingModifierToWeaponId} setAddingModifierToWeaponId={props.setAddingModifierToWeaponId}
                                addNewElementWeaponModifier={props.addNewElementWeaponModifier} removeNewElementWeaponModifier={props.removeNewElementWeaponModifier}
                                updateNewElementWeaponModifier={props.updateNewElementWeaponModifier}
                                addElement={props.addElement}
                            />
                        )}

                        {selectedIds.length === 1 && singleSelectedElement && (
                            <EditPanelSingle
                                element={singleSelectedElement}
                                updateSelectedLabel={props.updateSelectedLabel}
                                updateSelectedSide={props.updateSelectedSide}
                                updateSelectedDimensions={props.updateSelectedDimensions}
                                updateSelectedRotation={props.updateSelectedRotation}
                                pixelsPerInch={props.pixelsPerInch}
                                updateSelectedModelStat={props.updateSelectedModelStat}
                                adjustWounds={props.adjustWounds}
                                addWeapon={props.addWeapon}
                                removeWeapon={props.removeWeapon}
                                updateWeapon={props.updateWeapon}
                                addWeaponModifier={props.addWeaponModifier}
                                removeWeaponModifier={props.removeWeaponModifier}
                                updateWeaponModifier={props.updateWeaponModifier}
                                addingModifierToWeaponId={props.addingModifierToWeaponId}
                                setAddingModifierToWeaponId={props.setAddingModifierToWeaponId}
                                removeElementImage={props.removeElementImage}
                                handleImageUpload={props.handleImageUpload}
                                updateColor={props.updateBatchColor}
                                toggleLocked={() => props.toggleLocked([singleSelectedElement.id])}
                                updateSelectedShape={props.updateSelectedShape}
                            />
                        )}

                        {selectedIds.length > 1 && (
                            <EditPanelMulti
                                activeColor={props.activeColor}
                                updateBatchColor={props.updateBatchColor}
                                isSingleGroup={props.isSingleGroup}
                                groupLabel={props.groupLabel}
                                updateGroupLabel={props.updateGroupLabel}
                                groupColor={props.groupColor}
                                updateGroupColor={props.updateGroupColor}
                                ungroupSelected={props.ungroupSelected}
                                groupSelected={props.groupSelected}
                                applyFormation={props.applyFormation}
                                updateSelectedSide={props.updateSelectedSide}
                                toggleLocked={() => props.toggleLocked(props.selectedIds)}
                                rotateGroup={props.rotateGroup}
                                startGroupRotation={props.startGroupRotation}
                                applyGroupRotation={props.applyGroupRotation}
                                commitGroupRotation={props.commitGroupRotation}
                            />
                        )}

                        {props.unitCompositionElements.length > 0 && (
                            <UnitCompositionList
                                unitCompositionElements={props.unitCompositionElements}
                                isSingleGroup={props.isSingleGroup}
                                groupLabel={props.groupLabel}
                                selectedIds={props.selectedIds}
                                setSelectedIds={props.setSelectedIds}
                                setSidebarHoveredId={props.setSidebarHoveredId}
                                adjustWounds={props.adjustWounds}
                            />
                        )}

                        {selectedIds.length > 0 && (
                            <div className="flex gap-2 pt-4 border-t border-grim-700 mt-auto">
                                <button
                                    onClick={duplicateSelected}
                                    className="flex-1 bg-blue-900/50 hover:bg-blue-800 text-blue-200 py-3 rounded text-xs font-bold border border-blue-800 flex items-center justify-center gap-1 shadow-lg"
                                >
                                    <Copy size={16}/> Duplicate
                                </button>
                                <button
                                    onClick={deleteSelected}
                                    className="flex-1 bg-red-900/50 hover:bg-red-800 text-red-200 py-3 rounded text-xs font-bold border border-red-800 flex items-center justify-center gap-1 shadow-lg"
                                >
                                    <Trash2 size={16}/> Delete
                                </button>
                            </div>
                        )}
                    </>
                )}

                {/* --- BUILD MODE --- */}
                {workspaceMode === 'BUILD' && <BuildWorkspace />}

                {/* --- PAINT MODE --- */}
                {workspaceMode === 'PAINT' && <PaintWorkspace />}
            </div>

            {/* Feature Request Modal */}
            <FeatureRequestModal isOpen={showFeatureRequest} onClose={() => setShowFeatureRequest(false)} />
        </div>
    );
};
