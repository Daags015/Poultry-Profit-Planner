import React from 'react';
import { AlertTriangle, CheckCircle2, CloudOff, RefreshCw } from 'lucide-react';
import { useData } from '@/src/context/DataContext';

export const SyncStatusPill: React.FC = () => {
  const { syncStatus, pendingCount, syncNow, isOnline } = useData();

  if (syncStatus === 'syncing') {
    return (
      <button
        type="button"
        onClick={() => void syncNow()}
        className="inline-flex items-center gap-2 min-h-[38px] px-3 py-1.5 rounded-lg border border-[#173F35]/20 bg-white text-xs font-medium text-[#173F35] whitespace-nowrap shrink-0"
      >
        <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#4F8A5B]" />
        <span>Syncing...</span>
      </button>
    );
  }

  if (syncStatus === 'attention') {
    return (
      <button
        type="button"
        onClick={() => void syncNow()}
        className="inline-flex items-center gap-2 min-h-[38px] px-3 py-1.5 rounded-lg border border-red-300 bg-red-50 text-xs font-medium text-red-800 hover:bg-red-100 transition-colors whitespace-nowrap shrink-0"
      >
        <AlertTriangle className="w-3.5 h-3.5 text-red-700" />
        <span>Sync Attention Needed</span>
      </button>
    );
  }

  if (!isOnline || syncStatus === 'offline_pending' || syncStatus === 'offline') {
    return (
      <button
        type="button"
        onClick={() => void syncNow()}
        className="inline-flex items-center gap-2 min-h-[38px] px-3 py-1.5 rounded-lg border border-[#E6B84A] bg-[#E6B84A]/20 text-xs font-semibold text-[#26312D] hover:bg-[#E6B84A]/30 transition-colors whitespace-nowrap shrink-0"
        title="Click to retry sync when online"
      >
        <CloudOff className="w-3.5 h-3.5 text-[#173F35]" />
        <span>
          {pendingCount > 0
            ? `Offline — Saved on device (${pendingCount} pending)`
            : 'Offline — Saved on device'}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void syncNow()}
      className="inline-flex items-center gap-2 min-h-[38px] px-3 py-1.5 rounded-lg border border-[#4F8A5B]/30 bg-[#4F8A5B]/10 text-xs font-medium text-[#173F35] hover:bg-[#4F8A5B]/15 transition-colors whitespace-nowrap shrink-0"
      title="All records saved and synced"
    >
      <CheckCircle2 className="w-3.5 h-3.5 text-[#4F8A5B]" />
      <span>Synced</span>
    </button>
  );
};
