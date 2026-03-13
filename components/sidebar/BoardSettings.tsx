

import React, { useState, useCallback } from 'react';
import { Grid, Image as ImageIcon, Save, FolderOpen, Map as MapIcon, CopyPlus, Trash2, HardDrive, Download, Upload, Clock } from 'lucide-react';
import { PRESET_MAPS } from '../../data/presetMaps';
import { MAX_BOARD_COUNT } from '../../constants';

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
    listLocalSaves: () => { name: string; timestamp: number; size: number }[];
    saveLocal: (name: string) => boolean;
    loadLocal: (name: string) => boolean;
    deleteLocalSave: (name: string) => void;
    handleDuplicateBoard: () => void;
    handleDeleteBattlefield: () => void;
    handleLoadPresetMap: (index: number) => void;
}

export const BoardSettings: React.FC<BoardSettingsProps> = ({
    boardWidth, setBoardWidth, boardHeight, setBoardHeight, boardCount,
    handleResetBoard, isResetConfirming, handleImageUpload, handleClearBoardImage, hasBackgroundImage,
    handleExportState, handleImportState, handleExportTerrain, handleImportTerrain,
    listLocalSaves, saveLocal, loadLocal, deleteLocalSave,
    handleDuplicateBoard, handleDeleteBattlefield, handleLoadPresetMap
}) => {
    const [saveName, setSaveName] = useState('');
    const [saves, setSaves] = useState(() => listLocalSaves());
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<string | null>(null);

    const refreshSaves = useCallback(() => setSaves(listLocalSaves()), [listLocalSaves]);

    const showFeedback = (msg: string) => {
        setFeedback(msg);
        setTimeout(() => setFeedback(null), 2000);
    };

    const handleSave = () => {
        const name = saveName.trim() || `Save ${new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
        if (saveLocal(name)) {
            showFeedback('Saved!');
            setSaveName('');
            refreshSaves();
        } else {
            showFeedback('Save failed — storage may be full');
        }
    };

    const handleLoad = (name: string) => {
        if (loadLocal(name)) {
            showFeedback('Loaded!');
        } else {
            showFeedback('Failed to load');
        }
    };

    const handleDelete = (name: string) => {
        deleteLocalSave(name);
        setConfirmDelete(null);
        refreshSaves();
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes}B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    };

    const formatTime = (ts: number) => {
        if (!ts) return '';
        const d = new Date(ts);
        return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="space-y-3">
            {/* Header / Active Size */}
            <div className="text-center pb-2 border-b border-grim-700/50">
                 <div className="text-xs font-bold text-grim-gold font-mono tracking-wider">
                    {`${boardWidth}" x ${boardHeight}" BATTLEFIELD`}
                 </div>
            </div>

            {/* Local Saves */}
            <div className="border-b border-grim-700/50 pb-3">
                <label className="text-[10px] text-slate-400 uppercase font-bold mb-1.5 block flex items-center gap-1">
                    <HardDrive size={10}/> Local Saves
                </label>

                {/* Save input */}
                <div className="flex gap-1 mb-2">
                    <input
                        type="text"
                        value={saveName}
                        onChange={e => setSaveName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
                        placeholder="Save name (optional)"
                        className="flex-1 bg-grim-900 border border-grim-700 rounded px-2 py-1 text-[10px] text-white placeholder:text-slate-600 focus:outline-none focus:border-grim-gold"
                    />
                    <button
                        onClick={handleSave}
                        className="bg-grim-gold/90 hover:bg-grim-gold text-grim-900 text-[10px] font-bold px-2.5 py-1 rounded flex items-center gap-1 transition-colors shrink-0"
                    >
                        <Save size={10}/> Save
                    </button>
                </div>

                {/* Feedback toast */}
                {feedback && (
                    <div className="text-[10px] text-center text-grim-gold bg-grim-gold/10 border border-grim-gold/30 rounded px-2 py-0.5 mb-2 animate-in fade-in duration-150">
                        {feedback}
                    </div>
                )}

                {/* Save slots list */}
                {saves.length > 0 ? (
                    <div className="space-y-1 max-h-36 overflow-y-auto scrollbar-thin scrollbar-thumb-grim-700 scrollbar-track-transparent">
                        {saves.map(save => (
                            <div key={save.name} className="flex items-center gap-1 bg-grim-800/40 rounded px-2 py-1 border border-grim-700/20 group">
                                <div className="flex-1 min-w-0">
                                    <div className="text-[10px] text-slate-200 font-medium truncate" title={save.name}>{save.name}</div>
                                    <div className="text-[8px] text-slate-500 flex items-center gap-1.5">
                                        <span className="flex items-center gap-0.5"><Clock size={7}/> {formatTime(save.timestamp)}</span>
                                        <span>{formatSize(save.size)}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleLoad(save.name)}
                                    className="p-1 rounded hover:bg-grim-700 text-slate-500 hover:text-green-400 transition-colors shrink-0"
                                    title="Load this save"
                                >
                                    <FolderOpen size={11}/>
                                </button>
                                {confirmDelete === save.name ? (
                                    <button
                                        onClick={() => handleDelete(save.name)}
                                        className="p-1 rounded bg-red-900/60 text-red-300 text-[8px] font-bold shrink-0"
                                        onBlur={() => setConfirmDelete(null)}
                                    >
                                        Del?
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setConfirmDelete(save.name)}
                                        className="p-1 rounded hover:bg-grim-700 text-slate-600 hover:text-red-400 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                                        title="Delete save"
                                    >
                                        <Trash2 size={10}/>
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-[9px] text-slate-600 italic text-center py-1">No local saves yet</div>
                )}
            </div>

            {/* Quick Start Presets */}
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
                            e.target.value = "";
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
                    <button onClick={handleExportState} className="flex-1 bg-grim-700 hover:bg-grim-600 text-slate-300 text-[10px] py-1 px-2 rounded flex items-center justify-center gap-1 transition-colors" title="Download as JSON file">
                        <Download size={12}/> Export
                    </button>
                    <label className="flex-1 bg-grim-700 hover:bg-grim-600 text-slate-300 text-[10px] py-1 px-2 rounded cursor-pointer flex items-center justify-center gap-1 transition-colors" title="Import from JSON file">
                        <Upload size={12}/> Import
                        <input type="file" accept=".json" className="hidden" onChange={handleImportState} />
                    </label>
                </div>

                <div className="flex gap-2">
                     <button
                        onClick={handleDuplicateBoard}
                        disabled={boardCount >= MAX_BOARD_COUNT}
                        className={`flex-1 bg-grim-800 text-grim-gold text-[10px] py-1 px-2 rounded flex items-center justify-center gap-1 transition-colors border border-grim-700 ${boardCount >= MAX_BOARD_COUNT ? 'opacity-50 cursor-not-allowed' : 'hover:bg-grim-700'}`}
                        title={boardCount >= MAX_BOARD_COUNT ? `Maximum of ${MAX_BOARD_COUNT} battlefields reached` : "Duplicate current battlefield"}
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
