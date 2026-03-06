
import { useRef, useLayoutEffect } from 'react';

// This hook ensures we always have access to the latest value of a variable
// inside event listeners (like keydown) without having to add that variable
// to the useEffect dependency array, which would cause the listener to be
// removed and re-added constantly.
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  
  useLayoutEffect(() => {
    ref.current = value;
  });
  
  return ref;
}
