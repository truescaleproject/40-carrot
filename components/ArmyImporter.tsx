
import React, { useState, useRef, useEffect } from 'react';
import { FileDown, Flag, Cpu, Table2, Save, Download, Trash2, Copy, HelpCircle, FileText, Plus, ChevronDown, ChevronUp, Swords, ArrowLeft, Hammer, LayoutGrid, Share } from 'lucide-react';
import { BoardElement, ElementType, ModelStats, Weapon } from '../types';
import { generateArmyCsv, parseCsvToRows, convertRowsToElements, CsvRow } from '../utils/csvUtils';
import { DEFAULT_MODEL_STATS, COLORS } from '../constants';
import { StatsInputs, WeaponsList } from './sidebar/SidebarHelpers';
import { sanitizeBoardElements } from '../utils/validation';
import { logError } from '../utils/logger';

interface ArmyImporterProps {
    isOpen: boolean;
    onToggle: () => void;
    onImport: (elements: BoardElement[], side: 'ATTACKER' | 'DEFENDER') => void;
    pixelsPerInch: number;
    elements: BoardElement[];
    onOpenDataCards: () => void;
}

type Tab = 'MENU' | 'CSV_ROSTER' | 'BUILDER';

// --- Builder Types ---
interface BuilderModel {
    id: string;
    name: string;
    count: number;
    baseSizeMm: number;
    stats: ModelStats;
    isExpanded?: boolean;
}

interface BuilderUnit {
    id: string;
    name: string;
    side: 'ATTACKER' | 'DEFENDER';
    color: string;
    models: BuilderModel[];
    isExpanded?: boolean;
}

export const ArmyImporter: React.FC<ArmyImporterProps> = ({ isOpen, onToggle, onImport, pixelsPerInch, elements, onOpenDataCards }) => {
    const [activeTab, setActiveTab] = useState<Tab>('MENU');

    // --- Import Side ---
    const [importSide, setImportSide] = useState<'ATTACKER' | 'DEFENDER'>('ATTACKER');

    // --- CSV Import State ---
    const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
    const [isCsvPreviewMode, setIsCsvPreviewMode] = useState(false);
    const [showCsvHelp, setShowCsvHelp] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Builder State ---
    const [builderUnits, setBuilderUnits] = useState<BuilderUnit[]>([]);
    const [addingModifierToWeaponId, setAddingModifierToWeaponId] = useState<string | null>(null);

    // --- Mounting Ref ---
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    // --- CSV Handlers ---

    const handleExport = (targetSide: 'ATTACKER' | 'DEFENDER' | 'ALL') => {
        const csv = generateArmyCsv(elements, targetSide, pixelsPerInch);
        if (!csv) {
            alert("No matching units found to export.");
            return;
        }
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `roster-${targetSide.toLowerCase()}-${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
    };

    const handleDownloadTemplate = () => {
        const headers = [
            'Squad Count', 'Squad Size', 'Unit Name', 'Model Name', 'Model Qty (per squad)', 'Base Size', 'Color', 
            'M', 'T', 'SV', 'W Max', 'W Current', 'LD', 'OC',
            'W1 Name', 'W1 Type', 'W1 Profile', 'W1 Traits',
            'W2 Name', 'W2 Type', 'W2 Profile', 'W2 Traits'
        ].join(',');

        const example = [
            '1,5,Squad A,Trooper,4,32,#ef4444,6",4,3+,2,2,6+,1,Rifle,RANGED,24"|2|3+|4|-1|1,Heavy,Knife,MELEE,Melee|3|3+|5|-2|1,',
            '1,5,Squad A,Sergeant,1,32,#ef4444,6",4,3+,2,2,6+,1,Pistol,RANGED,12"|1|3+|4|0|1,Pistol,,,'
        ].join('\n');

        const csvContent = `${headers}\n${example}`;
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'army-template.csv';
        a.click();
    };

    const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const result = ev.target?.result as string;
            try {
                const rows = parseCsvToRows(result);
                setCsvRows(rows);
                setIsCsvPreviewMode(true);
            } catch (err) {
                logError(err, { context: 'CSV_Parse_Error', fileSize: file.size });
                alert("Failed to parse CSV file.");
            }
        };
        reader.readAsText(file);
        if (e.target) e.target.value = '';
    };

    const updateCsvRow = (idx: number, field: string, value: string) => {
        setCsvRows(prev => prev.map((row, i) => i === idx ? { ...row, [field]: value } : row));
    };

    const deleteCsvRow = (idx: number) => {
        setCsvRows(prev => prev.filter((_, i) => i !== idx));
    };

    const confirmCsvImport = () => {
        try {
            const { elements: newElements, warnings } = convertRowsToElements(csvRows, pixelsPerInch, importSide);
            const validElements = sanitizeBoardElements(newElements);
            
            if (validElements.length === 0 && newElements.length > 0) {
                 throw new Error("CSV data conversion failed. Ensure base sizes are valid numbers.");
            }
            if (validElements.length === 0) {
                 alert("No valid units found in CSV.");
                 return;
            }

            if (warnings.length > 0) {
                alert(`Import successful with warnings:\n\n${warnings.join('\n')}`);
            }

            onImport(validElements, importSide);
            setIsCsvPreviewMode(false);
            setCsvRows([]);
            onToggle();
        } catch (e: any) {
            logError(e, { context: 'CSV_Import_Logic', rowCount: csvRows.length });
            alert(`CSV Import Failed: ${e.message}`);
        }
    };

    // --- Builder Logic ---

    const addBuilderUnit = () => {
        const unitId = Math.random().toString(36).substring(2, 11);
        const modelId = Math.random().toString(36).substring(2, 11);
        
        const newModel: BuilderModel = {
            id: modelId,
            name: "Model",
            count: 1,
            baseSizeMm: 32,
            stats: JSON.parse(JSON.stringify(DEFAULT_MODEL_STATS)),
            isExpanded: true
        };

        const newUnit: BuilderUnit = {
            id: unitId,
            name: "New Unit",
            side: importSide,
            color: importSide === 'ATTACKER' ? COLORS[0] : COLORS[1],
            models: [newModel],
            isExpanded: true
        };

        setBuilderUnits(prev => [...prev, newUnit]);
    };

    const updateBuilderUnit = (id: string, updates: Partial<BuilderUnit>) => {
        setBuilderUnits(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
    };

    const removeBuilderUnit = (id: string) => {
        setBuilderUnits(prev => prev.filter(u => u.id !== id));
    };

    const duplicateBuilderUnit = (id: string) => {
        const unitToClone = builderUnits.find(u => u.id === id);
        if (!unitToClone) return;

        const newUnitId = Math.random().toString(36).substring(2, 11);
        
        const newUnit: BuilderUnit = {
            ...unitToClone,
            id: newUnitId,
            name: `${unitToClone.name} (Copy)`,
            models: unitToClone.models.map(m => ({
                ...m,
                id: Math.random().toString(36).substring(2, 11),
                stats: JSON.parse(JSON.stringify(m.stats))
            }))
        };

        setBuilderUnits(prev => [...prev, newUnit]);
    };

    const addBuilderModel = (unitId: string) => {
        setBuilderUnits(prev => prev.map(u => {
            if (u.id !== unitId) return u;
            const modelId = Math.random().toString(36).substring(2, 11);
            const newModel: BuilderModel = {
                id: modelId,
                name: "New Model",
                count: 1,
                baseSizeMm: 32,
                stats: JSON.parse(JSON.stringify(DEFAULT_MODEL_STATS)),
                isExpanded: true
            };
            return { ...u, models: [...u.models, newModel] };
        }));
    };

    const updateBuilderModel = (unitId: string, modelId: string, updates: Partial<BuilderModel>) => {
        setBuilderUnits(prev => prev.map(u => {
            if (u.id !== unitId) return u;
            return {
                ...u,
                models: u.models.map(m => m.id === modelId ? { ...m, ...updates } : m)
            };
        }));
    };

    const removeBuilderModel = (unitId: string, modelId: string) => {
        setBuilderUnits(prev => prev.map(u => {
            if (u.id !== unitId) return u;
            return { ...u, models: u.models.filter(m => m.id !== modelId) };
        }));
    };

    const updateBuilderModelStats = (unitId: string, modelId: string, statsUpdates: Partial<ModelStats>) => {
        setBuilderUnits(prev => prev.map(u => {
            if (u.id !== unitId) return u;
            return {
                ...u,
                models: u.models.map(m => {
                    if (m.id !== modelId) return m;
                    return { ...m, stats: { ...m.stats, ...statsUpdates } };
                })
            };
        }));
    };

    const handleBuilderDeploy = () => {
        if (builderUnits.length === 0) return;
        
        const newElements: BoardElement[] = [];
        
        builderUnits.forEach(unit => {
            const groupId = `group-${Math.random().toString(36).substring(2, 11)}`;
            
            unit.models.forEach(model => {
                const widthPx = (model.baseSizeMm / 25.4) * pixelsPerInch;
                const heightPx = widthPx; 

                for (let i = 0; i < model.count; i++) {
                    newElements.push({
                        id: Math.random().toString(36).substring(2, 11),
                        type: ElementType.MODEL,
                        x: 0, 
                        y: 0,
                        width: widthPx,
                        height: heightPx,
                        rotation: 0,
                        label: model.name,
                        color: unit.side === 'ATTACKER' ? COLORS[0] : COLORS[1], 
                        strokeColor: unit.color, 
                        stats: JSON.parse(JSON.stringify(model.stats)),
                        currentWounds: parseInt(model.stats.w) || 1,
                        groupId: groupId,
                        groupLabel: unit.name,
                        side: unit.side
                    });
                }
            });
        });

        const primarySide = builderUnits[0]?.side || 'ATTACKER';
        onImport(newElements, primarySide);
        onToggle();
    };

    if (!isOpen) return null;

    return (
        <div className="w-full h-full flex flex-col bg-grim-900/50">
            {/* Header */}
            <div className="bg-grim-800 p-3 flex justify-between items-center border-b border-grim-700 shrink-0">
                <div className="flex gap-4 items-center">
                    {activeTab !== 'MENU' && (
                        <button 
                            onClick={() => setActiveTab('MENU')} 
                            className="text-text-secondary hover:text-text-primary p-1 rounded hover:bg-grim-700 transition-colors"
                            title="Back to Import Menu"
                        >
                            <ArrowLeft size={16}/>
                        </button>
                    )}
                    <h3 className="font-bold text-grim-gold flex items-center gap-2 text-sm">
                        <FileDown size={16} />
                        {activeTab === 'MENU' && 'Roster Management'}
                        {activeTab === 'BUILDER' && 'Army Builder'}
                        {activeTab === 'CSV_ROSTER' && 'CSV Import'}
                    </h3>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 flex flex-col flex-1 overflow-hidden relative">
                
                {/* --- MENU TAB --- */}
                {activeTab === 'MENU' && (
                    <div className="space-y-6 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-grim-700">
                        
                        {/* Export Roster Section - NEW */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-grim-gold uppercase tracking-wider flex items-center gap-2 border-b border-grim-800 pb-1">
                                <Share size={14} /> Export Active Roster
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                    onClick={() => handleExport('ATTACKER')}
                                    className="bg-grim-800/50 hover:bg-red-900/30 border border-grim-700 hover:border-red-500/50 p-3 rounded-lg flex flex-col items-center gap-2 transition-all group"
                                >
                                    <div className="bg-red-900/20 p-2 rounded-full border border-red-900/50 group-hover:scale-110 transition-transform">
                                        <Flag size={16} className="text-red-500 fill-current"/>
                                    </div>
                                    <span className="text-[10px] font-bold text-text-secondary uppercase">Attacker CSV</span>
                                </button>
                                <button 
                                    onClick={() => handleExport('DEFENDER')}
                                    className="bg-grim-800/50 hover:bg-blue-900/30 border border-grim-700 hover:border-blue-500/50 p-3 rounded-lg flex flex-col items-center gap-2 transition-all group"
                                >
                                    <div className="bg-blue-900/20 p-2 rounded-full border border-blue-900/50 group-hover:scale-110 transition-transform">
                                        <Flag size={16} className="text-blue-500 fill-current"/>
                                    </div>
                                    <span className="text-[10px] font-bold text-text-secondary uppercase">Defender CSV</span>
                                </button>
                            </div>
                        </div>

                        {/* Data Cards Section */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-2 border-b border-grim-800 pb-1">
                                <FileText size={14} /> Data Cards & Import
                            </h4>
                            <div
                                onClick={onOpenDataCards}
                                className="bg-grim-800/50 p-4 rounded-lg border border-grim-700 hover:border-grim-gold hover:bg-grim-800 transition-all cursor-pointer group shadow-lg"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-bold text-text-primary group-hover:text-grim-gold transition-colors">Open Data Cards</span>
                                    <div className="bg-grim-900 text-[10px] text-grim-gold px-2 py-0.5 rounded border border-grim-700 font-mono">New</div>
                                </div>
                                <p className="text-xs text-text-muted group-hover:text-text-secondary">Import from 39K.pro URLs, view/print data cards, and deploy units to the board.</p>
                            </div>
                        </div>

                        {/* Manual Section */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-2 border-b border-grim-800 pb-1">
                                <Hammer size={14} /> Manual Tools
                            </h4>
                            <div className="grid gap-3">
                                <div 
                                    onClick={() => setActiveTab('BUILDER')}
                                    className="bg-grim-800/50 p-3 rounded-lg border border-grim-700 hover:border-blue-500 hover:bg-grim-800 transition-all cursor-pointer group flex items-center gap-3"
                                >
                                    <div className="bg-grim-900 p-2 rounded text-blue-500 group-hover:text-blue-400 border border-grim-700">
                                        <LayoutGrid size={20}/>
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm text-text-primary group-hover:text-blue-400 mb-0.5">Open Army Builder</div>
                                        <p className="text-xs text-text-muted">Build and save armies by hand.</p>
                                    </div>
                                </div>

                                <div 
                                    onClick={() => setActiveTab('CSV_ROSTER')}
                                    className="bg-grim-800/50 p-3 rounded-lg border border-grim-700 hover:border-green-500 hover:bg-grim-800 transition-all cursor-pointer group flex items-center gap-3"
                                >
                                    <div className="bg-grim-900 p-2 rounded text-green-500 group-hover:text-green-400 border border-grim-700">
                                        <Table2 size={20}/>
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm text-text-primary group-hover:text-green-400 mb-0.5">Import from CSV</div>
                                        <p className="text-xs text-text-muted">Upload a structured spreadsheet (Unified v1).</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- CSV HELP MODAL --- */}
                {showCsvHelp && (
                    <div className="flex flex-col h-full bg-grim-900 z-50 p-2 animate-in fade-in zoom-in-95 duration-200 absolute inset-0">
                        <div className="flex justify-between items-center mb-4 border-b border-grim-700 pb-2">
                             <h4 className="text-sm font-bold text-grim-gold flex items-center gap-2">
                                <FileText size={16}/> CSV Format Guide
                             </h4>
                             <button onClick={() => setShowCsvHelp(false)} className="text-xs text-text-muted hover:text-text-primary">Close Guide</button>
                        </div>
                        <div className="flex-1 overflow-y-auto pr-2 space-y-4 text-xs text-text-secondary">
                            <div>
                                <h5 className="font-bold text-text-primary mb-1">Unified Roster CSV v1</h5>
                                <p className="text-text-muted mb-2">Each row defines a model type within a unit. Units are grouped by Name.</p>
                                <div className="grid grid-cols-2 gap-2 font-mono text-[10px] bg-grim-800 p-2 rounded border border-grim-700">
                                    <span>Squad Count (Number of units)</span>
                                    <span>Squad Size (Total models per unit)</span>
                                    <span>Unit Name (Group Label)</span>
                                    <span>Model Name (Individual Label)</span>
                                    <span>Model Qty (Per Squad)</span>
                                    <span>Base Size (e.g. 32)</span>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-grim-700 shrink-0">
                                 <button 
                                    onClick={handleDownloadTemplate}
                                    className="w-full bg-grim-700 hover:bg-grim-600 text-text-primary py-2 rounded text-xs font-bold flex items-center justify-center gap-2"
                                 >
                                    <Download size={14}/> Download Ready-to-Edit Template
                                 </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- BUILDER TAB --- */}
                {activeTab === 'BUILDER' && !isCsvPreviewMode && !showCsvHelp && (
                    <div className="flex flex-col h-full overflow-hidden">
                        <div className="flex justify-between items-center mb-2 pb-2 border-b border-grim-700 shrink-0">
                            <span className="text-xs text-text-muted">Construct your army list manually.</span>
                            <div className="flex gap-2">
                                <button onClick={() => setBuilderUnits([])} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"><Trash2 size={12}/> Clear All</button>
                                <button onClick={addBuilderUnit} className="bg-grim-700 hover:bg-grim-600 text-text-primary text-xs px-2 py-1 rounded flex items-center gap-1 border border-grim-600 shadow-sm"><Plus size={12}/> Add Unit</button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-grim-700">
                            {builderUnits.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-text-muted opacity-50">
                                    <Swords size={48} className="mb-2"/>
                                    <p className="text-xs font-bold">No units mustered.</p>
                                    <p className="text-[10px]">Click "Add Unit" to begin.</p>
                                </div>
                            )}
                            {builderUnits.map((unit) => (
                                <div key={unit.id} className="bg-grim-800 border border-grim-600 rounded-lg overflow-hidden transition-all duration-200">
                                    <div 
                                        className="bg-grim-700/50 p-2 flex items-center justify-between cursor-pointer hover:bg-grim-700 transition-colors"
                                        onClick={() => updateBuilderUnit(unit.id, { isExpanded: !unit.isExpanded })}
                                    >
                                        <div className="flex items-center gap-2 flex-1">
                                            {unit.isExpanded ? <ChevronUp size={14} className="text-text-muted"/> : <ChevronDown size={14} className="text-text-muted"/>}
                                            <input 
                                                value={unit.name}
                                                onChange={(e) => updateBuilderUnit(unit.id, { name: e.target.value })}
                                                onClick={(e) => e.stopPropagation()}
                                                className="bg-transparent border-b border-transparent hover:border-grim-500 focus:border-grim-gold outline-none text-sm font-bold text-text-primary w-48"
                                                placeholder="Unit Name"
                                            />
                                            <span className="text-[10px] text-text-muted ml-2">({unit.models.reduce((acc, m) => acc + m.count, 0)} Models)</span>
                                        </div>
                                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex bg-grim-900 rounded p-0.5 border border-grim-600">
                                                <button onClick={() => updateBuilderUnit(unit.id, { side: 'ATTACKER', color: COLORS[0] })} className={`p-1 rounded ${unit.side === 'ATTACKER' ? 'bg-red-900/80 text-red-200' : 'text-slate-600 hover:text-slate-400'}`} title="Attacker"><Flag size={12}/></button>
                                                <button onClick={() => updateBuilderUnit(unit.id, { side: 'DEFENDER', color: COLORS[1] })} className={`p-1 rounded ${unit.side === 'DEFENDER' ? 'bg-blue-900/80 text-blue-200' : 'text-slate-600 hover:text-slate-400'}`} title="Defender"><Flag size={12}/></button>
                                            </div>
                                            <button onClick={() => duplicateBuilderUnit(unit.id)} className="text-text-muted hover:text-blue-400 p-1" title="Duplicate Unit"><Copy size={14}/></button>
                                            <button onClick={() => removeBuilderUnit(unit.id)} className="text-text-muted hover:text-red-400 p-1"><Trash2 size={14}/></button>
                                        </div>
                                    </div>

                                    {unit.isExpanded && (
                                        <div className="p-3 space-y-3 bg-grim-900/30">
                                            {unit.models.map((model) => (
                                                <div key={model.id} className="border border-grim-700 rounded bg-grim-900/50 p-2">
                                                    <div className="flex gap-2 items-center mb-2">
                                                        <div className="flex flex-col w-12">
                                                            <label className="text-[8px] text-text-muted uppercase font-bold">Count</label>
                                                            <input type="number" min="1" value={model.count} onChange={(e) => updateBuilderModel(unit.id, model.id, { count: parseInt(e.target.value) || 1 })} className="bg-grim-800 border border-grim-600 rounded px-1 text-xs text-center text-text-primary focus:border-grim-gold outline-none"/>
                                                        </div>
                                                        <div className="flex flex-col flex-1">
                                                            <label className="text-[8px] text-text-muted uppercase font-bold">Model Name</label>
                                                            <input value={model.name} onChange={(e) => updateBuilderModel(unit.id, model.id, { name: e.target.value })} className="bg-grim-800 border border-grim-600 rounded px-2 py-0.5 text-xs text-text-primary focus:border-grim-gold outline-none"/>
                                                        </div>
                                                        <div className="flex flex-col w-16">
                                                            <label className="text-[8px] text-text-muted uppercase font-bold">Base (mm)</label>
                                                            <input type="number" value={model.baseSizeMm} onChange={(e) => updateBuilderModel(unit.id, model.id, { baseSizeMm: parseInt(e.target.value) || 32 })} className="bg-grim-800 border border-grim-600 rounded px-1 text-xs text-center text-text-primary focus:border-grim-gold outline-none"/>
                                                        </div>
                                                        <div className="flex items-end pb-0.5">
                                                            <button 
                                                                onClick={() => updateBuilderModel(unit.id, model.id, { isExpanded: !model.isExpanded })}
                                                                className={`p-1 rounded border ${model.isExpanded ? 'bg-grim-700 border-grim-500 text-grim-gold' : 'bg-grim-800 border-grim-600 text-text-muted'}`}
                                                                title="Edit Stats"
                                                            >
                                                                <Cpu size={14}/>
                                                            </button>
                                                            {unit.models.length > 1 && (
                                                                <button onClick={() => removeBuilderModel(unit.id, model.id)} className="ml-2 text-text-muted hover:text-red-400"><Trash2 size={14}/></button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {model.isExpanded && (
                                                        <div className="pt-2 border-t border-grim-700/50 animate-in slide-in-from-top-1">
                                                            <StatsInputs 
                                                                stats={model.stats} 
                                                                onUpdate={(key, val) => updateBuilderModelStats(unit.id, model.id, { [key]: val })}
                                                            />
                                                            <div className="mt-2">
                                                                <div className="flex justify-between items-center mb-1">
                                                                    <span className="text-[9px] font-bold text-text-muted uppercase">Wargear</span>
                                                                    <button 
                                                                        onClick={() => {
                                                                            const newWeapon: Weapon = {
                                                                                id: Math.random().toString(36).substring(2, 11),
                                                                                name: "New Weapon", type: 'RANGED', range: '24"', a: '1', skill: '3+', s: '4', ap: '0', d: '1', modifiers: []
                                                                            };
                                                                            updateBuilderModelStats(unit.id, model.id, { weapons: [...model.stats.weapons, newWeapon] });
                                                                        }}
                                                                        className="text-[9px] bg-grim-700 px-2 py-0.5 rounded text-white hover:bg-grim-600 border border-grim-600"
                                                                    >+ Add Weapon</button>
                                                                </div>
                                                                <WeaponsList 
                                                                    weapons={model.stats.weapons}
                                                                    onUpdate={(wid, updates) => {
                                                                        updateBuilderModelStats(unit.id, model.id, {
                                                                            weapons: model.stats.weapons.map(w => w.id === wid ? { ...w, ...updates } : w)
                                                                        });
                                                                    }}
                                                                    onRemove={(wid) => {
                                                                        updateBuilderModelStats(unit.id, model.id, {
                                                                            weapons: model.stats.weapons.filter(w => w.id !== wid)
                                                                        });
                                                                    }}
                                                                    onAddModifier={(wid, type) => {
                                                                        updateBuilderModelStats(unit.id, model.id, {
                                                                            weapons: model.stats.weapons.map(w => w.id === wid ? { ...w, modifiers: [...(w.modifiers || []), { id: Math.random().toString(), type }] } : w)
                                                                        });
                                                                    }}
                                                                    onRemoveModifier={(wid, mid) => {
                                                                        updateBuilderModelStats(unit.id, model.id, {
                                                                            weapons: model.stats.weapons.map(w => w.id === wid ? { ...w, modifiers: (w.modifiers || []).filter(m => m.id !== mid) } : w)
                                                                        });
                                                                    }}
                                                                    onUpdateModifier={(wid, mid, field, val) => {
                                                                        updateBuilderModelStats(unit.id, model.id, {
                                                                            weapons: model.stats.weapons.map(w => w.id === wid ? { ...w, modifiers: (w.modifiers || []).map(m => m.id === mid ? { ...m, [field]: val } : m) } : w)
                                                                        });
                                                                    }}
                                                                    addingModifierToWeaponId={addingModifierToWeaponId}
                                                                    setAddingModifierToWeaponId={setAddingModifierToWeaponId}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                            <button 
                                                onClick={() => addBuilderModel(unit.id)}
                                                className="w-full py-1.5 text-xs text-text-muted hover:text-text-primary border border-dashed border-grim-600 rounded hover:bg-grim-800 transition-colors flex items-center justify-center gap-1"
                                            >
                                                <Plus size={12}/> Add Another Model Profile
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="pt-4 mt-2 border-t border-grim-700 shrink-0">
                            <button 
                                onClick={handleBuilderDeploy}
                                disabled={builderUnits.length === 0}
                                className="w-full bg-grim-gold hover:bg-yellow-400 text-grim-900 py-3 rounded text-sm font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Save size={16}/> DEPLOY ARMY LIST
                            </button>
                        </div>
                    </div>
                )}

                {/* --- CSV ROSTER TAB --- */}
                {activeTab === 'CSV_ROSTER' && !isCsvPreviewMode && !showCsvHelp && (
                    <div className="flex flex-col space-y-6">
                        <div className="space-y-2">
                            <h4 className="text-xs font-bold text-text-muted uppercase flex items-center gap-2"><Download size={14}/> Export Army CSV</h4>
                            <div className="grid grid-cols-3 gap-2">
                                <button onClick={() => handleExport('ATTACKER')} className="bg-grim-800 hover:bg-grim-700 border border-grim-600 text-text-secondary py-2 rounded text-xs font-bold transition-colors">Attacker Only</button>
                                <button onClick={() => handleExport('DEFENDER')} className="bg-grim-800 hover:bg-grim-700 border border-grim-600 text-text-secondary py-2 rounded text-xs font-bold transition-colors">Defender Only</button>
                                <button onClick={() => handleExport('ALL')} className="bg-grim-700 hover:bg-grim-600 border border-grim-500 text-white py-2 rounded text-xs font-bold transition-colors">Export All</button>
                            </div>
                        </div>

                        <div className="space-y-2 border-t border-grim-700 pt-4">
                            <div className="flex justify-between items-center">
                                <h4 className="text-xs font-bold text-text-muted uppercase flex items-center gap-2"><Table2 size={14}/> Import & Edit CSV</h4>
                                <button 
                                    onClick={() => setShowCsvHelp(true)}
                                    className="text-[10px] text-grim-gold hover:text-text-primary flex items-center gap-1 bg-grim-800 px-2 py-0.5 rounded border border-grim-700"
                                >
                                    <HelpCircle size={12}/> Unit CSV Help
                                </button>
                            </div>
                            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-grim-600 border-dashed rounded cursor-pointer bg-grim-800 hover:bg-grim-700/50 transition-colors">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <FileDown size={24} className="text-text-muted mb-2"/>
                                    <p className="text-xs text-text-muted font-bold">Click to upload .csv</p>
                                </div>
                                <input ref={fileInputRef} type="file" className="hidden" accept=".csv" onChange={handleCsvUpload} />
                            </label>
                        </div>
                    </div>
                )}

                {/* --- CSV PREVIEW / EDIT MODE --- */}
                {isCsvPreviewMode && !showCsvHelp && (
                    <div className="flex flex-col h-full overflow-hidden">
                        <div className="flex justify-between items-center mb-2 shrink-0">
                            <div className="flex items-center gap-3">
                                <h4 className="text-xs font-bold text-text-muted">Roster Staging Area ({csvRows.length} rows)</h4>
                                
                                <div className="flex bg-grim-900 rounded p-0.5 border border-grim-700">
                                    <button 
                                        onClick={() => setImportSide('ATTACKER')} 
                                        className={`px-2 py-0.5 text-[10px] rounded flex items-center gap-1 ${importSide === 'ATTACKER' ? 'bg-red-900/50 text-white border border-red-500/50' : 'text-text-muted hover:text-text-primary'}`}
                                    >
                                        <Flag size={10} className={importSide === 'ATTACKER' ? 'fill-current' : ''}/> Attacker
                                    </button>
                                    <button 
                                        onClick={() => setImportSide('DEFENDER')} 
                                        className={`px-2 py-0.5 text-[10px] rounded flex items-center gap-1 ${importSide === 'DEFENDER' ? 'bg-blue-900/50 text-white border border-blue-500/50' : 'text-text-muted hover:text-text-primary'}`}
                                    >
                                        <Flag size={10} className={importSide === 'DEFENDER' ? 'fill-current' : ''}/> Defender
                                    </button>
                                </div>
                            </div>
                            <button onClick={() => { setIsCsvPreviewMode(false); setCsvRows([]); }} className="text-xs text-red-400 hover:underline">Cancel</button>
                        </div>
                        
                        <div className="flex-1 overflow-auto border border-grim-600 rounded bg-grim-800">
                            <table className="w-full text-xs text-left">
                                <thead className="text-[10px] uppercase bg-grim-900 text-text-muted sticky top-0 z-10">
                                    <tr>
                                        <th className="p-2 w-8"></th>
                                        <th className="p-2 min-w-[30px]" title="Squad Count">Count</th>
                                        <th className="p-2 min-w-[30px]" title="Squad Size">Size</th>
                                        <th className="p-2 min-w-[100px]">Unit</th>
                                        <th className="p-2 min-w-[100px]">Model</th>
                                        <th className="p-2 min-w-[30px]" title="Qty Per Squad">Qty</th>
                                        <th className="p-2 min-w-[50px]">Base</th>
                                        <th className="p-2 min-w-[40px]">W</th>
                                        <th className="p-2 min-w-[40px]">T</th>
                                        <th className="p-2 min-w-[40px]">SV</th>
                                        <th className="p-2 min-w-[40px]">OC</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-grim-700">
                                    {csvRows.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-grim-700/50 group">
                                            <td className="p-1 text-center">
                                                <button onClick={() => deleteCsvRow(idx)} className="text-text-muted hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={12}/></button>
                                            </td>
                                            <td className="p-1"><input value={row.squadCount} onChange={e => updateCsvRow(idx, 'squadCount', e.target.value)} className="w-full bg-transparent text-text-secondary focus:outline-none focus:text-text-primary border-b border-transparent focus:border-grim-500 text-center"/></td>
                                            <td className="p-1"><input value={row.squadSize} onChange={e => updateCsvRow(idx, 'squadSize', e.target.value)} className="w-full bg-transparent text-text-secondary focus:outline-none focus:text-text-primary border-b border-transparent focus:border-grim-500 text-center"/></td>
                                            <td className="p-1"><input value={row.unitName} onChange={e => updateCsvRow(idx, 'unitName', e.target.value)} className="w-full bg-transparent text-text-secondary focus:outline-none focus:text-text-primary border-b border-transparent focus:border-grim-500 font-bold"/></td>
                                            <td className="p-1"><input value={row.modelName} onChange={e => updateCsvRow(idx, 'modelName', e.target.value)} className="w-full bg-transparent text-text-secondary focus:outline-none focus:text-text-primary border-b border-transparent focus:border-grim-500"/></td>
                                            <td className="p-1"><input value={row.modelQty} onChange={e => updateCsvRow(idx, 'modelQty', e.target.value)} className="w-full bg-transparent text-text-secondary focus:outline-none focus:text-text-primary border-b border-transparent focus:border-grim-500 text-center"/></td>
                                            <td className="p-1"><input value={row.baseSize} onChange={e => updateCsvRow(idx, 'baseSize', e.target.value)} className="w-full bg-transparent text-text-secondary focus:outline-none focus:text-text-primary border-b border-transparent focus:border-grim-500 text-center"/></td>
                                            <td className="p-1"><input value={row.wMax} onChange={e => updateCsvRow(idx, 'wMax', e.target.value)} className="w-full bg-transparent text-text-secondary focus:outline-none focus:text-text-primary border-b border-transparent focus:border-grim-500 text-center"/></td>
                                            <td className="p-1"><input value={row.t} onChange={e => updateCsvRow(idx, 't', e.target.value)} className="w-full bg-transparent text-text-secondary focus:outline-none focus:text-text-primary border-b border-transparent focus:border-grim-500 text-center"/></td>
                                            <td className="p-1"><input value={row.sv} onChange={e => updateCsvRow(idx, 'sv', e.target.value)} className="w-full bg-transparent text-text-secondary focus:outline-none focus:text-text-primary border-b border-transparent focus:border-grim-500 text-center"/></td>
                                            <td className="p-1"><input value={row.oc} onChange={e => updateCsvRow(idx, 'oc', e.target.value)} className="w-full bg-transparent text-text-secondary focus:outline-none focus:text-text-primary border-b border-transparent focus:border-grim-500 text-center"/></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="pt-4 mt-2 border-t border-grim-700">
                            <button onClick={confirmCsvImport} className="w-full bg-green-700 hover:bg-green-600 text-white py-2 rounded text-xs font-bold flex items-center justify-center gap-2">
                                <Save size={14}/> Confirm Deployment as {importSide}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
