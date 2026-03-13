import { useState, useCallback } from 'react';

export function useHistory<T>(_initialStateFactory?: () => T) {
  const [history, setHistory] = useState<T[]>([]);
  const [redoStack, setRedoStack] = useState<T[]>([]);

  const saveHistory = useCallback((currentState: T) => {
    setHistory(prev => [...prev.slice(-49), currentState]);
    setRedoStack([]);
  }, []);

  const undo = useCallback((currentState: T, applyState: (state: T) => void) => {
    if (history.length === 0) return;
    const previousState = history[history.length - 1];
    
    setRedoStack(prev => [currentState, ...prev]);
    setHistory(prev => prev.slice(0, prev.length - 1));
    applyState(previousState);
  }, [history]);

  const redo = useCallback((currentState: T, applyState: (state: T) => void) => {
    if (redoStack.length === 0) return;
    const nextState = redoStack[0];
    
    setHistory(prev => [...prev, currentState]);
    setRedoStack(prev => prev.slice(1));
    applyState(nextState);
  }, [redoStack]);

  return {
    history,
    redoStack,
    saveHistory,
    undo,
    redo
  };
}
