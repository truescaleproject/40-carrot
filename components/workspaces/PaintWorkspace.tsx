import React, { useState, useCallback, useRef } from 'react';
import { Palette, Upload, RotateCcw, ChevronDown, ChevronUp, Copy, Pipette } from 'lucide-react';
import { PaintScheme, PaintRole, PAINT_ROLES } from '../../types/workspace';
import { generateSchemes, hexToHsl, hslToHex, extractPaletteFromImageData, ColorScheme } from '../../utils/colorTheory';
import { safeLocalStorageGet, safeLocalStorageSet } from '../../utils/storageUtils';

// Simple model silhouette SVG paths for paint preview
const MODEL_REGIONS: Record<string, { path: string; label: string }> = {
  armor: { path: 'M30,25 L25,40 L20,60 L25,65 L35,65 L40,60 L35,40 Z M50,25 L45,40 L40,60 L45,65 L55,65 L60,60 L55,40 Z', label: 'Armor' },
  cloth: { path: 'M28,60 L22,80 L30,85 L38,80 L32,60 Z M48,60 L42,80 L50,85 L58,80 L52,60 Z', label: 'Cloth' },
  trim: { path: 'M25,40 L20,42 L20,58 L25,60 Z M55,40 L60,42 L60,58 L55,60 Z M30,25 L50,25 L48,28 L32,28 Z', label: 'Trim' },
  weapons: { path: 'M60,30 L75,20 L77,22 L62,32 Z M15,45 L5,35 L7,33 L17,43 Z', label: 'Weapons' },
  accents: { path: 'M38,30 L42,30 L42,35 L38,35 Z M36,45 L44,45 L44,50 L36,50 Z', label: 'Accents' },
  glow: { path: 'M35,18 C35,14 45,14 45,18 C45,22 35,22 35,18 Z', label: 'Glow' },
  lenses: { path: 'M36,20 A2,2 0 1,1 40,20 A2,2 0 1,1 36,20 Z M42,20 A2,2 0 1,1 46,20 A2,2 0 1,1 42,20 Z', label: 'Lenses' },
  base: { path: 'M15,85 L65,85 L60,95 L20,95 Z', label: 'Base' },
};

const genId = () => Math.random().toString(36).substring(2, 11);

export const PaintWorkspace: React.FC = () => {
  const [baseColor, setBaseColor] = useState('#8B0000');
  const [schemes, setSchemes] = useState<ColorScheme[]>(() => generateSchemes('#8B0000'));
  const [selectedScheme, setSelectedScheme] = useState(0);
  const [paintRoles, setPaintRoles] = useState<PaintRole[]>(() => {
    const saved = safeLocalStorageGet('paintRoles');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* fallback */ }
    }
    return PAINT_ROLES.map((r, i) => ({
      id: genId(),
      role: r.value,
      color: '#808080',
      label: r.label,
    }));
  });
  const [savedSchemes, setSavedSchemes] = useState<PaintScheme[]>(() => {
    const saved = safeLocalStorageGet('savedPaintSchemes');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* fallback */ }
    }
    return [];
  });
  const [schemeName, setSchemeName] = useState('');
  const [expandedSection, setExpandedSection] = useState<'generator' | 'wheel' | 'saved' | null>('generator');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [extractedPalette, setExtractedPalette] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const updateBaseColor = useCallback((color: string) => {
    setBaseColor(color);
    setSchemes(generateSchemes(color));
  }, []);

  const applySchemeToRoles = useCallback((scheme: ColorScheme) => {
    setPaintRoles(prev => {
      const updated = [...prev];
      scheme.colors.forEach((color, i) => {
        if (i < updated.length) {
          updated[i] = { ...updated[i], color };
        }
      });
      const result = updated;
      safeLocalStorageSet('paintRoles', JSON.stringify(result));
      return result;
    });
  }, []);

  const updateRoleColor = useCallback((roleId: string, color: string) => {
    setPaintRoles(prev => {
      const updated = prev.map(r => r.id === roleId ? { ...r, color } : r);
      safeLocalStorageSet('paintRoles', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const saveScheme = useCallback(() => {
    const scheme: PaintScheme = {
      id: genId(),
      name: schemeName || `Scheme ${savedSchemes.length + 1}`,
      baseColor,
      colors: [...paintRoles],
      createdAt: Date.now(),
    };
    const updated = [...savedSchemes, scheme];
    setSavedSchemes(updated);
    safeLocalStorageSet('savedPaintSchemes', JSON.stringify(updated));
    setSchemeName('');
  }, [schemeName, savedSchemes, baseColor, paintRoles]);

  const loadScheme = useCallback((scheme: PaintScheme) => {
    setBaseColor(scheme.baseColor);
    setSchemes(generateSchemes(scheme.baseColor));
    setPaintRoles(scheme.colors);
    safeLocalStorageSet('paintRoles', JSON.stringify(scheme.colors));
  }, []);

  const deleteScheme = useCallback((id: string) => {
    const updated = savedSchemes.filter(s => s.id !== id);
    setSavedSchemes(updated);
    safeLocalStorageSet('savedPaintSchemes', JSON.stringify(updated));
  }, [savedSchemes]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setUploadedImage(result);

      // Extract palette from image
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const palette = extractPaletteFromImageData(imageData, 5);
        setExtractedPalette(palette);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, []);

  const applyExtractedPalette = useCallback(() => {
    if (extractedPalette.length === 0) return;
    setPaintRoles(prev => {
      const updated = [...prev];
      extractedPalette.forEach((color, i) => {
        if (i < updated.length) {
          updated[i] = { ...updated[i], color };
        }
      });
      safeLocalStorageSet('paintRoles', JSON.stringify(updated));
      return updated;
    });
    if (extractedPalette.length > 0) {
      updateBaseColor(extractedPalette[0]);
    }
  }, [extractedPalette, updateBaseColor]);

  const copyHex = (hex: string) => {
    navigator.clipboard?.writeText(hex);
  };

  const SectionHeader = ({ title, section, icon: Icon }: { title: string; section: 'generator' | 'wheel' | 'saved'; icon: React.ElementType }) => (
    <button
      onClick={() => setExpandedSection(expandedSection === section ? null : section)}
      className="w-full flex items-center justify-between py-2 text-xs font-bold text-slate-400 uppercase tracking-wider hover:text-grim-gold transition-colors"
    >
      <span className="flex items-center gap-1.5"><Icon size={12} />{title}</span>
      {expandedSection === section ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
    </button>
  );

  const roleColorMap: Record<string, string> = {};
  paintRoles.forEach(r => { roleColorMap[r.role] = r.color; });

  return (
    <div className="space-y-3">
      {/* Color Scheme Generator */}
      <SectionHeader title="Color Scheme Generator" section="generator" icon={Palette} />
      {expandedSection === 'generator' && (
        <div className="space-y-3 animate-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-slate-500 uppercase font-bold">Base Color</label>
            <input
              type="color"
              value={baseColor}
              onChange={(e) => updateBaseColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border border-grim-700 bg-transparent"
            />
            <span className="text-[10px] font-mono text-slate-400">{baseColor}</span>
          </div>

          <div className="space-y-2">
            {schemes.map((scheme, idx) => (
              <button
                key={scheme.name}
                onClick={() => { setSelectedScheme(idx); applySchemeToRoles(scheme); }}
                className={`w-full text-left p-2 rounded border transition-all ${
                  selectedScheme === idx
                    ? 'border-grim-gold/50 bg-grim-800'
                    : 'border-grim-700/50 hover:border-grim-600'
                }`}
              >
                <div className="text-[10px] font-bold text-slate-300 mb-1">{scheme.name}</div>
                <div className="text-[9px] text-slate-500 mb-1.5">{scheme.description}</div>
                <div className="flex gap-1">
                  {scheme.colors.map((color, i) => (
                    <div
                      key={i}
                      className="h-6 flex-1 rounded-sm border border-black/30 cursor-pointer hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      title={color}
                      onClick={(e) => { e.stopPropagation(); copyHex(color); }}
                    />
                  ))}
                </div>
              </button>
            ))}
          </div>

          {/* Image Upload for Palette Extraction */}
          <div className="border-t border-grim-700 pt-2">
            <div className="text-[10px] text-slate-500 uppercase font-bold mb-1.5">Extract from Image</div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-1.5 py-2 bg-grim-800 hover:bg-grim-700 text-slate-300 rounded text-xs border border-grim-700 transition-colors"
            >
              <Upload size={14} /> Upload Image
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            <canvas ref={canvasRef} className="hidden" />

            {extractedPalette.length > 0 && (
              <div className="mt-2 space-y-1.5">
                <div className="flex gap-1">
                  {extractedPalette.map((color, i) => (
                    <div
                      key={i}
                      className="h-8 flex-1 rounded-sm border border-black/30 cursor-pointer hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      title={color}
                      onClick={() => copyHex(color)}
                    />
                  ))}
                </div>
                <button
                  onClick={applyExtractedPalette}
                  className="w-full py-1.5 bg-grim-gold/20 hover:bg-grim-gold/30 text-grim-gold rounded text-[10px] font-bold border border-grim-gold/30 transition-colors"
                >
                  Apply to Palette
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Miniature Color Wheel */}
      <SectionHeader title="Miniature Color Wheel" section="wheel" icon={Pipette} />
      {expandedSection === 'wheel' && (
        <div className="space-y-3 animate-in slide-in-from-top-1 duration-200">
          {/* Model Silhouette Preview */}
          <div className="relative bg-grim-800 rounded-lg border border-grim-700 p-2">
            <div className="text-[9px] text-slate-500 uppercase font-bold mb-1 text-center">Preview</div>
            <svg viewBox="0 95 80 100" className="w-full h-32">
              {/* Background silhouette */}
              <rect x="0" y="0" width="80" height="100" fill="transparent" />
              {Object.entries(MODEL_REGIONS).map(([role, { path }]) => (
                <path
                  key={role}
                  d={path}
                  fill={roleColorMap[role] || '#404040'}
                  stroke="#000"
                  strokeWidth="0.5"
                  className="transition-colors duration-200"
                />
              ))}
            </svg>
          </div>

          {/* Role Color Assignments */}
          <div className="space-y-1">
            {paintRoles.map(role => (
              <div key={role.id} className="flex items-center gap-2 group">
                <input
                  type="color"
                  value={role.color}
                  onChange={(e) => updateRoleColor(role.id, e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border border-grim-700 bg-transparent shrink-0"
                />
                <span className="text-[10px] text-slate-300 flex-1">{role.label}</span>
                <span className="text-[9px] font-mono text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => copyHex(role.color)}>{role.color}</span>
              </div>
            ))}
          </div>

          {/* Save Scheme */}
          <div className="flex gap-1.5">
            <input
              type="text"
              value={schemeName}
              onChange={(e) => setSchemeName(e.target.value)}
              placeholder="Scheme name..."
              className="flex-1 bg-grim-800 border border-grim-700 rounded px-2 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-grim-gold/50"
            />
            <button
              onClick={saveScheme}
              className="px-3 py-1.5 bg-grim-gold/20 hover:bg-grim-gold/30 text-grim-gold rounded text-[10px] font-bold border border-grim-gold/30 transition-colors shrink-0"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Saved Schemes */}
      <SectionHeader title="Saved Schemes" section="saved" icon={Copy} />
      {expandedSection === 'saved' && (
        <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-200">
          {savedSchemes.length === 0 ? (
            <div className="text-[10px] text-slate-600 text-center py-4 italic">No saved schemes yet</div>
          ) : (
            savedSchemes.map(scheme => (
              <div key={scheme.id} className="flex items-center gap-2 p-2 bg-grim-800 rounded border border-grim-700/50 group hover:border-grim-600 transition-colors">
                <div className="flex gap-0.5 shrink-0">
                  {scheme.colors.slice(0, 4).map((r, i) => (
                    <div key={i} className="w-4 h-4 rounded-sm border border-black/30" style={{ backgroundColor: r.color }} />
                  ))}
                </div>
                <span className="text-[10px] text-slate-300 flex-1 truncate">{scheme.name}</span>
                <button onClick={() => loadScheme(scheme)} className="text-[9px] text-grim-gold opacity-0 group-hover:opacity-100 transition-opacity hover:underline">Load</button>
                <button onClick={() => deleteScheme(scheme.id)} className="text-[9px] text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:underline">Del</button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
