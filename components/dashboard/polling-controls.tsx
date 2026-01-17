'use client';

import { useState } from 'react';
import { Play, Square, Mail, AlertTriangle, CheckCircle } from 'lucide-react';

interface PollingControlsProps {
  onTogglePolling: (enabled: boolean) => void;
  isPolling: boolean;
}

export function PollingControls({ onTogglePolling, isPolling }: PollingControlsProps) {
  const [testingEmail, setTestingEmail] = useState(false);
  const [testingDown, setTestingDown] = useState(false);
  const [testingRecovered, setTestingRecovered] = useState(false);
  const [emailResult, setEmailResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestEmail = async () => {
    setTestingEmail(true);
    setEmailResult(null);

    try {
      const res = await fetch('/api/send-test-email');
      const data = await res.json();

      if (data.success) {
        setEmailResult({
          success: true,
          message: `Test email sent to: ${data.recipients.join(', ')}`,
        });
      } else {
        setEmailResult({
          success: false,
          message: data.error || 'Failed to send test email',
        });
      }
    } catch (error) {
      setEmailResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setTestingEmail(false);
    }
  };

  const handleTestDownAlert = async () => {
    setTestingDown(true);
    setEmailResult(null);

    try {
      const res = await fetch('/api/send-test-down-alert');
      const data = await res.json();

      if (data.success) {
        setEmailResult({
          success: true,
          message: `DOWN alert sent for "${data.endpoint}" to: ${data.recipients.join(', ')}`,
        });
      } else {
        setEmailResult({
          success: false,
          message: data.error || 'Failed to send DOWN alert',
        });
      }
    } catch (error) {
      setEmailResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setTestingDown(false);
    }
  };

  const handleTestRecoveredAlert = async () => {
    setTestingRecovered(true);
    setEmailResult(null);

    try {
      const res = await fetch('/api/send-test-recovered-alert');
      const data = await res.json();

      if (data.success) {
        setEmailResult({
          success: true,
          message: `RECOVERED alert sent for "${data.endpoint}" to: ${data.recipients.join(', ')}`,
        });
      } else {
        setEmailResult({
          success: false,
          message: data.error || 'Failed to send RECOVERED alert',
        });
      }
    } catch (error) {
      setEmailResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setTestingRecovered(false);
    }
  };

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

        <div className="flex gap-3 flex-wrap">
          <button
            onClick={handleTestEmail}
            disabled={testingEmail}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
          >
            <Mail className={`w-4 h-4 ${testingEmail ? 'animate-pulse' : ''}`} />
            {testingEmail ? 'Sending...' : 'Test Email'}
          </button>

          <button
            onClick={handleTestDownAlert}
            disabled={testingDown}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
          >
            <AlertTriangle className={`w-4 h-4 ${testingDown ? 'animate-pulse' : ''}`} />
            {testingDown ? 'Sending...' : 'Test DOWN Alert'}
          </button>

          <button
            onClick={handleTestRecoveredAlert}
            disabled={testingRecovered}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
          >
            <CheckCircle className={`w-4 h-4 ${testingRecovered ? 'animate-pulse' : ''}`} />
            {testingRecovered ? 'Sending...' : 'Test RECOVERED'}
          </button>

          <button
            onClick={() => onTogglePolling(!isPolling)}
            className={`flex items-center gap-2 px-6 py-2 rounded-md transition-colors font-medium ${
              isPolling
                ? 'bg-orange-600 hover:bg-orange-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
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

      {emailResult && (
        <div
          className={`mt-4 p-3 rounded-md ${
            emailResult.success
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          <p
            className={`text-sm ${
              emailResult.success ? 'text-green-800' : 'text-red-800'
            }`}
          >
            {emailResult.success ? '✅' : '❌'} {emailResult.message}
          </p>
        </div>
      )}
    </div>
  );
}
