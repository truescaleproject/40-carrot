
import React, { useState } from 'react';
import { Die } from '../types';
import { Dices, RotateCcw, Trash2, Plus, MinusCircle } from 'lucide-react';

interface DiceRollerProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const DiceRoller: React.FC<DiceRollerProps> = ({ isOpen }) => {
  const [dice, setDice] = useState<Die[]>([]);

  const addDice = (count: number) => {
    const newDice: Die[] = Array.from({ length: count }).map(() => ({
      // FIX: Use substring instead of deprecated substr
      id: Math.random().toString(36).substring(2, 11),
      value: Math.floor(Math.random() * 6) + 1,
      selected: false,
    }));
    setDice((prev) => [...prev, ...newDice]);
  };

  const removeDie = (id: string) => {
    setDice((prev) => prev.filter((d) => d.id !== id));
  };

  const removeSelected = () => {
    setDice((prev) => prev.filter((d) => !d.selected));
  };

  const toggleSelect = (id: string) => {
    setDice((prev) =>
      prev.map((d) => (d.id === id ? { ...d, selected: !d.selected } : d))
    );
  };

  const rollSelected = () => {
    setDice((prev) =>
      prev.map((d) =>
        d.selected ? { ...d, value: Math.floor(Math.random() * 6) + 1, selected: false } : d
      )
    );
  };

  const rollAll = () => {
    setDice((prev) =>
      prev.map((d) => ({
        ...d,
        value: Math.floor(Math.random() * 6) + 1,
        selected: false,
      }))
    );
  };

  const clearDice = () => setDice([]);

  const getDiceColor = (val: number) => {
    if (val === 6) return 'text-green-400 border-green-500';
    if (val === 1) return 'text-red-400 border-red-500';
    return 'text-white border-slate-600';
  };

  if (!isOpen) return null;

  const selectedCount = dice.filter(d => d.selected).length;
  const total = dice.reduce((sum, d) => sum + d.value, 0);
  const average = dice.length > 0 ? (total / dice.length).toFixed(1) : 0;

  return (
    <div className="w-full h-full flex flex-col bg-grim-900/50">
      <div className="bg-grim-800 p-3 flex justify-between items-center border-b border-grim-700">
        <h3 className="font-bold text-grim-gold flex items-center gap-2">
          <Dices size={18} /> Dice Tray
        </h3>
        {/* Toggle handled by parent tab system */}
      </div>

      <div className="p-4 flex-1 overflow-y-auto grid grid-cols-5 gap-2 content-start">
        {dice.map((d) => (
          <button
            key={d.id}
            onClick={() => toggleSelect(d.id)}
            onContextMenu={(e) => { e.preventDefault(); removeDie(d.id); }}
            className={`
              aspect-square rounded-lg border-2 flex items-center justify-center text-xl font-bold transition-all
              ${d.selected ? 'bg-grim-700 ring-2 ring-grim-gold ring-offset-2 ring-offset-grim-900' : 'bg-grim-800'}
              ${getDiceColor(d.value)}
            `}
          >
            {d.value}
          </button>
        ))}
        {dice.length === 0 && (
          <div className="col-span-full text-center text-slate-500 py-12 text-sm italic">
            Tap the buttons below to add dice to the tray.
          </div>
        )}
      </div>

      <div className="bg-grim-800 p-4 border-t border-grim-700 space-y-4">
        <div className="flex justify-between text-xs text-slate-400 font-mono bg-grim-900/50 p-2 rounded">
            <span>TOTAL: <span className="text-white font-bold">{total}</span></span>
            <span>AVG: <span className="text-white font-bold">{average}</span></span>
            <span>COUNT: <span className="text-white font-bold">{dice.length}</span></span>
        </div>

        <div className="grid grid-cols-3 gap-3">
           <button onClick={() => addDice(1)} className="bg-grim-700 hover:bg-grim-600 py-3 rounded text-sm font-bold flex items-center justify-center gap-1 border border-grim-600"><Plus size={16}/> 1</button>
           <button onClick={() => addDice(5)} className="bg-grim-700 hover:bg-grim-600 py-3 rounded text-sm font-bold flex items-center justify-center gap-1 border border-grim-600"><Plus size={16}/> 5</button>
           <button onClick={() => addDice(10)} className="bg-grim-700 hover:bg-grim-600 py-3 rounded text-sm font-bold flex items-center justify-center gap-1 border border-grim-600"><Plus size={16}/> 10</button>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={selectedCount > 0 ? rollSelected : rollAll}
            className="flex-1 bg-blue-700 hover:bg-blue-600 text-white py-3 rounded text-sm font-bold flex items-center justify-center gap-2 shadow-lg"
          >
            <RotateCcw size={18} /> 
            {selectedCount > 0 ? `Reroll (${selectedCount})` : 'Roll All'}
          </button>
          
          {selectedCount > 0 && (
            <button 
              onClick={removeSelected}
              className="bg-orange-700 hover:bg-orange-600 text-white px-4 py-3 rounded text-sm font-bold flex items-center justify-center"
              title="Remove Selected"
            >
              <MinusCircle size={18} />
            </button>
          )}

          <button onClick={clearDice} className="bg-red-900/50 hover:bg-red-900 text-red-200 px-4 py-3 rounded border border-red-800" title="Clear All Dice">
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
