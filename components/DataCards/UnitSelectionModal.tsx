
import React, { useState, useEffect } from 'react';
import { ParsedArmyListEntry } from '../../types/dataCards';
import { X, Trash, Plus, AlertCircle, ArrowRight, User, Users } from 'lucide-react';

interface UnitSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  parsedUnits: ParsedArmyListEntry[];
  onConfirm: (finalList: ParsedArmyListEntry[]) => void;
}

export const UnitSelectionModal: React.FC<UnitSelectionModalProps> = ({
  isOpen, onClose, parsedUnits, onConfirm
}) => {
  const [items, setItems] = useState<ParsedArmyListEntry[]>([]);

  useEffect(() => { setItems(parsedUnits); }, [parsedUnits, isOpen]);

  if (!isOpen) return null;

  const handleUpdate = (id: string, updates: Partial<ParsedArmyListEntry>) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const calculateSquadCount = (lines?: string[]): number => {
    if (!lines || lines.length === 0) return 1;
    let total = 0;
    lines.forEach(line => {
      const match = line.match(/^(\d+)\s*x\s+/i);
      if (match) { total += parseInt(match[1], 10); } else { total += 1; }
    });
    return total > 0 ? total : 1;
  };

  const handleToggleSingle = (id: string, isSingle: boolean) => {
      setItems(prev => prev.map(item => {
          if (item.id === id) {
              let newCount = item.count;
              if (isSingle) { newCount = 1; }
              else {
                  const original = parsedUnits.find(u => u.id === id);
                  if (original && !original.isSingleModel) { newCount = original.count; }
                  else { newCount = calculateSquadCount(item.rawLines); }
              }
              return { ...item, isSingleModel: isSingle, count: newCount };
          }
          return item;
      }));
  };

  const handleDelete = (id: string) => { setItems(prev => prev.filter(i => i.id !== id)); };

  const handleAdd = () => {
      setItems(prev => [...prev, { id: `manual-add-${Date.now()}`, name: "New Unit", count: 1, isSingleModel: true, rawLines: [] }]);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[250] flex items-center justify-center p-4">
      <div className="bg-grim-900 w-full max-w-4xl rounded-lg border border-grim-700 shadow-2xl max-h-[90vh] flex flex-col">

        <div className="p-4 border-b border-grim-700 flex justify-between items-center bg-grim-900 rounded-t-lg">
            <div>
                <h2 className="text-xl font-bold text-white font-science">Review Army List</h2>
                <p className="text-xs text-slate-400">Verify unit types (Single vs Squad) to ensure correct parsing.</p>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white"><X size={20} /></button>
        </div>

        <div className="bg-blue-900/20 border-b border-blue-900/50 p-3 flex gap-3 items-start">
            <AlertCircle className="text-blue-400 shrink-0 mt-0.5" size={16} />
            <div className="text-xs text-blue-200 space-y-1">
                <p><strong>Single Model (Character/Monster):</strong> Bullet points = Active Weapons.</p>
                <p><strong>Multiple Models (Squad):</strong> Nested bullet points = Active Weapons.</p>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs font-bold text-slate-500 uppercase px-2 mb-1">
                <div className="col-span-6">Unit Name</div>
                <div className="col-span-3 text-center">Type</div>
                <div className="col-span-2 text-center">Models</div>
                <div className="col-span-1"></div>
            </div>

            {items.length === 0 && (
                <div className="text-center py-8 text-slate-500 italic">No units found. Add one manually.</div>
            )}

            {items.map(item => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-center bg-grim-800 p-2 rounded border border-grim-700 hover:border-grim-600 transition-colors">
                    <div className="col-span-6">
                        <input
                            className="w-full bg-transparent text-sm font-bold text-white focus:outline-none focus:text-grim-gold placeholder:text-slate-600"
                            value={item.name}
                            onChange={(e) => handleUpdate(item.id, { name: e.target.value })}
                            placeholder="Unit Datasheet Name"
                        />
                        {item.rawLines && item.rawLines.length > 0 && (
                            <div className="text-[10px] text-slate-500 truncate mt-1">
                                <span className="text-slate-400">Details: </span>
                                {item.rawLines.slice(0, 3).join(', ')}
                                {item.rawLines.length > 3 && '...'}
                            </div>
                        )}
                    </div>

                    <div className="col-span-3 flex justify-center">
                        <div className="flex bg-grim-900 rounded p-0.5 border border-grim-600">
                            <button
                                onClick={() => handleToggleSingle(item.id, true)}
                                className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-1 transition-colors ${item.isSingleModel ? 'bg-grim-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                <User size={12} /> Single
                            </button>
                            <button
                                onClick={() => handleToggleSingle(item.id, false)}
                                className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-1 transition-colors ${!item.isSingleModel ? 'bg-grim-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                <Users size={12} /> Squad
                            </button>
                        </div>
                    </div>

                    <div className="col-span-2 flex justify-center">
                         <div className={`flex items-center bg-grim-900 rounded border border-grim-600 ${item.isSingleModel ? 'opacity-50 pointer-events-none' : ''}`}>
                            <button className="px-2 text-slate-400 hover:text-white" onClick={() => handleUpdate(item.id, { count: Math.max(1, item.count - 1) })}>-</button>
                            <input type="number" min="1" className="w-10 bg-transparent text-center text-sm font-bold text-white focus:outline-none appearance-none m-0" value={item.count} onChange={(e) => handleUpdate(item.id, { count: parseInt(e.target.value) || 1 })} />
                            <button className="px-2 text-slate-400 hover:text-white" onClick={() => handleUpdate(item.id, { count: item.count + 1 })}>+</button>
                         </div>
                    </div>

                    <div className="col-span-1 flex justify-end">
                        <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-500 hover:bg-red-900/30 rounded" title="Remove Unit"><Trash size={14} /></button>
                    </div>
                </div>
            ))}

            <button onClick={handleAdd} className="w-full py-2 border border-dashed border-grim-600 text-slate-400 hover:text-white hover:border-grim-500 rounded text-xs flex items-center justify-center gap-2 mt-2">
                <Plus size={14} /> Add Unit Manually
            </button>
        </div>

        <div className="p-4 border-t border-grim-700 bg-grim-900 flex justify-end gap-3 rounded-b-lg">
             <button onClick={onClose} className="px-4 py-2 bg-grim-800 hover:bg-grim-700 text-slate-300 font-bold rounded text-sm">Cancel</button>
             <button
                onClick={() => onConfirm(items)}
                disabled={items.length === 0}
                className="px-6 py-2 bg-grim-gold hover:bg-yellow-500 disabled:bg-grim-800 disabled:text-slate-500 text-grim-900 font-bold rounded text-sm flex items-center gap-2 shadow-lg"
             >
                Confirm & Create Cards <ArrowRight size={16} />
             </button>
        </div>
      </div>
    </div>
  );
};
