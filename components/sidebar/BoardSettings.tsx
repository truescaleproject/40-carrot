

import React from 'react';
import { Grid, Image as ImageIcon, Save, FolderOpen, Map as MapIcon, CopyPlus, Trash2 } from 'lucide-react';
import { PRESET_MAPS } from '../../data/presetMaps';

interface BoardSettingsProps {
    boardWidth: number;
    setBoardWidth: (val: number) => void;
    boardHeight: number;
    setBoardHeight: (val: number) => void;
    boardCount: number;
    handleResetBoard: () => void;
    isResetConfirming: boolean;
    handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>, target: 'model' | 'map') => void;
    handleClearBoardImage: () => void;
    hasBackgroundImage: boolean;
    handleExportState: () => void;
    handleImportState: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleExportTerrain: () => void;
    handleImportTerrain: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleDuplicateBoard: () => void;
    handleDeleteBattlefield: () => void;
    handleLoadPresetMap: (index: number) => void;
}

export const BoardSettings: React.FC<BoardSettingsProps> = ({
    boardWidth, setBoardWidth, boardHeight, setBoardHeight, boardCount,
    handleResetBoard, isResetConfirming, handleImageUpload, handleClearBoardImage, hasBackgroundImage,
    handleExportState, handleImportState, handleExportTerrain, handleImportTerrain,
    handleDuplicateBoard, handleDeleteBattlefield, handleLoadPresetMap
}) => {
    return (
        <div className="space-y-3">
            {/* Header / Active Size */}
            <div className="text-center pb-2 border-b border-grim-700/50">
                 <div className="text-xs font-bold text-grim-gold font-mono tracking-wider">
                    {`${boardWidth}" x ${boardHeight}" BATTLEFIELD`}
                 </div>
            </div>

            {/* Quick Start Presets - Moved to Top */}
            <div className="border-b border-grim-700/50 pb-2">
                <label className="text-[10px] text-slate-400 uppercase font-bold mb-1 block flex items-center gap-1">
                    <MapIcon size={10}/> Quick Start: Tournament Maps
                </label>
                <select
                    className="w-full bg-grim-900 border border-grim-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-grim-gold"
                    onChange={(e) => {
                        const val = e.target.value;
                        if (val !== "" && typeof handleLoadPresetMap === 'function') {
                            handleLoadPresetMap(parseInt(val, 10));
                            e.target.value = ""; // Reset selection
                        }
                    }}
                    defaultValue=""
                >
                    <option value="" disabled>Select a map to load...</option>
                    {PRESET_MAPS.map((map, idx) => (
                        <option key={idx} value={idx}>{map.name}</option>
                    ))}
                </select>
            </div>

            <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Grid size={12}/> Battlefield Count: <span className="text-[9px] bg-grim-700 px-1 rounded text-grim-gold font-bold">{boardCount}</span>
                </span>
                <div className="flex gap-1">
                     <button onClick={handleResetBoard} className={`text-xs px-2 py-0.5 rounded ${isResetConfirming ? 'bg-red-600 text-white' : 'bg-grim-700 text-slate-400 hover:text-white'}`}>
                         {isResetConfirming ? 'Confirm?' : 'Reset'}
                     </button>
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-[10px] mb-2">
                <div>
                    <label className="text-slate-500 block mb-0.5">W (in)</label>
                    <input type="number" value={boardWidth} onChange={e => setBoardWidth(Number(e.target.value))} className="w-full bg-grim-900 border border-grim-700 rounded px-1 py-0.5 text-white"/>
                </div>
                <div>
                    <label className="text-slate-500 block mb-0.5">H (in)</label>
                    <input type="number" value={boardHeight} onChange={e => setBoardHeight(Number(e.target.value))} className="w-full bg-grim-900 border border-grim-700 rounded px-1 py-0.5 text-white"/>
                </div>
            </div>
            
            <div className="space-y-1">
                <div className="flex gap-2">
                    <div className="flex-1 flex">
                        <label className={`flex-1 bg-grim-700 hover:bg-grim-600 text-slate-300 text-[10px] py-1 px-2 ${hasBackgroundImage ? 'rounded-l' : 'rounded'} cursor-pointer flex items-center justify-center gap-1 transition-colors`}>
                            <ImageIcon size={12}/> {hasBackgroundImage ? 'Change' : 'Board Img'}
                            <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'map')} />
                        </label>
                        {hasBackgroundImage && (
                            <button 
                                onClick={handleClearBoardImage}
                                className="bg-red-900/50 hover:bg-red-800 text-red-200 px-2 rounded-r flex items-center justify-center border-l border-grim-800"
                                title="Clear Background Image"
                            >
                                <Trash2 size={12} />
                            </button>
                        )}
                    </div>
                    <button onClick={handleExportState} className="flex-1 bg-grim-700 hover:bg-grim-600 text-slate-300 text-[10px] py-1 px-2 rounded flex items-center justify-center gap-1 transition-colors">
                        <Save size={12}/> Save All
                    </button>
                    <label className="flex-1 bg-grim-700 hover:bg-grim-600 text-slate-300 text-[10px] py-1 px-2 rounded cursor-pointer flex items-center justify-center gap-1 transition-colors">
                        <FolderOpen size={12}/> Load All
                        <input type="file" accept=".json" className="hidden" onChange={handleImportState} />
                    </label>
                </div>

                <div className="flex gap-2">
                     <button 
                        onClick={handleDuplicateBoard}
                        disabled={boardCount >= 9}
                        className={`flex-1 bg-grim-800 text-grim-gold text-[10px] py-1 px-2 rounded flex items-center justify-center gap-1 transition-colors border border-grim-700 ${boardCount >= 9 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-grim-700'}`}
                        title={boardCount >= 9 ? "Maximum of 9 battlefields reached" : "Duplicate current battlefield"}
                     >
                        <CopyPlus size={12}/> Add Board
                    </button>
                    {boardCount > 1 && (
                        <button 
                            onClick={handleDeleteBattlefield} 
                            className="flex-1 bg-red-900/50 hover:bg-red-800 text-red-200 text-[10px] py-1 px-2 rounded flex items-center justify-center gap-1 transition-colors border border-red-900"
                            title="Remove last battlefield"
                        >
                            <Trash2 size={12}/> Del Board
                        </button>
                    )}
                     <button onClick={handleExportTerrain} className="flex-1 bg-grim-800 hover:bg-grim-700 text-grim-gold text-[10px] py-1 px-2 rounded flex items-center justify-center gap-1 transition-colors border border-grim-700">
                        <MapIcon size={12}/> Save Map
                    </button>
                    <label className="flex-1 bg-grim-800 hover:bg-grim-700 text-grim-gold text-[10px] py-1 px-2 rounded cursor-pointer flex items-center justify-center gap-1 transition-colors border border-grim-700">
                        <FolderOpen size={12}/> Load Map
                        <input type="file" accept=".json" className="hidden" onChange={handleImportTerrain} />
                    </label>
                </div>
            </div>
        </div>
    );
};