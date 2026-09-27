import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-amber-600/95 backdrop-blur-md px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg border border-amber-400/40 animate-fade-in max-w-[90vw]">
      <WifiOff className="w-3.5 h-3.5 animate-pulse text-amber-200 shrink-0" />
      <span className="truncate">وضع دون اتصال — المصحف والتفسير يعملان محلياً</span>
    </div>
  );
};
