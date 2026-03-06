import React, { useState, useEffect } from 'react';
import { UnitCardData, WeaponStats, Ability } from '../../types/dataCards';
import { datasheetService } from '../../services/datasheetService';
import { normalizeStat } from '../../utils/statUtils';
import { Save, X, Trash, Globe, Loader2, Download, FileText, Clipboard, Sparkles, BoxSelect, Users, Copy } from 'lucide-react';

interface EditUnitModalProps {
  unit: UnitCardData;
  isOpen: boolean;
  onClose: () => void;
  onSave: (unit: UnitCardData) => void;
  onDelete: (id: string) => void;
}

export const EditUnitModal: React.FC<EditUnitModalProps> = ({ unit, isOpen, onClose, onSave, onDelete }) => {
  const [data, setData] = useState<UnitCardData>(unit);
  const [abilitiesText, setAbilitiesText] = useState('');

  // URL Fetch State
  const [url, setUrl] = useState('');
  const [targetName, setTargetName] = useState('');
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Full Import State
  const [showFullImport, setShowFullImport] = useState(false);
  const [fullImportText, setFullImportText] = useState('');

  // Stats Import State
  const [showStatsImport, setShowStatsImport] = useState(false);
  const [statsImportText, setStatsImportText] = useState('');

  // Weapon Import State
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');

  useEffect(() => {
    // Initialize modelsPerSquad if missing
    const count = unit.squadCount ?? 1;
    let mps = unit.modelsPerSquad || [];

    // If mismatch, reconcile
    if (mps.length !== count) {
         const defaultModels = unit.modelCount ?? 1;
         // Try to preserve existing, fill rest with last known or default
         const newMps = [...mps];
         while(newMps.length < count) {
             newMps.push(newMps.length > 0 ? newMps[newMps.length - 1] : defaultModels);
         }
         mps = newMps.slice(0, count);
    }

    setData({ ...unit, modelsPerSquad: mps });

    // Initialize text from unit, handling the format Name: Description
    const text = unit.abilities?.map(a => {
        return a.description ? `${a.name}: ${a.description}` : a.name;
    }).join('\n') || '';
    setAbilitiesText(text);

    // Pre-fill target name if valid
    if (unit.name && unit.name !== "New Unit" && unit.name !== "Unknown Unit") {
        setTargetName(unit.name);
    } else {
        setTargetName('');
    }
  }, [unit]);

  if (!isOpen) return null;

  const handleStatChange = (stat: string, val: string) => {
    setData(prev => ({ ...prev, stats: { ...prev.stats, [stat]: val } }));
  };

  const handleStatBlur = (stat: string) => {
    const rawVal = data.stats?.[stat as keyof typeof data.stats];
    if (rawVal) {
      const normalized = normalizeStat(rawVal, stat.toUpperCase() as any);
      handleStatChange(stat, normalized);
    }
  };

  const handleInvulnChange = (val: string) => {
    setData(prev => ({ ...prev, invuln: val }));
  };

  const handleInvulnBlur = () => {
    if (data.invuln) {
      const normalized = normalizeStat(data.invuln, 'INV');
      handleInvulnChange(normalized === '-' ? '' : normalized);
    }
  };

  const handleSquadCountChange = (val: string) => {
      const newCount = parseInt(val) || 1;
      if (newCount < 1) return;

      const currentModels = data.modelsPerSquad || [data.modelCount || 1];
      let newModels = [...currentModels];

      if (newCount > newModels.length) {
          const lastVal = newModels[newModels.length - 1] || 1;
          while (newModels.length < newCount) {
              newModels.push(lastVal);
          }
      } else if (newCount < newModels.length) {
          newModels = newModels.slice(0, newCount);
      }

      setData(prev => ({
          ...prev,
          squadCount: newCount,
          modelsPerSquad: newModels,
          modelCount: newModels[0] // Sync legacy field
      }));
  };

  const handleModelCountChange = (index: number, val: string) => {
      const num = parseInt(val) || 1;
      const newModels = [...(data.modelsPerSquad || [1])];
      newModels[index] = num;

      setData(prev => ({
          ...prev,
          modelsPerSquad: newModels,
          modelCount: newModels[0] // Sync legacy field
      }));
  };

  // --- FULL IMPORT LOGIC ---
  const handleFullImport = () => {
      const text = fullImportText;
      const lines = text.split('\n').map(l => l.trim()).filter(l => l);
      if (lines.length === 0) return;

      let newName = data.name;
      let newStats = { ...data.stats };
      let newInvuln = data.invuln;
      let newRanged: any[] = [];
      let newMelee: any[] = [];
      let newAbilities: any[] = [];
      let newFactionKeywords: string[] = [];

      const rangedHeaderIdx = lines.findIndex(l => /Ranged Weapons/i.test(l));
      const meleeHeaderIdx = lines.findIndex(l => /Melee Weapons/i.test(l));
      const abilitiesHeaderIdx = lines.findIndex(l => /Abilities/i.test(l));

      const statsEnd = rangedHeaderIdx !== -1 ? rangedHeaderIdx : (meleeHeaderIdx !== -1 ? meleeHeaderIdx : (abilitiesHeaderIdx !== -1 ? abilitiesHeaderIdx : lines.length));

      const statsLines = lines.slice(0, statsEnd);
      const statHeadersRegex = /^(M|T|SV|W|LD|OC|MOVEMENT|TOUGHNESS|SAVE|WOUNDS|LEADERSHIP)$/i;
      const valueLines = statsLines.filter(l => !statHeadersRegex.test(l));

      if (valueLines.length > 0) {
          const invIdx = valueLines.findIndex(l => /Invulnerable save/i.test(l));
          if (invIdx !== -1) {
             const m = valueLines[invIdx].match(/(\d+\+)/);
             if (m) newInvuln = m[1];
             valueLines.splice(invIdx, 1);
          }

          if (valueLines.length > 0 && !/^(\d+"?|\d+\+)$/.test(valueLines[0])) {
              newName = valueLines[0];
              valueLines.shift();
          }

          const isStat = (l: string) => /^(\d+"?|\d+\+|-\s*)$/.test(l);
          const statsFound = valueLines.filter(isStat);

          if (statsFound.length >= 6) {
               newStats.m = normalizeStat(statsFound[0], 'M');
               newStats.t = normalizeStat(statsFound[1], 'T');
               newStats.sv = normalizeStat(statsFound[2], 'SV');
               newStats.w = normalizeStat(statsFound[3], 'W');
               newStats.ld = normalizeStat(statsFound[4], 'LD');
               newStats.oc = normalizeStat(statsFound[5], 'OC');
          }
      }

      const parseWeapons = (start: number, end: number) => {
          if (start === -1) return [];
          const sectionLines = lines.slice(start + 1, end === -1 ? lines.length : end);
          const wHeaders = /^(Range|A|WS|BS|S|AP|D|Keywords)$/i;
          const dataLines = sectionLines.filter(l => !wHeaders.test(l));

          const weapons = [];
          const isRange = (l: string) => /^\d+"$/.test(l) || /^Melee$/i.test(l) || /^N\/A$/i.test(l);

          for (let i = 0; i < dataLines.length; i++) {
              if (isRange(dataLines[i])) {
                  const rangeIdx = i;
                  if (rangeIdx > 0) {
                     let name = dataLines[rangeIdx - 1];
                     name = name.replace(/^[\u2022-\u25FF\u2700-\u27BF\uD83E\uDC36]\s*/, '');

                     const range = dataLines[rangeIdx];
                     const attacks = dataLines[rangeIdx+1] || '-';
                     const skill = dataLines[rangeIdx+2] || '-';
                     const strength = dataLines[rangeIdx+3] || '-';
                     const ap = dataLines[rangeIdx+4] || '-';
                     const damage = dataLines[rangeIdx+5] || '-';

                     let keywords = "-";
                     const potentialKeywords = dataLines[rangeIdx+6];

                     if (potentialKeywords && !isRange(potentialKeywords)) {
                         keywords = potentialKeywords;
                         i += 6;
                     } else {
                         i += 5;
                     }

                     weapons.push({
                         id: `imp-w-${Date.now()}-${weapons.length}`,
                         name, range, attacks, skill, strength, ap, damage, keywords
                     });
                  }
              }
          }
          return weapons;
      };

      if (rangedHeaderIdx !== -1) {
          const end = meleeHeaderIdx !== -1 ? meleeHeaderIdx : abilitiesHeaderIdx;
          newRanged = parseWeapons(rangedHeaderIdx, end);
      }

      if (meleeHeaderIdx !== -1) {
          const end = abilitiesHeaderIdx;
          newMelee = parseWeapons(meleeHeaderIdx, end);
      }

      if (abilitiesHeaderIdx !== -1) {
          const abLines = lines.slice(abilitiesHeaderIdx + 1);
          const cleanLines = abLines.filter(l => !/^(Faction Abilities:|Datasheet Abilities:|Abilities)$/i.test(l));

          for (let i = 0; i < cleanLines.length; i++) {
              const l = cleanLines[i];
              const next = cleanLines[i+1];

              if (l === "Oath of Moment" || l === "Synapse") {
                  if (!newFactionKeywords.includes(l)) newFactionKeywords.push(l);
                  continue;
              }

              if (next && next.length > 40) {
                   newAbilities.push({
                       id: `imp-ab-${Date.now()}-${i}`,
                       name: l,
                       description: next
                   });
                   i++;
              } else {
                   newAbilities.push({
                       id: `imp-ab-${Date.now()}-${i}`,
                       name: l,
                       description: ""
                   });
              }
          }
      }

      setData(prev => ({
          ...prev,
          name: newName,
          stats: newStats,
          invuln: newInvuln,
          rangedWeapons: newRanged.length ? newRanged : prev.rangedWeapons,
          meleeWeapons: newMelee.length ? newMelee : prev.meleeWeapons,
          abilities: newAbilities.length ? newAbilities : prev.abilities,
          factionKeywords: newFactionKeywords.length ? newFactionKeywords : prev.factionKeywords
      }));

      const abText = newAbilities.map(a => a.description ? `${a.name}: ${a.description}` : a.name).join('\n');
      setAbilitiesText(abText);
      setShowFullImport(false);
      setFullImportText('');
  };

  const handleImportStats = () => {
      const text = statsImportText;
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length === 0) return;

      const firstLine = lines[0];
      const isHeader = /^(M|T|SV|W|LD|OC|MOVEMENT|TOUGHNESS|SAVE|WOUNDS|LEADERSHIP|OC)$/i.test(firstLine);
      const isStatStart = /^(\d+|-)["+]?$/.test(firstLine);

      let newName = data.name;
      if (!isHeader && !isStatStart && firstLine.length > 1) {
          newName = firstLine;
      }

      const joined = text.replace(/[\n\r]+/g, ' ');
      const statsRegex = /(\d+"?|-)\s+(\d+|-)\s+(\d+\+|-)\s+(\d+|-)\s+(\d+\+|-)\s+(\d+|-)/;
      const match = joined.match(statsRegex);

      let newStats = { ...data.stats };
      if (match) {
          newStats.m = normalizeStat(match[1], 'M');
          newStats.t = normalizeStat(match[2], 'T');
          newStats.sv = normalizeStat(match[3], 'SV');
          newStats.w = normalizeStat(match[4], 'W');
          newStats.ld = normalizeStat(match[5], 'LD');
          newStats.oc = normalizeStat(match[6], 'OC');
      }

      const invulnRegex = /(?:Invulnerable save|Invuln|Inv|Invulnerable)[^0-9]*(\d+\+)/i;
      const invMatch = joined.match(invulnRegex);
      let newInvuln = data.invuln;
      if (invMatch) {
          newInvuln = normalizeStat(invMatch[1], 'INV');
      }

      setData(prev => ({ ...prev, name: newName, stats: newStats, invuln: newInvuln }));
      setShowStatsImport(false);
      setStatsImportText('');
  };

  const handleWeaponChange = (type: 'rangedWeapons' | 'meleeWeapons', idx: number, field: string, val: string) => {
    const arr = [...data[type]];
    arr[idx] = { ...arr[idx], [field]: val };
    setData({ ...data, [type]: arr });
  };

  const removeWeapon = (type: 'rangedWeapons' | 'meleeWeapons', idx: number) => {
    const arr = [...data[type]];
    arr.splice(idx, 1);
    setData({ ...data, [type]: arr });
  };

  const addWeapon = (type: 'rangedWeapons' | 'meleeWeapons') => {
      const newW = { id: Date.now().toString(), name: "New Weapon", range: "24\"", attacks: "1", skill: "3+", strength: "4", ap: "0", damage: "1", keywords: "-" };
      setData({ ...data, [type]: [...data[type], newW] });
  };

  const handleSmartImport = () => {
      if (!importText.trim()) return;
      const newRanged: any[] = [];
      const newMelee: any[] = [];
      const lines = importText.split('\n').filter(l => l.trim());
      const hasTabs = importText.includes('\t');

      const createWeapon = (fields: string[]) => {
          const w = {
              id: `imp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name: fields[0]?.trim() || "Imported Weapon",
              range: fields[1]?.trim() || "-",
              attacks: fields[2]?.trim() || "-",
              skill: fields[3]?.trim() || "-",
              strength: fields[4]?.trim() || "-",
              ap: fields[5]?.trim() || "-",
              damage: fields[6]?.trim() || "-",
              keywords: fields.slice(7).map(f => f.trim()).join(" ") || "-"
          };
          const r = w.range.toLowerCase();
          if (r.includes('melee')) { newMelee.push(w); } else { newRanged.push(w); }
      };

      if (hasTabs) {
          lines.forEach(line => { const parts = line.split('\t'); if (parts.length > 1) createWeapon(parts); });
      } else {
          const isRange = (s: string) => /melee/i.test(s) || /\d+"/.test(s);
          const rangeIndices = lines.map((l, i) => isRange(l) ? i : -1).filter(i => i !== -1);
          if (rangeIndices.length > 0) {
              rangeIndices.forEach((rIdx, i) => {
                  if (rIdx === 0) return;
                  const start = rIdx - 1;
                  const nextRangeIdx = rangeIndices[i + 1];
                  const end = nextRangeIdx ? nextRangeIdx - 1 : lines.length;
                  createWeapon(lines.slice(start, end));
              });
          } else {
              if (lines.length === 1 && lines[0].includes("  ")) { createWeapon(lines[0].split(/\s{2,}/)); } else { createWeapon(lines); }
          }
      }

      if (newRanged.length === 0 && newMelee.length === 0) return;
      setData(prev => ({ ...prev, rangedWeapons: [...prev.rangedWeapons, ...newRanged], meleeWeapons: [...prev.meleeWeapons, ...newMelee] }));
      setImportText('');
      setShowImport(false);
  };

  const updateAbilitiesFromText = (text: string) => {
      setAbilitiesText(text);
      const lines = text.split('\n');
      const newAbs = lines.map((l, i) => {
          if (!l.trim()) return null;
          const colonIdx = l.indexOf(':');
          if (colonIdx !== -1) {
             const name = l.substring(0, colonIdx).trim();
             const description = l.substring(colonIdx + 1).trim();
             return { id: `ab-${i}`, name, description };
          } else {
             return { id: `ab-${i}`, name: l.trim(), description: "" };
          }
      }).filter(Boolean) as any[];
      setData(prev => ({ ...prev, abilities: newAbs }));
  };

  const handleAbilitiesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateAbilitiesFromText(e.target.value);
  };

  const handleAutoFill = async () => {
    if (!url.trim()) return;
    if (!targetName.trim()) { setFetchError("Target Unit Name is required for accuracy."); return; }
    setFetching(true);
    setFetchError(null);
    try {
        const newData = await datasheetService.fetchUnitDataFromUrl(url, targetName);
        if (newData) {
            const merged: UnitCardData = { ...newData, id: data.id };
            setData(merged);
            const text = merged.abilities?.map(a => a.description ? `${a.name}: ${a.description}` : a.name).join('\n') || '';
            setAbilitiesText(text);
        } else { setFetchError("Could not extract that unit. (Mismatch or page not readable.) Try checking the Target Unit Name or URL."); }
    } catch (e) { setFetchError("Error fetching data from URL."); } finally { setFetching(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 print:hidden">
      <div className="bg-grim-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border border-grim-700 shadow-2xl">

        {/* Header */}
        <div className="bg-grim-900 p-4 border-b border-grim-700 flex justify-between items-center sticky top-0 z-10">
            <h2 className="text-xl font-bold text-white font-['Chakra_Petch']">Edit Unit</h2>
            <div className="flex gap-2">
                <button onClick={() => onDelete(data.id)} className="p-2 bg-red-900/50 text-red-200 rounded hover:bg-red-900"><Trash size={16}/></button>
                <button onClick={onClose} className="p-2 bg-grim-700 text-white rounded hover:bg-grim-600"><X size={16}/></button>
            </div>
        </div>

        <div className="p-4 space-y-4">

            {/* Auto-fill / Import Section */}
            <div className="bg-grim-950/50 border border-grim-700 p-3 rounded-md mb-2">
              <div className="flex items-center gap-3 mb-2">
                 <button
                    onClick={() => setShowFullImport(false)}
                    className={`text-xs font-bold flex items-center gap-1 ${!showFullImport ? 'text-blue-300' : 'text-slate-500 hover:text-white'}`}
                 >
                    <Globe size={12} /> Auto-fill from URL
                 </button>
                 <span className="text-grim-600">|</span>
                 <button
                    onClick={() => setShowFullImport(true)}
                    className={`text-xs font-bold flex items-center gap-1 ${showFullImport ? 'text-yellow-400' : 'text-slate-500 hover:text-white'}`}
                 >
                    <BoxSelect size={12} /> Import Full Profile Text
                 </button>
              </div>

              {!showFullImport ? (
                  <div className="flex gap-2 flex-col sm:flex-row">
                    <div className="sm:w-1/3 w-full relative">
                      <input
                        value={targetName}
                        onChange={e => setTargetName(e.target.value)}
                        placeholder="Target Unit Name (Required)"
                        className={`w-full bg-grim-900 border rounded px-2 py-1 text-xs text-slate-300 focus:border-blue-500 outline-none ${!targetName.trim() ? 'border-red-900/50 placeholder:text-red-900/50' : 'border-grim-700'}`}
                      />
                      {!targetName.trim() && (
                        <span className="absolute right-2 top-1 text-[8px] text-red-500 font-bold uppercase">Required</span>
                      )}
                    </div>
                    <div className="flex gap-2 flex-1">
                        <input
                        value={url}
                        onChange={e => setUrl(e.target.value)}
                        placeholder="Paste URL (e.g. Wahapedia)..."
                        className="flex-1 bg-grim-900 border border-grim-700 rounded px-2 py-1 text-xs text-slate-300 focus:border-blue-500 outline-none"
                        />
                        <button
                        onClick={handleAutoFill}
                        disabled={fetching || !url.trim() || !targetName.trim()}
                        className="bg-blue-700 hover:bg-blue-600 disabled:bg-grim-800 disabled:text-grim-600 text-white px-3 py-1 rounded text-xs font-bold flex items-center gap-2"
                        >
                        {fetching ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                        Fetch
                        </button>
                    </div>
                    {fetchError && <p className="text-red-400 text-[10px] mt-1 w-full">{fetchError}</p>}
                  </div>
              ) : (
                  <div className="animate-in fade-in slide-in-from-top-1">
                     <textarea
                         value={fullImportText}
                         onChange={e => setFullImportText(e.target.value)}
                         className="w-full h-32 bg-grim-900 border border-grim-700 rounded p-2 text-xs text-slate-200 font-mono focus:border-yellow-500 outline-none"
                         placeholder={"Paste full unit profile block here...\nExample:\nMephiston\nM T SV...\n7\" 5 2+...\nRanged Weapons..."}
                     />
                     <button
                        onClick={handleFullImport}
                        disabled={!fullImportText.trim()}
                        className="w-full mt-2 py-1 bg-yellow-600 hover:bg-yellow-500 text-black font-bold rounded text-xs flex justify-center items-center gap-2"
                     >
                        <BoxSelect size={14} /> Parse & Apply Profile
                     </button>
                  </div>
              )}
            </div>

            {/* Manual Paste Stats (Partial) */}
            <div>
                 <button
                    onClick={() => setShowStatsImport(!showStatsImport)}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 mb-1"
                 >
                    <Clipboard size={12} /> Paste Profile (Stats Only)
                 </button>

                 {showStatsImport && (
                    <div className="bg-grim-900 border border-grim-700 p-3 rounded mb-3 animate-in fade-in slide-in-from-top-1">
                            <p className="text-[10px] text-slate-400 mb-2">
                                Paste stats text (Name, M, T, SV, W, LD, OC, Invuln).
                            </p>
                            <textarea
                                value={statsImportText}
                                onChange={(e) => setStatsImportText(e.target.value)}
                                className="w-full h-24 bg-grim-800 text-xs text-slate-200 p-2 rounded border border-grim-600 mb-2 font-mono"
                                placeholder={"Chaplain\nM T SV W LD OC\n12\" 4 3+ 4 5+ 1\nInvuln: 4+"}
                            />
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => { setShowStatsImport(false); setStatsImportText(''); }}
                                    className="px-3 py-1 bg-grim-700 hover:bg-grim-600 text-white text-xs rounded"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleImportStats}
                                    disabled={!statsImportText.trim()}
                                    className="px-3 py-1 bg-blue-700 hover:bg-blue-600 disabled:bg-grim-700 disabled:text-slate-500 text-white text-xs font-bold rounded shadow"
                                >
                                    Apply Stats
                                </button>
                            </div>
                    </div>
                 )}
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-4 gap-3">
                <div className="col-span-4">
                    <label className="text-xs text-slate-400">Name</label>
                    <input className="w-full bg-grim-700 text-white p-2 rounded border border-grim-600" value={data.name} onChange={e => setData({...data, name: e.target.value})} />
                </div>
                <div>
                    <label className="text-xs text-slate-400">Base Size</label>
                    <input
                      className="w-full bg-grim-700 text-white p-2 rounded border border-grim-600"
                      value={data.baseSize || ''}
                      onChange={e => setData({...data, baseSize: e.target.value})}
                      placeholder="e.g. 32mm"
                    />
                </div>
                <div>
                    <label className="text-xs text-slate-400">Invuln</label>
                    <input
                      className="w-full bg-grim-700 text-white p-2 rounded border border-grim-600"
                      value={data.invuln || ''}
                      onChange={e => handleInvulnChange(e.target.value)}
                      onBlur={handleInvulnBlur}
                      placeholder="e.g. 4+"
                    />
                </div>
                <div>
                   <label className="text-xs text-slate-400 flex items-center gap-1"><Users size={10}/> Squad Count</label>
                   <input
                      type="number"
                      min="1"
                      className="w-full bg-grim-700 text-white p-2 rounded border border-grim-600"
                      value={data.squadCount ?? 1}
                      onChange={e => handleSquadCountChange(e.target.value)}
                   />
                </div>

                {/* Model Counts */}
                <div className={(data.squadCount ?? 1) > 1 ? "col-span-4 bg-grim-900/30 p-2 rounded border border-grim-700/50" : ""}>
                   <label className="text-xs text-slate-400 flex items-center gap-1"><Copy size={10}/> {(data.squadCount ?? 1) > 1 ? "Models per Squad" : "Models/Squad"}</label>

                   {(data.squadCount ?? 1) <= 1 ? (
                       <input
                          type="number"
                          min="1"
                          className="w-full bg-grim-700 text-white p-2 rounded border border-grim-600"
                          value={data.modelsPerSquad?.[0] ?? data.modelCount ?? 1}
                          onChange={e => handleModelCountChange(0, e.target.value)}
                       />
                   ) : (
                       <div className="flex flex-wrap gap-2 mt-1">
                          {data.modelsPerSquad?.map((count, idx) => (
                             <div key={idx} className="flex flex-col w-16">
                                <span className="text-[9px] text-slate-500 uppercase">Sqd {idx+1}</span>
                                <input
                                    type="number"
                                    min="1"
                                    className="bg-grim-700 text-white px-2 py-1 rounded border border-grim-600 text-xs text-center"
                                    value={count}
                                    onChange={e => handleModelCountChange(idx, e.target.value)}
                                />
                             </div>
                          ))}
                       </div>
                   )}
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-6 gap-2 bg-grim-900/50 p-3 rounded">
                {(['m', 't', 'sv', 'w', 'ld', 'oc'] as const).map(s => (
                    <div key={s} className="text-center">
                        <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">{s}</label>
                        <input
                          className="w-full text-center bg-grim-700 text-white p-1 rounded font-bold"
                          value={data.stats?.[s] || ''}
                          onChange={e => handleStatChange(s, e.target.value)}
                          onBlur={() => handleStatBlur(s)}
                        />
                    </div>
                ))}
            </div>

            {/* Weapons */}
            <div>
                <div className="flex justify-between items-end mb-2">
                    <h3 className="text-sm font-bold text-slate-300 uppercase">Weapons</h3>
                    <div className="flex gap-2">
                         <button
                            onClick={() => setShowImport(!showImport)}
                            className={`text-xs px-2 py-1 rounded flex items-center gap-1 transition-colors ${showImport ? 'bg-grim-600 text-white' : 'bg-grim-800 text-slate-400 border border-grim-600 hover:text-white'}`}
                         >
                            <FileText size={12} /> Import
                         </button>
                         <button onClick={() => addWeapon('rangedWeapons')} className="text-xs bg-blue-900/50 text-blue-200 px-2 py-1 rounded">+ Ranged</button>
                         <button onClick={() => addWeapon('meleeWeapons')} className="text-xs bg-red-900/50 text-red-200 px-2 py-1 rounded">+ Melee</button>
                    </div>
                </div>

                {showImport && (
                    <div className="bg-grim-900 border border-grim-700 p-3 rounded mb-3 animate-in fade-in slide-in-from-top-1">
                        <p className="text-[10px] text-slate-400 mb-2">
                            Paste weapon profiles (vertical or rows).
                            <span className="opacity-70"> Order: Name, Range, A, BS/WS, S, AP, D, Keywords. </span>
                            <br/>
                            <span className="text-blue-300">Smart Import will automatically detect Ranged (inches) vs Melee profiles.</span>
                        </p>
                        <textarea
                            value={importText}
                            onChange={(e) => setImportText(e.target.value)}
                            className="w-full h-32 bg-grim-800 text-xs text-slate-200 p-2 rounded border border-grim-600 mb-2 font-mono whitespace-pre"
                            placeholder={"Grav-pistol\t12\"\t1\t3+\t4\t-1\t2\tAnti-vehicle 2+\nChainsword\tMelee\t4\t3+\t4\t0\t1\t-"}
                        />
                        <button
                            onClick={handleSmartImport}
                            disabled={!importText.trim()}
                            className="w-full py-2 bg-gradient-to-r from-blue-700 to-red-700 hover:from-blue-600 hover:to-red-600 disabled:from-grim-700 disabled:to-grim-700 disabled:text-slate-500 text-white text-xs font-bold rounded shadow flex justify-center items-center gap-2"
                        >
                            <Sparkles size={14} /> Smart Import (Auto-Detect Types)
                        </button>
                    </div>
                )}

                <div className="space-y-2">
                    {[...data.rangedWeapons, ...data.meleeWeapons].map((w, i) => {
                        const type = i < data.rangedWeapons.length ? 'rangedWeapons' : 'meleeWeapons';
                        const idx = i < data.rangedWeapons.length ? i : i - data.rangedWeapons.length;
                        return (
                        <div key={w.id} className="grid grid-cols-12 gap-1 items-center bg-grim-700/50 p-2 rounded">
                            <div className="col-span-3"><input className="w-full bg-transparent text-white text-xs" value={w.name} onChange={e => handleWeaponChange(type, idx, 'name', e.target.value)} placeholder="Name" /></div>
                            <div className="col-span-1"><input className="w-full bg-transparent text-center text-gray-300 text-xs" value={w.range} onChange={e => handleWeaponChange(type, idx, 'range', e.target.value)} placeholder="Rng" /></div>
                            <div className="col-span-1"><input className="w-full bg-transparent text-center text-gray-300 text-xs" value={w.attacks} onChange={e => handleWeaponChange(type, idx, 'attacks', e.target.value)} placeholder="A" /></div>
                            <div className="col-span-1"><input className="w-full bg-transparent text-center text-gray-300 text-xs" value={w.skill} onChange={e => handleWeaponChange(type, idx, 'skill', e.target.value)} placeholder="BS" /></div>
                            <div className="col-span-1"><input className="w-full bg-transparent text-center text-gray-300 text-xs" value={w.strength} onChange={e => handleWeaponChange(type, idx, 'strength', e.target.value)} placeholder="S" /></div>
                            <div className="col-span-1"><input className="w-full bg-transparent text-center text-gray-300 text-xs" value={w.ap} onChange={e => handleWeaponChange(type, idx, 'ap', e.target.value)} placeholder="AP" /></div>
                            <div className="col-span-1"><input className="w-full bg-transparent text-center text-gray-300 text-xs" value={w.damage} onChange={e => handleWeaponChange(type, idx, 'damage', e.target.value)} placeholder="D" /></div>
                            <div className="col-span-2"><input className="w-full bg-transparent text-right text-gray-400 text-[10px]" value={w.keywords} onChange={e => handleWeaponChange(type, idx, 'keywords', e.target.value)} placeholder="Keys" /></div>
                            <div className="col-span-1 flex justify-end">
                                <button onClick={() => removeWeapon(type, idx)} className="text-red-400 hover:text-red-200"><X size={12}/></button>
                            </div>
                        </div>
                    )})}
                </div>
            </div>

            {/* Abilities */}
            <div>
                 <h3 className="text-sm font-bold text-slate-300 uppercase mb-2">Abilities (Short)</h3>
                 <textarea
                    className="w-full bg-grim-700 text-white text-xs p-2 rounded h-20"
                    placeholder="Abilities separated by new lines..."
                    value={abilitiesText}
                    onChange={handleAbilitiesChange}
                 />
                 <p className="text-[10px] text-gray-500 mt-1">Format: Name: Description (one per line).</p>
            </div>
        </div>

        <div className="p-4 border-t border-grim-700 flex justify-end gap-2 bg-grim-900 sticky bottom-0">
             <button onClick={() => { onSave(data); onClose(); }} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded font-bold flex items-center gap-2">
                <Save size={16}/> Save Changes
             </button>
        </div>

      </div>
    </div>
  );
};