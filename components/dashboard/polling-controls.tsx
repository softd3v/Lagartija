'use client';

import { Play, Square } from 'lucide-react';

interface PollingControlsProps {
  onTogglePolling: (enabled: boolean) => void;
  isPolling: boolean;
}

export function PollingControls({ onTogglePolling, isPolling }: PollingControlsProps) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-1">
            Monitoring Controls
          </h2>
          <p className="text-sm text-slate-600">
            {isPolling ? (
              <span className="text-green-600 font-medium">● Active monitoring with email alerts</span>
            ) : (
              <span className="text-slate-500">Manual monitoring only</span>
            )}
          </p>
        </div>

        <button
          onClick={() => onTogglePolling(!isPolling)}
          className={`flex items-center gap-2 px-6 py-2 rounded-md transition-colors font-medium ${
            isPolling
              ? 'bg-orange-600 hover:bg-orange-700 text-white'
              : 'bg-[#cc0000] hover:bg-[#aa0000] text-white'
          }`}
        >
          {isPolling ? (
            <>
              <Square className="w-4 h-4" />
              Stop Monitoring
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Start Monitoring
            </>
          )}
        </button>
      </div>
    </div>
  );
}
