import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  Plus, Trash2, Upload, Image, Edit2, Check, X,
  Package, ClipboardList, Layers, Compass
} from 'lucide-react';
import { BuildProject, BitEntry, KitbashLayer, BUILD_STATUSES } from '../../types/workspace';
import { safeLocalStorageGet, safeLocalStorageSet } from '../../utils/storageUtils';
import { SectionHeader } from './SectionHeader';

const genId = () => Math.random().toString(36).substring(2, 11);

// --- Army Build Planner ---
const ArmyPlanner: React.FC = () => {
  const [projects, setProjects] = useState<BuildProject[]>(() => {
    const saved = safeLocalStorageGet('buildProjects');
    if (saved) { try { return JSON.parse(saved); } catch { /* fallback */ } }
    return [];
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const persist = useCallback((updated: BuildProject[]) => {
    setProjects(updated);
    safeLocalStorageSet('buildProjects', JSON.stringify(updated));
  }, []);

  const addProject = useCallback(() => {
    const p: BuildProject = {
      id: genId(), unitName: 'New Unit', status: 'planned',
      notes: '', conversionNotes: '', createdAt: Date.now(), updatedAt: Date.now(),
    };
    setProjects(prev => {
      const updated = [p, ...prev];
      safeLocalStorageSet('buildProjects', JSON.stringify(updated));
      return updated;
    });
    setEditingId(p.id);
  }, []);

  const updateProject = useCallback((id: string, updates: Partial<BuildProject>) => {
    setProjects(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p);
      safeLocalStorageSet('buildProjects', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const deleteProject = useCallback((id: string) => {
    setProjects(prev => {
      const updated = prev.filter(p => p.id !== id);
      safeLocalStorageSet('buildProjects', JSON.stringify(updated));
      return updated;
    });
    setEditingId(prev => prev === id ? null : prev);
  }, []);

  const filtered = useMemo(() =>
    filter === 'all' ? projects : projects.filter(p => p.status === filter),
    [projects, filter]
  );

  const stats = useMemo(() =>
    BUILD_STATUSES.map(s => ({
      ...s,
      count: projects.filter(p => p.status === s.value).length,
    })),
    [projects]
  );

  return (
    <div className="space-y-2">
      {/* Progress Summary */}
      <div className="flex gap-1 flex-wrap">
        {stats.map(s => s.count > 0 && (
          <span
            key={s.value}
            className="text-[9px] font-mono px-1.5 py-0.5 rounded-full border cursor-pointer transition-colors"
            style={{
              borderColor: s.color + '60',
              color: s.color,
              backgroundColor: filter === s.value ? s.color + '20' : 'transparent',
            }}
            onClick={() => setFilter(filter === s.value ? 'all' : s.value)}
          >
            {s.label}: {s.count}
          </span>
        ))}
        {filter !== 'all' && (
          <span className="text-[9px] text-slate-500 cursor-pointer hover:text-white" onClick={() => setFilter('all')}>Show All</span>
        )}
      </div>

      <button onClick={addProject} className="w-full flex items-center justify-center gap-1 py-1.5 bg-grim-800 hover:bg-grim-700 text-slate-300 rounded text-xs border border-grim-700 transition-colors">
        <Plus size={12} /> Add Unit
      </button>

      <div className="space-y-1 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-grim-700">
        {filtered.map(project => {
          const isEditing = editingId === project.id;
          const statusDef = BUILD_STATUSES.find(s => s.value === project.status);

          return (
            <div key={project.id} className="bg-grim-800 rounded border border-grim-700/50 p-2 group">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: statusDef?.color || '#666' }} />
                {isEditing ? (
                  <input
                    autoFocus
                    value={project.unitName}
                    onChange={(e) => updateProject(project.id, { unitName: e.target.value })}
                    className="flex-1 bg-grim-900 border border-grim-600 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && setEditingId(null)}
                  />
                ) : (
                  <span className="flex-1 text-xs text-slate-300 truncate">{project.unitName}</span>
                )}
                <button onClick={() => setEditingId(isEditing ? null : project.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                  {isEditing ? <Check size={12} className="text-green-400" /> : <Edit2 size={12} className="text-slate-500" />}
                </button>
                <button onClick={() => deleteProject(project.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 size={12} className="text-red-400" />
                </button>
              </div>

              {isEditing && (
                <div className="mt-2 space-y-1.5 animate-in slide-in-from-top-1 duration-150">
                  <select
                    value={project.status}
                    onChange={(e) => updateProject(project.id, { status: e.target.value as BuildProject['status'] })}
                    className="w-full bg-grim-900 border border-grim-700 rounded px-2 py-1 text-[10px] text-white focus:outline-none"
                  >
                    {BUILD_STATUSES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  <textarea
                    value={project.notes}
                    onChange={(e) => updateProject(project.id, { notes: e.target.value })}
                    placeholder="Build notes..."
                    className="w-full bg-grim-900 border border-grim-700 rounded px-2 py-1 text-[10px] text-white placeholder-slate-600 focus:outline-none resize-none h-12"
                  />
                  <textarea
                    value={project.conversionNotes}
                    onChange={(e) => updateProject(project.id, { conversionNotes: e.target.value })}
                    placeholder="Conversion ideas..."
                    className="w-full bg-grim-900 border border-grim-700 rounded px-2 py-1 text-[10px] text-white placeholder-slate-600 focus:outline-none resize-none h-12"
                  />
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-[10px] text-slate-600 text-center py-4 italic">
            {filter === 'all' ? 'No projects yet. Add a unit to start planning!' : 'No units with this status.'}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Bit Library ---
const BitLibrary: React.FC = () => {
  const [bits, setBits] = useState<BitEntry[]>(() => {
    const saved = safeLocalStorageGet('bitLibrary');
    if (saved) { try { return JSON.parse(saved); } catch { /* fallback */ } }
    return [];
  });
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const save = (updated: BitEntry[]) => {
    setBits(updated);
    safeLocalStorageSet('bitLibrary', JSON.stringify(updated));
  };

  const addBit = () => {
    const b: BitEntry = { id: genId(), name: 'New Part', kitSource: '', faction: '', quantity: 1, tags: [] };
    save([b, ...bits]);
    setEditingId(b.id);
  };

  const updateBit = (id: string, updates: Partial<BitEntry>) => {
    save(bits.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const deleteBit = (id: string) => {
    save(bits.filter(b => b.id !== id));
  };

  const filtered = search
    ? bits.filter(b =>
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        b.kitSource.toLowerCase().includes(search.toLowerCase()) ||
        b.faction.toLowerCase().includes(search.toLowerCase()) ||
        b.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
      )
    : bits;

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search bits..."
          className="flex-1 bg-grim-800 border border-grim-700 rounded px-2 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-grim-gold/50"
        />
        <button onClick={addBit} className="px-2 py-1.5 bg-grim-800 hover:bg-grim-700 text-slate-300 rounded text-xs border border-grim-700 transition-colors shrink-0">
          <Plus size={14} />
        </button>
      </div>

      <div className="space-y-1 max-h-[350px] overflow-y-auto scrollbar-thin scrollbar-thumb-grim-700">
        {filtered.map(bit => {
          const isEditing = editingId === bit.id;
          return (
            <div key={bit.id} className="bg-grim-800 rounded border border-grim-700/50 p-2 group">
              {isEditing ? (
                <div className="space-y-1.5">
                  <input value={bit.name} onChange={(e) => updateBit(bit.id, { name: e.target.value })} placeholder="Part name" className="w-full bg-grim-900 border border-grim-700 rounded px-2 py-1 text-[10px] text-white focus:outline-none" />
                  <div className="flex gap-1">
                    <input value={bit.kitSource} onChange={(e) => updateBit(bit.id, { kitSource: e.target.value })} placeholder="Kit source" className="flex-1 bg-grim-900 border border-grim-700 rounded px-2 py-1 text-[10px] text-white focus:outline-none" />
                    <input value={bit.faction} onChange={(e) => updateBit(bit.id, { faction: e.target.value })} placeholder="Faction" className="flex-1 bg-grim-900 border border-grim-700 rounded px-2 py-1 text-[10px] text-white focus:outline-none" />
                  </div>
                  <div className="flex gap-1 items-center">
                    <span className="text-[9px] text-slate-500">Qty:</span>
                    <input type="number" min={0} value={bit.quantity} onChange={(e) => updateBit(bit.id, { quantity: parseInt(e.target.value) || 0 })} className="w-14 bg-grim-900 border border-grim-700 rounded px-2 py-1 text-[10px] text-white focus:outline-none" />
                    <input value={bit.tags.join(', ')} onChange={(e) => updateBit(bit.id, { tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })} placeholder="Tags (comma-separated)" className="flex-1 bg-grim-900 border border-grim-700 rounded px-2 py-1 text-[10px] text-white focus:outline-none" />
                  </div>
                  <button onClick={() => setEditingId(null)} className="text-[9px] text-grim-gold hover:underline">Done</button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-300 flex-1 truncate">{bit.name}</span>
                  {bit.quantity > 1 && <span className="text-[9px] font-mono text-slate-500">x{bit.quantity}</span>}
                  {bit.kitSource && <span className="text-[8px] text-slate-600 truncate max-w-[60px]">{bit.kitSource}</span>}
                  <button onClick={() => setEditingId(bit.id)} className="opacity-0 group-hover:opacity-100"><Edit2 size={10} className="text-slate-500" /></button>
                  <button onClick={() => deleteBit(bit.id)} className="opacity-0 group-hover:opacity-100"><Trash2 size={10} className="text-red-400" /></button>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-[10px] text-slate-600 text-center py-4 italic">
            {search ? 'No bits matching search.' : 'No bits tracked. Add parts to start your inventory!'}
          </div>
        )}
      </div>
      <div className="text-[9px] text-slate-600 text-center">{bits.length} parts tracked</div>
    </div>
  );
};

// --- Kitbash Canvas ---
const KitbashCanvas: React.FC = () => {
  const [layers, setLayers] = useState<KitbashLayer[]>([]);
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const layerInputRef = useRef<HTMLInputElement>(null);

  const addBaseImage = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setBaseImage(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  }, []);

  const addLayer = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const layer: KitbashLayer = {
        id: genId(), image: ev.target?.result as string,
        x: 50, y: 50, width: 80, height: 80, rotation: 0, opacity: 1,
        label: file.name.replace(/\.[^.]+$/, ''),
      };
      setLayers(prev => [...prev, layer]);
      setSelectedLayer(layer.id);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, []);

  const updateLayer = (id: string, updates: Partial<KitbashLayer>) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const deleteLayer = (id: string) => {
    setLayers(prev => prev.filter(l => l.id !== id));
    if (selectedLayer === id) setSelectedLayer(null);
  };

  const selected = layers.find(l => l.id === selectedLayer);

  return (
    <div className="space-y-2">
      {/* Canvas Preview */}
      <div className="relative bg-grim-800 rounded-lg border border-grim-700 overflow-hidden" style={{ height: 200 }}>
        {baseImage ? (
          <img src={baseImage} alt="Base" className="w-full h-full object-contain" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1 hover:text-slate-400 transition-colors">
              <Image size={16} /> Set base model image
            </button>
          </div>
        )}
        {layers.map(layer => (
          <div
            key={layer.id}
            className={`absolute cursor-move border ${selectedLayer === layer.id ? 'border-grim-gold/60' : 'border-transparent hover:border-white/20'}`}
            style={{
              left: `${layer.x}px`, top: `${layer.y}px`,
              width: `${layer.width}px`, height: `${layer.height}px`,
              transform: `rotate(${layer.rotation}deg)`,
              opacity: layer.opacity,
            }}
            onClick={() => setSelectedLayer(layer.id)}
          >
            <img src={layer.image} alt={layer.label} className="w-full h-full object-contain pointer-events-none" />
          </div>
        ))}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={addBaseImage} />
      </div>

      {/* Layer Controls */}
      <div className="flex gap-1.5">
        <button onClick={() => layerInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-grim-800 hover:bg-grim-700 text-slate-300 rounded text-xs border border-grim-700 transition-colors">
          <Layers size={12} /> Add Part Layer
        </button>
        {baseImage && (
          <button onClick={() => setBaseImage(null)} className="px-2 py-1.5 bg-grim-800 hover:bg-grim-700 text-red-400 rounded text-xs border border-grim-700 transition-colors">
            <X size={12} />
          </button>
        )}
      </div>
      <input ref={layerInputRef} type="file" accept="image/*" className="hidden" onChange={addLayer} />

      {/* Selected Layer Controls */}
      {selected && (
        <div className="bg-grim-800 rounded border border-grim-700/50 p-2 space-y-1.5 animate-in slide-in-from-top-1 duration-150">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-300 font-bold truncate">{selected.label}</span>
            <button onClick={() => deleteLayer(selected.id)}><Trash2 size={12} className="text-red-400" /></button>
          </div>
          <div className="grid grid-cols-2 gap-1">
            <label className="text-[9px] text-slate-500">
              X: <input type="number" value={selected.x} onChange={(e) => updateLayer(selected.id, { x: +e.target.value })} className="w-12 bg-grim-900 border border-grim-700 rounded px-1 text-[10px] text-white ml-1" />
            </label>
            <label className="text-[9px] text-slate-500">
              Y: <input type="number" value={selected.y} onChange={(e) => updateLayer(selected.id, { y: +e.target.value })} className="w-12 bg-grim-900 border border-grim-700 rounded px-1 text-[10px] text-white ml-1" />
            </label>
            <label className="text-[9px] text-slate-500">
              W: <input type="number" value={selected.width} onChange={(e) => updateLayer(selected.id, { width: +e.target.value })} className="w-12 bg-grim-900 border border-grim-700 rounded px-1 text-[10px] text-white ml-1" />
            </label>
            <label className="text-[9px] text-slate-500">
              H: <input type="number" value={selected.height} onChange={(e) => updateLayer(selected.id, { height: +e.target.value })} className="w-12 bg-grim-900 border border-grim-700 rounded px-1 text-[10px] text-white ml-1" />
            </label>
          </div>
          <label className="flex items-center gap-1 text-[9px] text-slate-500">
            Rotation: <input type="range" min={-180} max={180} value={selected.rotation} onChange={(e) => updateLayer(selected.id, { rotation: +e.target.value })} className="flex-1 h-1" />
            <span className="text-[9px] font-mono w-8 text-right">{selected.rotation}°</span>
          </label>
          <label className="flex items-center gap-1 text-[9px] text-slate-500">
            Opacity: <input type="range" min={0} max={1} step={0.05} value={selected.opacity} onChange={(e) => updateLayer(selected.id, { opacity: +e.target.value })} className="flex-1 h-1" />
            <span className="text-[9px] font-mono w-8 text-right">{Math.round(selected.opacity * 100)}%</span>
          </label>
        </div>
      )}

      {/* Layer List */}
      {layers.length > 0 && (
        <div className="space-y-0.5">
          {layers.map(layer => (
            <div
              key={layer.id}
              onClick={() => setSelectedLayer(layer.id)}
              className={`flex items-center gap-2 px-2 py-1 rounded text-[10px] cursor-pointer transition-colors ${
                selectedLayer === layer.id ? 'bg-grim-700 text-white' : 'text-slate-400 hover:text-slate-300 hover:bg-grim-800'
              }`}
            >
              <Layers size={10} />
              <span className="truncate flex-1">{layer.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Composition Overlay ---
const CompositionOverlay: React.FC = () => {
  const [overlayImage, setOverlayImage] = useState<string | null>(null);
  const [activeOverlays, setActiveOverlays] = useState<Set<string>>(new Set());
  const [overlayScale, setOverlayScale] = useState(1);
  const [overlayRotation, setOverlayRotation] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOverlayUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setOverlayImage(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  }, []);

  const toggleOverlay = (overlay: string) => {
    setActiveOverlays(prev => {
      const next = new Set(prev);
      if (next.has(overlay)) next.delete(overlay);
      else next.add(overlay);
      return next;
    });
  };

  const overlayTypes = [
    { id: 'golden-ratio', label: 'Golden Ratio Spiral' },
    { id: 'rule-of-thirds', label: 'Rule of Thirds' },
    { id: 'center-axis', label: 'Center Axis' },
    { id: 'balance-lines', label: 'Balance Lines' },
    { id: 'silhouette', label: 'Silhouette Mode' },
  ];

  return (
    <div className="space-y-2">
      {/* Image Area */}
      <div className="relative bg-grim-800 rounded-lg border border-grim-700 overflow-hidden" style={{ height: 200 }}>
        {overlayImage ? (
          <>
            <img
              src={overlayImage}
              alt="Model"
              className="w-full h-full object-contain"
              style={{
                transform: `scale(${overlayScale}) rotate(${overlayRotation}deg)`,
                filter: activeOverlays.has('silhouette') ? 'contrast(200%) brightness(0)' : 'none',
              }}
            />
            {/* Overlay SVGs */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 300 200">
              {activeOverlays.has('rule-of-thirds') && (
                <>
                  <line x1="100" y1="0" x2="100" y2="200" stroke="#fbbf24" strokeWidth="0.5" opacity="0.6" />
                  <line x1="200" y1="0" x2="200" y2="200" stroke="#fbbf24" strokeWidth="0.5" opacity="0.6" />
                  <line x1="0" y1="66.7" x2="300" y2="66.7" stroke="#fbbf24" strokeWidth="0.5" opacity="0.6" />
                  <line x1="0" y1="133.3" x2="300" y2="133.3" stroke="#fbbf24" strokeWidth="0.5" opacity="0.6" />
                </>
              )}
              {activeOverlays.has('center-axis') && (
                <>
                  <line x1="150" y1="0" x2="150" y2="200" stroke="#ef4444" strokeWidth="0.5" opacity="0.6" strokeDasharray="4 2" />
                  <line x1="0" y1="100" x2="300" y2="100" stroke="#ef4444" strokeWidth="0.5" opacity="0.6" strokeDasharray="4 2" />
                </>
              )}
              {activeOverlays.has('balance-lines') && (
                <>
                  <line x1="0" y1="0" x2="300" y2="200" stroke="#22c55e" strokeWidth="0.5" opacity="0.4" />
                  <line x1="300" y1="0" x2="0" y2="200" stroke="#22c55e" strokeWidth="0.5" opacity="0.4" />
                </>
              )}
              {activeOverlays.has('golden-ratio') && (
                <path
                  d="M 150,100 C 150,60 180,40 200,40 C 230,40 250,60 250,80 C 250,110 230,130 200,140 C 180,145 165,130 165,115 C 165,105 170,98 175,95 C 178,93 180,95 180,98 C 180,100 179,101 178,101"
                  fill="none" stroke="#a855f7" strokeWidth="0.8" opacity="0.6"
                />
              )}
            </svg>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1 hover:text-slate-400 transition-colors">
              <Upload size={16} /> Upload model image
            </button>
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleOverlayUpload} />
      </div>

      {/* Overlay Toggles */}
      <div className="space-y-0.5">
        {overlayTypes.map(ot => (
          <button
            key={ot.id}
            onClick={() => toggleOverlay(ot.id)}
            className={`w-full text-left px-2 py-1.5 rounded text-[10px] transition-colors ${
              activeOverlays.has(ot.id)
                ? 'bg-grim-gold/20 text-grim-gold border border-grim-gold/30'
                : 'text-slate-400 hover:text-slate-300 hover:bg-grim-800 border border-transparent'
            }`}
          >
            {ot.label}
          </button>
        ))}
      </div>

      {overlayImage && (
        <div className="space-y-1">
          <label className="flex items-center gap-1 text-[9px] text-slate-500">
            Scale: <input type="range" min={0.5} max={2} step={0.05} value={overlayScale} onChange={(e) => setOverlayScale(+e.target.value)} className="flex-1 h-1" />
            <span className="font-mono w-8 text-right">{Math.round(overlayScale * 100)}%</span>
          </label>
          <label className="flex items-center gap-1 text-[9px] text-slate-500">
            Rotate: <input type="range" min={-180} max={180} value={overlayRotation} onChange={(e) => setOverlayRotation(+e.target.value)} className="flex-1 h-1" />
            <span className="font-mono w-8 text-right">{overlayRotation}°</span>
          </label>
          <button onClick={() => { setOverlayImage(null); setActiveOverlays(new Set()); }} className="w-full py-1 text-[9px] text-red-400 hover:text-red-300">Clear Image</button>
        </div>
      )}
    </div>
  );
};

// --- Main Build Workspace ---
export const BuildWorkspace: React.FC = () => {
  const [expandedSection, setExpandedSection] = useState<string | null>('planner');

  const handleToggleSection = useCallback((section: string) => {
    setExpandedSection(section || null);
  }, []);

  return (
    <div className="space-y-2">
      <SectionHeader title="Army Build Planner" section="planner" expandedSection={expandedSection} onToggle={handleToggleSection} icon={ClipboardList} />
      {expandedSection === 'planner' && (
        <div className="animate-in slide-in-from-top-1 duration-200">
          <ArmyPlanner />
        </div>
      )}

      <SectionHeader title="Bit Library" section="bits" expandedSection={expandedSection} onToggle={handleToggleSection} icon={Package} />
      {expandedSection === 'bits' && (
        <div className="animate-in slide-in-from-top-1 duration-200">
          <BitLibrary />
        </div>
      )}

      <SectionHeader title="Kitbash Canvas" section="kitbash" expandedSection={expandedSection} onToggle={handleToggleSection} icon={Layers} />
      {expandedSection === 'kitbash' && (
        <div className="animate-in slide-in-from-top-1 duration-200">
          <KitbashCanvas />
        </div>
      )}

      <SectionHeader title="Composition Overlay" section="composition" expandedSection={expandedSection} onToggle={handleToggleSection} icon={Compass} />
      {expandedSection === 'composition' && (
        <div className="animate-in slide-in-from-top-1 duration-200">
          <CompositionOverlay />
        </div>
      )}
    </div>
  );
};
