
import React, { useEffect, useState, useRef } from 'react';
import { useLatest } from './useLatest';
import { InteractionMode } from '../types';

// --- Configuration ---
// Defining keys here allows for easy remapping in the future without touching logic.
const KEY_BINDINGS = {
  TOOLS: {
    SELECT: 'KeyV',
    PAN: 'KeyB',
    MEASURE: 'KeyM',
    DRAW: 'Period', // .
    DEPLOY: 'Comma', // ,
    ARROW: 'KeyA', // a
  },
  TOGGLES: {
    AURAS: 'KeyR',
    EDGES: 'KeyX',
    TERRAIN: 'KeyH',
    SIDEBAR: 'KeyO',
    TERRAIN_LOCK: 'KeyL',
    THREAT_RANGE: 'KeyT',
  },
  ACTIONS: {
    GROUP: 'KeyG',
    DELETE: ['Delete', 'Backspace'],
    COPY: 'KeyC',
    PASTE: 'KeyV', // Overlaps with SELECT, distinguished by Modifier
    UNDO_REDO: 'KeyZ',
    CLEAR_LINES: 'BracketLeft', // [
    CLEAR_ZONES: 'BracketRight', // ]
    RESET_VIEW: 'Space',
    DAMAGE_MODE: 'Tab',
  }
};

interface UseKeyboardControlsProps {
  mode: InteractionMode;
  setMode: (mode: InteractionMode) => void;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Actions
  onCopy: () => void;
  onPaste: () => void;
  onDelete: () => void;
  onGroupToggle: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onClearLines: () => void;
  onClearZones: () => void;
  onToggleTerrainLock: () => void;
  onResetView: () => void;
  
  // Specifics
  applyFormation: (type: 'LINE_COHERENCY' | 'BASE_TO_BASE' | 'CIRCLE') => void;
  cycleAuraRadius: () => void;
  toggleEdgeMeasurements: () => void;
  toggleTerrainVisibility: () => void;
  cycleThreatRange: () => void;

  // State Checks
  canUndo: boolean;
  canRedo: boolean;
}

export const useKeyboardControls = (props: UseKeyboardControlsProps) => {
  const latestProps = useLatest(props);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isTabPressed, setIsTabPressed] = useState(false);
  
  // Tracks if the user performed an interaction (like a pan) while holding space
  const didActionWhileSpaceDown = useRef(false);

  // Expose a way for the consumer to signal that an interaction occurred
  const recordInteraction = () => {
    if (isSpacePressed) {
      didActionWhileSpaceDown.current = true;
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const p = latestProps.current;
      const target = e.target as HTMLElement;
      
      // 1. Ignore inputs to prevent typing from triggering shortcuts
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const isMod = e.ctrlKey || e.metaKey; 
      const isShift = e.shiftKey;
      const isAlt = e.altKey;
      const code = e.code;

      // --- HELD STATE DETECTION ---
      if (code === KEY_BINDINGS.ACTIONS.RESET_VIEW) {
          if (!isSpacePressed) {
            setIsSpacePressed(true);
            didActionWhileSpaceDown.current = false;
          }
          e.preventDefault();
          return;
      }

      if (code === KEY_BINDINGS.ACTIONS.DAMAGE_MODE) {
          setIsTabPressed(true);
          e.preventDefault();
          return;
      }

      // --- EDITING ACTIONS (Priority over Tools) ---

      // Delete
      if (KEY_BINDINGS.ACTIONS.DELETE.includes(code)) {
          p.onDelete();
          return;
      }

      // Copy (Mod + C) or Formation (C)
      if (code === KEY_BINDINGS.ACTIONS.COPY) {
          if (isMod) {
              e.preventDefault();
              p.onCopy();
          } else if (!isMod && !isShift && !isAlt) {
              p.applyFormation('LINE_COHERENCY');
          } else if (isShift && !isMod) {
              e.preventDefault();
              p.applyFormation('BASE_TO_BASE');
          } else if (isAlt && !isMod) {
              e.preventDefault();
              p.applyFormation('CIRCLE');
          }
          return;
      }

      // Paste (Mod + V)
      if (isMod && code === KEY_BINDINGS.ACTIONS.PASTE) {
          e.preventDefault();
          p.onPaste();
          return;
      }

      // Undo / Redo (Mod + Z)
      if (isMod && code === KEY_BINDINGS.ACTIONS.UNDO_REDO) {
          e.preventDefault();
          if (isShift) {
              if (p.canRedo) p.onRedo();
          } else {
              if (p.canUndo) p.onUndo();
          }
          return;
      }

      // Group Toggle
      if (code === KEY_BINDINGS.ACTIONS.GROUP) {
          p.onGroupToggle();
          return;
      }

      // Clear Lines / Zones
      if (code === KEY_BINDINGS.ACTIONS.CLEAR_LINES) p.onClearLines();
      if (code === KEY_BINDINGS.ACTIONS.CLEAR_ZONES) p.onClearZones();

      // --- TOGGLES ---
      if (code === KEY_BINDINGS.TOGGLES.AURAS) p.cycleAuraRadius();
      if (code === KEY_BINDINGS.TOGGLES.EDGES && !isMod) p.toggleEdgeMeasurements();
      if (code === KEY_BINDINGS.TOGGLES.TERRAIN) p.toggleTerrainVisibility();
      if (code === KEY_BINDINGS.TOGGLES.SIDEBAR && !isMod) p.setSidebarOpen(prev => !prev);
      if (code === KEY_BINDINGS.TOGGLES.TERRAIN_LOCK) p.onToggleTerrainLock();
      if (code === KEY_BINDINGS.TOGGLES.THREAT_RANGE && !isMod) p.cycleThreatRange();

      // --- TOOLS ---
      // Only switch tools if NO modifier keys are pressed (to avoid conflicts)
      if (!isMod && !isShift && !isAlt) {
          if (code === KEY_BINDINGS.TOOLS.SELECT) p.setMode(InteractionMode.SELECT);
          if (code === KEY_BINDINGS.TOOLS.PAN) p.setMode(InteractionMode.PAN);
          if (code === KEY_BINDINGS.TOOLS.MEASURE) p.setMode(InteractionMode.MEASURE);
          if (code === KEY_BINDINGS.TOOLS.DRAW) p.setMode(InteractionMode.DRAW);
          if (code === KEY_BINDINGS.TOOLS.DEPLOY) p.setMode(InteractionMode.DEPLOYMENT);
          if (code === KEY_BINDINGS.TOOLS.ARROW) p.setMode(InteractionMode.ARROW);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      const target = e.target as HTMLElement;
      
      // Check if user is typing in an input
      const isInput = 
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable;

      if (code === KEY_BINDINGS.ACTIONS.RESET_VIEW) {
        setIsSpacePressed(false);
        // Only trigger reset view if no panning action happened while holding space
        // AND the user is not typing in a text box
        if (!didActionWhileSpaceDown.current && !isInput) {
          latestProps.current.onResetView();
        }
        didActionWhileSpaceDown.current = false;
      }
      if (code === KEY_BINDINGS.ACTIONS.DAMAGE_MODE) {
        setIsTabPressed(false);
      }
    };

    const handleBlur = () => {
        setIsSpacePressed(false);
        setIsTabPressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [latestProps, isSpacePressed]);

  return { isSpacePressed, isTabPressed, recordInteraction };
};
