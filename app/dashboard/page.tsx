'use client';

import { useState } from 'react';
import { DEFAULT_APIS } from '@/config/apis.config';
import { ApiCard } from '@/components/dashboard/api-card';
import { PollingControls } from '@/components/dashboard/polling-controls';

export default function DashboardPage() {
  const [autoPolling, setAutoPolling] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900">
            API Monitor Dashboard
          </h1>
          <p className="text-slate-600 mt-2">
            Real-time monitoring of your RESTful APIs
          </p>
          <div className="mt-4 flex items-center gap-4">
            <div className="text-sm text-slate-600">
              Monitoring <span className="font-semibold">{DEFAULT_APIS.length}</span> endpoints
            </div>
          </div>
        </header>

        {/* Polling Controls */}
        <PollingControls 
          onTogglePolling={setAutoPolling}
          isPolling={autoPolling}
        />

        {/* API Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {DEFAULT_APIS.map((endpoint) => (
            <ApiCard key={endpoint.id} endpoint={endpoint} autoPolling={autoPolling} />
          ))}
        </div>

        {/* Empty State */}
        {DEFAULT_APIS.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-slate-700 text-lg mb-2">
              No API endpoints configured
            </p>
            <p className="text-slate-500 text-sm">
              Add endpoints in <code className="bg-slate-100 px-2 py-1 rounded">config/apis.config.ts</code>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
