
import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export const ConnectionStatus: React.FC = () => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Only render when offline - no visual noise for online state
  if (isOnline) return null;

  return (
    <div
      className="fixed top-3 left-1/2 -translate-x-1/2 z-[90] flex items-center gap-2 px-4 py-2 rounded-full bg-red-900/95 backdrop-blur border border-red-500/60 text-white shadow-lg shadow-red-900/30 animate-pulse select-none pointer-events-none"
    >
      <WifiOff size={14} />
      <span className="text-[10px] font-bold tracking-widest uppercase">
        Connection Lost
      </span>
    </div>
  );
};
