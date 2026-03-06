
import React, { useState, useRef, useEffect } from 'react';
import { Plus, Mountain, Swords, GripVertical, X } from 'lucide-react';
import { ElementType } from '../types';

interface QuickMenuProps {
  onAdd: (type: ElementType) => void;
}

export const QuickMenu: React.FC<QuickMenuProps> = ({ onAdd }) => {
  const [position, setPosition] = useState({ x: 20, y: 120 });
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number, y: number } | null>(null);
  const initialPosRef = useRef<{ x: number, y: number } | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }
  }, []);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (isDragging && dragStartRef.current && initialPosRef.current) {
        const clientX = e.clientX;
        const clientY = e.clientY;

        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        
        rafRef.current = requestAnimationFrame(() => {
            if (!dragStartRef.current || !initialPosRef.current) return;
            const dx = clientX - dragStartRef.current.x;
            const dy = clientY - dragStartRef.current.y;
            
            // Simple bounds checking to keep somewhat on screen
            const newX = Math.max(0, Math.min(window.innerWidth - 60, initialPosRef.current.x + dx));
            const newY = Math.max(50, Math.min(window.innerHeight - 60, initialPosRef.current.y + dy));

            setPosition({ x: newX, y: newY });
        });
      }
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
      initialPosRef.current = null;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };

    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging]);

  const handleDragStart = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialPosRef.current = { ...position };
  };

  const Tooltip = ({ text }: { text: string }) => (
    <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-grim-900 border border-grim-600 text-text-primary text-[10px] px-2 py-1 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-75 pointer-events-none whitespace-nowrap z-[100]">
      {text}
    </div>
  );

  return (
    <div 
      className="fixed z-[70]"
      style={{ left: position.x, top: position.y }}
    >
      <div className={`
        flex items-center bg-grim-900/90 backdrop-blur-md border border-grim-gold rounded-full shadow-2xl transition-all duration-300
        ${isOpen ? 'p-1.5 gap-2 pl-2 pr-1' : 'w-16 h-9 p-1 gap-1'}
      `}>
        
        {/* Handle (Always visible) */}
        <div
          className="cursor-grab active:cursor-grabbing text-grim-500 hover:text-grim-gold transition-colors flex items-center justify-center h-full w-6 shrink-0 rounded hover:bg-white/5 relative group"
          onPointerDown={handleDragStart}
          role="separator"
          aria-label="Drag to reposition quick menu"
        >
          <GripVertical size={14} />
          <Tooltip text="Drag Menu" />
        </div>

        {/* Separator only when closed */}
        {!isOpen && <div className="h-4 w-px bg-grim-700/50"></div>}

        {/* Expanded Content */}
        {isOpen ? (
          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
            <button
              onClick={() => onAdd(ElementType.MODEL)}
              aria-label="Add Unit"
              className="w-8 h-8 rounded-full bg-grim-800 border border-grim-700 flex items-center justify-center text-blue-400 hover:bg-grim-700 hover:text-white hover:border-blue-500 transition-all shadow-sm relative group"
            >
              <Swords size={14} />
              <Tooltip text="Add Unit" />
            </button>
            <button
              onClick={() => onAdd(ElementType.TERRAIN)}
              aria-label="Add Terrain"
              className="w-8 h-8 rounded-full bg-grim-800 border border-grim-700 flex items-center justify-center text-slate-400 hover:bg-grim-700 hover:text-white hover:border-slate-500 transition-all shadow-sm relative group"
            >
              <Mountain size={14} />
              <Tooltip text="Add Terrain" />
            </button>
            <div className="w-px h-6 bg-grim-700 mx-1"></div>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close quick menu"
              className="w-6 h-6 rounded-full flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-grim-800 transition-colors relative group"
            >
              <X size={14} />
              <Tooltip text="Close" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsOpen(true)}
            aria-label="Open quick actions menu"
            className="flex-1 h-full flex items-center justify-center text-grim-gold hover:text-white hover:scale-110 transition-transform rounded hover:bg-white/5 relative group"
          >
            <Plus size={16} strokeWidth={3} />
            <Tooltip text="Quick Actions" />
          </button>
        )}
      </div>
    </div>
  );
};
