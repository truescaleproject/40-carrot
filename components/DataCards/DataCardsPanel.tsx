
import React, { useState, useMemo, useRef } from 'react';
import { datasheetService } from '../../services/datasheetService';
import { UnitCardData, ParsedArmyListEntry } from '../../types/dataCards';
import { DataCard } from './DataCard';
import { EditUnitModal } from './EditUnitModal';
import { PrintPreviewModal } from './PrintPreview';
import { UnitSelectionModal } from './UnitSelectionModal';
import { parseUrlList } from '../../utils/parseUrlList';
import { cacheService } from '../../services/cacheService';
import { generateCSV, parseCSV } from '../../utils/dataCardsCsvUtils';
import {
  Printer, Loader2, Trash2, Plus, LayoutGrid, FileText, Link as LinkIcon,
  Settings, Database, Download, Upload, FileSpreadsheet, SlidersHorizontal,
  Swords, Shield, Send, HelpCircle, ArrowLeft
} from 'lucide-react';

interface DataCardsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onDeployToBoard: (units: UnitCardData[], side: 'ATTACKER' | 'DEFENDER') => void;
}

export const DataCardsPanel: React.FC<DataCardsPanelProps> = ({ isOpen, onClose, onDeployToBoard }) => {
  const [inputMode, setInputMode] = useState<'text' | 'urls'>('text');
  const [armyList, setArmyList] = useState('');
  const [urlList, setUrlList] = useState('');

  const [units, setUnits] = useState<UnitCardData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [smartLayout, setSmartLayout] = useState(true);
  const [cardSize, setCardSize] = useState({ width: 5.5, height: 3.5 });

  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [estimatedSeconds, setEstimatedSeconds] = useState<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const [parsedUnits, setParsedUnits] = useState<ParsedArmyListEntry[]>([]);
  const [showSelectionModal, setShowSelectionModal] = useState(false);

  const [editingUnit, setEditingUnit] = useState<UnitCardData | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [deploySide, setDeploySide] = useState<'ATTACKER' | 'DEFENDER'>('ATTACKER');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const updateProgressAndEstimate = (current: number, total: number) => {
    setProgress({ current, total });
    if (current > 0) {
      const elapsedMs = Date.now() - startTimeRef.current;
      if (elapsedMs > 500) {
        const msPerItem = elapsedMs / current;
        const remainingItems = total - current;
        const remainingSecs = Math.ceil((remainingItems * msPerItem) / 1000);
        setEstimatedSeconds(remainingSecs);
      }
    }
  };

  const handleConfirmSelection = async (finalList: ParsedArmyListEntry[]) => {
    setShowSelectionModal(false);
    setLoading(true);
    setEstimatedSeconds(null);
    startTimeRef.current = Date.now();

    try {
      // Create stub cards from parsed entries — user fills in via URL auto-fill or manual
      const stubs: UnitCardData[] = finalList.map((entry, i) => ({
        id: `stub-${Date.now()}-${i}`,
        name: entry.name,
        baseSize: '32mm',
        stats: { m: '-', t: '-', sv: '-', w: '-', ld: '-', oc: '-' },
        rangedWeapons: [],
        meleeWeapons: [],
        abilities: [],
        keywords: [],
        factionKeywords: [],
        squadCount: 1,
        modelCount: entry.count,
        modelsPerSquad: [entry.count],
        composition: entry.composition,
      }));

      setUnits(prev => {
        const existingNames = new Set(prev.map(u => u.name.trim().toLowerCase()));
        const uniqueNew = stubs.filter(u => !existingNames.has(u.name.trim().toLowerCase()));
        return [...prev, ...uniqueNew];
      });
      setArmyList('');
    } catch {
      setError('Failed to process army list.');
    } finally {
      setLoading(false);
      setProgress(null);
      setEstimatedSeconds(null);
    }
  };

  const handleGenerate = async (reviewMode: boolean = false) => {
    const isUrlMode = inputMode === 'urls';
    const inputContent = isUrlMode ? urlList : armyList;
    if (!inputContent.trim()) return;

    setLoading(true);
    setError(null);
    setEstimatedSeconds(null);
    startTimeRef.current = Date.now();

    try {
      if (isUrlMode) {
        const urls = parseUrlList(inputContent);
        if (urls.length === 0) { setLoading(false); return; }

        updateProgressAndEstimate(0, urls.length);

        await datasheetService.fetchUnitsFromUrls(
          urls,
          (curr: number, total: number) => updateProgressAndEstimate(curr, total),
          (newUnit: UnitCardData) => {
            setUnits(prev => {
              const existingNames = new Set(prev.map(u => u.name.trim().toLowerCase()));
              if (!existingNames.has(newUnit.name.trim().toLowerCase())) {
                return [...prev, newUnit];
              }
              return prev;
            });
          }
        );
        setUrlList('');
        setLoading(false);
      } else {
        const parsed = datasheetService.parseArmyList(inputContent);
        if (reviewMode) {
          setParsedUnits(parsed);
          setShowSelectionModal(true);
          setLoading(false);
        } else {
          await handleConfirmSelection(parsed);
        }
      }
    } catch {
      setError('Failed to process. Check your input and try again.');
      setLoading(false);
    }
  };

  const handleUpdateUnit = (updatedUnit: UnitCardData) => {
    setUnits(prev => prev.map(u => u.id === updatedUnit.id ? updatedUnit : u));
  };

  const handleDeleteUnit = (id: string) => {
    setUnits(prev => prev.filter(u => u.id !== id));
    setEditingUnit(null);
  };

  const handleClearAll = () => {
    if (confirm('Delete all units?')) setUnits([]);
  };

  const handleClearCache = () => {
    if (confirm('Clear local cache? This will force re-fetching for all URLs next time.')) {
      cacheService.clear();
    }
  };

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(units, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `datacards-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const blob = new Blob([generateCSV(units)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `datacards-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        let importedUnits: UnitCardData[] = [];
        if (file.name.toLowerCase().endsWith('.csv')) {
          importedUnits = parseCSV(content);
        } else {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) { importedUnits = parsed; }
          else { alert('Invalid JSON format. Expected an array of units.'); return; }
        }
        const sanitized: UnitCardData[] = importedUnits.map((u: any, i: number) => {
          const sqCount = u.squadCount ?? 1;
          let mps = u.modelsPerSquad || [];
          if (mps.length !== sqCount) mps = Array(sqCount).fill(u.modelCount ?? 1);
          return {
            ...u,
            id: `imported-${Date.now()}-${i}`,
            baseSize: u.baseSize || '32mm',
            stats: u.stats || { m: '-', t: '-', sv: '-', w: '-', ld: '-', oc: '-' },
            rangedWeapons: u.rangedWeapons || [],
            meleeWeapons: u.meleeWeapons || [],
            abilities: u.abilities || [],
            keywords: u.keywords || [],
            factionKeywords: u.factionKeywords || [],
            squadCount: sqCount,
            modelCount: mps[0] || u.modelCount || 1,
            modelsPerSquad: mps,
          };
        });
        setUnits(prev => [...prev, ...sanitized]);
      } catch {
        alert('Failed to parse file.');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const addEmptyCard = () => {
    setUnits(prev => [...prev, {
      id: `manual-${Date.now()}`,
      name: 'New Unit',
      baseSize: '32mm',
      stats: { m: '6"', t: '4', sv: '3+', w: '2', ld: '6+', oc: '1' },
      rangedWeapons: [],
      meleeWeapons: [],
      abilities: [],
      keywords: [],
      factionKeywords: [],
      squadCount: 1,
      modelCount: 1,
      modelsPerSquad: [1],
    }]);
  };

  // Card layout algorithm (from grimdark)
  const pages = useMemo(() => {
    const PPI = 96;
    const CARD_H = cardSize.height * PPI;
    const AVAIL = CARD_H - 4;

    const getUnitHeight = (u: UnitCardData) => {
      let h = 35;
      if (u.abilities.length > 0) {
        h += 4;
        const colW = (cardSize.width / 2) * PPI;
        const cpl = Math.floor(colW / 4.2);
        const tc = u.abilities.reduce((s, a) => s + a.name.length + (a.description ? a.description.length + 2 : 0) + 3, 0);
        h += Math.ceil(tc / cpl) * 8 + 1;
      }
      u.rangedWeapons.forEach(w => { h += (w.keywords?.length || 0) > 25 ? 20 : 14; });
      u.meleeWeapons.forEach(w => { h += (w.keywords?.length || 0) > 25 ? 20 : 14; });
      return h;
    };

    interface PS { col1: UnitCardData[]; col1Used: number; col2: UnitCardData[]; col2Used: number; }
    const out: PS[] = [];

    const placeSmart = (unit: UnitCardData, height: number) => {
      for (const p of out) {
        if (p.col1Used + height <= AVAIL) { p.col1.push(unit); p.col1Used += height; return; }
        if (p.col2Used + height <= AVAIL) { p.col2.push(unit); p.col2Used += height; return; }
      }
      out.push({ col1: [unit], col1Used: height, col2: [], col2Used: 0 });
    };

    const placeStream = (unit: UnitCardData, height: number) => {
      let p = out[out.length - 1];
      if (!p) { p = { col1: [], col1Used: 0, col2: [], col2Used: 0 }; out.push(p); }
      if (p.col1Used + height <= AVAIL) { p.col1.push(unit); p.col1Used += height; }
      else if (p.col2Used + height <= AVAIL) { p.col2.push(unit); p.col2Used += height; }
      else { out.push({ col1: [unit], col1Used: height, col2: [], col2Used: 0 }); }
    };

    if (smartLayout) {
      [...units].sort((a, b) => getUnitHeight(b) - getUnitHeight(a)).forEach(u => placeSmart(u, getUnitHeight(u)));
    } else {
      units.forEach(u => placeStream(u, getUnitHeight(u)));
    }
    return out;
  }, [units, smartLayout, cardSize.height, cardSize.width]);

  return (
    <div className="flex flex-col h-full w-full bg-grim-900 print:hidden">

      {/* Top Bar */}
      <header className="bg-grim-900 border-b border-grim-700 px-4 py-2 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-bold px-2 py-1.5 rounded hover:bg-grim-800 transition-colors" title="Back to Battlefield">
            <ArrowLeft size={16} /> Battlefield
          </button>
          <div className="h-5 w-px bg-grim-700" />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-grim-gold rounded flex items-center justify-center text-grim-900 font-black text-[10px] select-none">DC</div>
            <h1 className="text-sm font-bold text-white font-['Chakra_Petch'] leading-none">Data Cards</h1>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <button onClick={() => setShowHelp(!showHelp)} className="text-slate-400 hover:text-white p-1"><HelpCircle size={16} /></button>
          <button onClick={() => setIsPrintModalOpen(true)} disabled={units.length === 0} className="px-3 py-1.5 rounded flex items-center gap-2 text-xs font-bold bg-grim-gold text-grim-900 hover:bg-yellow-400 disabled:bg-grim-800 disabled:text-slate-600">
            <Printer size={14} /> Print
          </button>
        </div>
      </header>

      {/* Help Panel */}
      {showHelp && (
        <div className="bg-blue-950/60 border-b border-blue-900/50 px-6 py-3 text-xs text-blue-200 space-y-1 shrink-0">
          <p className="font-bold text-blue-100">How to Import from 39K.pro:</p>
          <ol className="list-decimal list-inside space-y-0.5 text-blue-300">
            <li>Go to <span className="font-mono text-blue-100">39k.pro</span> and find your unit's datasheet page.</li>
            <li>Copy the URL from the address bar (e.g. <span className="font-mono text-blue-100">https://39k.pro/datasheet/space-marines/intercessors</span>).</li>
            <li>Switch to the <strong>URLs</strong> tab, paste one URL per line, and click <strong>Import from URLs</strong>.</li>
            <li>Stats, weapons, and abilities are automatically extracted. Click any unit on the card to edit.</li>
          </ol>
          <p className="text-blue-400 mt-1">You can also paste a Battlescribe/Official App army list in the <strong>Army List</strong> tab to create stub cards, then auto-fill each from a URL.</p>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

        {/* Sidebar */}
        <div className="w-full md:w-80 bg-grim-900 border-r border-grim-800 p-4 flex flex-col gap-3 overflow-y-auto shrink-0">

          {/* Input Mode Tabs */}
          <div className="flex bg-grim-800 p-1 rounded-lg border border-grim-700">
            <button onClick={() => setInputMode('text')} className={`flex-1 py-1.5 text-xs font-bold rounded flex justify-center gap-2 items-center ${inputMode === 'text' ? 'bg-grim-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>
              <FileText size={12} /> Army List
            </button>
            <button onClick={() => setInputMode('urls')} className={`flex-1 py-1.5 text-xs font-bold rounded flex justify-center gap-2 items-center ${inputMode === 'urls' ? 'bg-grim-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>
              <LinkIcon size={12} /> URLs
            </button>
          </div>

          {/* Text Area */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400">
              {inputMode === 'text' ? 'Paste Army List (Battlescribe / Official App)' : 'Paste 39K.pro URLs (one per line)'}
            </label>
            <textarea
              className="w-full h-36 bg-grim-800 border border-grim-700 rounded p-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-grim-gold resize-y font-mono"
              placeholder={inputMode === 'text' ? 'Paste army list text here...' : 'https://39k.pro/datasheet/space-marines/intercessors\nhttps://39k.pro/datasheet/...'}
              value={inputMode === 'text' ? armyList : urlList}
              onChange={(e) => inputMode === 'text' ? setArmyList(e.target.value) : setUrlList(e.target.value)}
            />
          </div>

          {/* Generate / Import Button */}
          <div className="space-y-2">
            <button
              onClick={() => handleGenerate(false)}
              disabled={loading || (inputMode === 'text' ? !armyList.trim() : !urlList.trim())}
              className="w-full py-2 bg-blue-700 hover:bg-blue-600 disabled:bg-grim-800 disabled:text-slate-600 text-white rounded font-bold text-xs flex justify-center items-center gap-2 relative overflow-hidden"
            >
              {loading && progress ? (
                <>
                  <div className="absolute left-0 top-0 bottom-0 bg-blue-500 transition-all duration-300" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
                  <div className="relative flex items-center gap-2 z-10">
                    <Loader2 className="animate-spin" size={14} />
                    <span>Processing {progress.current}/{progress.total}</span>
                    {estimatedSeconds !== null && <span className="text-blue-200 text-[10px]">~{estimatedSeconds}s</span>}
                  </div>
                </>
              ) : loading ? (
                <><Loader2 className="animate-spin" size={14} /> Parsing...</>
              ) : (inputMode === 'text' ? 'Parse Army List' : 'Import from URLs')}
            </button>

            {inputMode === 'text' && !loading && (
              <button
                onClick={() => handleGenerate(true)}
                disabled={!armyList.trim()}
                className="w-full py-1.5 bg-grim-800 hover:bg-grim-700 disabled:text-slate-600 text-slate-300 rounded border border-grim-600 flex justify-center items-center gap-2 text-xs"
              >
                <SlidersHorizontal size={12} /> Review & Fine Tune
              </button>
            )}
          </div>

          {error && <div className="text-red-400 text-xs bg-red-950/30 p-2 rounded">{error}</div>}

          {/* Deploy to Board */}
          {units.length > 0 && (
            <div className="bg-grim-800/50 p-3 rounded border border-grim-700 space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Deploy to Board</label>
              <div className="flex bg-grim-900 rounded p-0.5 border border-grim-600">
                <button
                  onClick={() => setDeploySide('ATTACKER')}
                  className={`flex-1 py-1.5 rounded text-xs font-bold flex items-center justify-center gap-1 ${deploySide === 'ATTACKER' ? 'bg-red-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <Swords size={12} /> Attacker
                </button>
                <button
                  onClick={() => setDeploySide('DEFENDER')}
                  className={`flex-1 py-1.5 rounded text-xs font-bold flex items-center justify-center gap-1 ${deploySide === 'DEFENDER' ? 'bg-blue-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <Shield size={12} /> Defender
                </button>
              </div>
              <button
                onClick={() => onDeployToBoard(units, deploySide)}
                className="w-full py-2 bg-green-700 hover:bg-green-600 text-white rounded font-bold text-xs flex justify-center items-center gap-2"
              >
                <Send size={14} /> Deploy {units.length} Unit{units.length !== 1 ? 's' : ''} to Board
              </button>
            </div>
          )}

          {/* Bottom Controls */}
          <div className="border-t border-grim-800 pt-3 mt-auto space-y-3">

            {/* Import/Export */}
            <div className="flex gap-2">
              <button onClick={handleExportJSON} className="flex-1 py-1.5 bg-grim-800 hover:bg-grim-700 text-slate-400 rounded border border-grim-600 flex justify-center items-center gap-1 text-[10px]" title="Export JSON">
                <Download size={12} /> JSON
              </button>
              <button onClick={handleExportCSV} className="flex-1 py-1.5 bg-grim-800 hover:bg-grim-700 text-slate-400 rounded border border-grim-600 flex justify-center items-center gap-1 text-[10px]" title="Export CSV">
                <FileSpreadsheet size={12} /> CSV
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-1.5 bg-grim-800 hover:bg-grim-700 text-slate-400 rounded border border-grim-600 flex justify-center items-center gap-1 text-[10px]" title="Import JSON/CSV">
                <Upload size={12} /> Import
              </button>
              <input type="file" ref={fileInputRef} onChange={handleImportFile} className="hidden" accept=".json,.csv" />
            </div>

            {/* Card Size */}
            <div className="bg-grim-800/50 p-2 rounded border border-grim-700/50 space-y-1">
              <div className="flex items-center gap-2 text-slate-500">
                <Settings size={10} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Card Size (in)</span>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[9px] text-slate-600">W</label>
                  <input type="number" step="0.25" min="2" max="12" value={cardSize.width} onChange={e => setCardSize(s => ({ ...s, width: Number(e.target.value) }))} className="w-full bg-grim-900 border border-grim-600 rounded px-2 py-0.5 text-xs text-white focus:border-grim-gold outline-none" />
                </div>
                <div className="flex-1">
                  <label className="text-[9px] text-slate-600">H</label>
                  <input type="number" step="0.25" min="2" max="12" value={cardSize.height} onChange={e => setCardSize(s => ({ ...s, height: Number(e.target.value) }))} className="w-full bg-grim-900 border border-grim-600 rounded px-2 py-0.5 text-xs text-white focus:border-grim-gold outline-none" />
                </div>
              </div>
            </div>

            {/* Cache + Layout */}
            <div className="flex gap-2">
              <button onClick={handleClearCache} className="flex-1 py-1.5 bg-grim-800 hover:bg-grim-700 text-slate-500 rounded border border-grim-600 flex justify-center items-center gap-1 text-[10px]">
                <Database size={10} /> Clear Cache
              </button>
              <button onClick={() => setSmartLayout(!smartLayout)} className={`flex-1 py-1.5 rounded border flex justify-center items-center gap-1 text-[10px] ${smartLayout ? 'bg-purple-900/50 border-purple-500 text-purple-200' : 'bg-grim-800 border-grim-600 text-slate-500'}`}>
                <LayoutGrid size={10} /> {smartLayout ? 'Smart: ON' : 'Smart: OFF'}
              </button>
            </div>

            <button onClick={addEmptyCard} className="w-full py-1.5 bg-grim-800 hover:bg-grim-700 text-slate-300 rounded border border-grim-600 flex justify-center items-center gap-2 text-xs">
              <Plus size={12} /> Add Unit Manually
            </button>

            {units.length > 0 && (
              <button onClick={handleClearAll} className="w-full py-1.5 text-red-400 hover:bg-red-900/20 rounded flex justify-center items-center gap-2 text-xs">
                <Trash2 size={12} /> Clear All ({units.length})
              </button>
            )}

            <div className="text-[10px] text-slate-600 text-center">
              Units: {units.length} | Cards: {pages.length}
            </div>
          </div>
        </div>

        {/* Card Canvas */}
        <div className="flex-1 bg-grim-800 p-6 overflow-y-auto">
          {units.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-2">
              <p className="text-sm">No units yet. Paste an army list or URLs to get started.</p>
              <p className="text-xs text-slate-700">Click the <HelpCircle size={12} className="inline" /> icon above for import instructions.</p>
            </div>
          ) : (
            <div className="flex flex-wrap content-start gap-4 justify-center">
              {pages.map((page, idx) => (
                <div key={idx} className="mb-4 inline-block shadow-lg">
                  <DataCard
                    column1={page.col1}
                    column2={page.col2}
                    onEditUnit={setEditingUnit}
                    pageNumber={idx + 1}
                    width={cardSize.width}
                    height={cardSize.height}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingUnit && (
        <EditUnitModal
          unit={editingUnit}
          isOpen={true}
          onClose={() => setEditingUnit(null)}
          onSave={handleUpdateUnit}
          onDelete={handleDeleteUnit}
        />
      )}

      {/* Selection Modal */}
      <UnitSelectionModal
        isOpen={showSelectionModal}
        parsedUnits={parsedUnits}
        onClose={() => setShowSelectionModal(false)}
        onConfirm={handleConfirmSelection}
      />

      {/* Print Preview */}
      <PrintPreviewModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        cards={pages}
        cardWidth={cardSize.width}
        cardHeight={cardSize.height}
      />
    </div>
  );
};
