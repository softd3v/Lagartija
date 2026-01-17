import type { ApiEndpoint, ApiHealthCheck, ApiStatus } from '@/types';
import { sendAlertEmail } from './email-service';

interface AlertState {
  endpointId: string;
  lastStatus: ApiStatus;
  lastAlertTime: number;
  consecutiveFailures: number;
}

class AlertManager {
  private states: Map<string, AlertState> = new Map();
  private cooldownMinutes: number;

  constructor() {
    this.cooldownMinutes = Number(process.env.ALERT_COOLDOWN_MINUTES) || 5;
  }

  async checkAndAlert(
    endpoint: ApiEndpoint,
    healthCheck: ApiHealthCheck
  ): Promise<void> {
    const state = this.states.get(endpoint.id) || {
      endpointId: endpoint.id,
      lastStatus: 'unknown' as ApiStatus,
      lastAlertTime: 0,
      consecutiveFailures: 0,
    };

    const currentStatus = healthCheck.status;
    const now = Date.now();
    const cooldownMs = this.cooldownMinutes * 60 * 1000;

    // Check if status changed
    const statusChanged = state.lastStatus !== 'unknown' && state.lastStatus !== currentStatus;

    // Check if cooldown period has passed
    const cooldownPassed = now - state.lastAlertTime > cooldownMs;

    if (statusChanged && cooldownPassed) {
      // API went DOWN
      if (currentStatus === 'down') {
        console.log(`🚨 Alert: ${endpoint.name} went DOWN`);
        try {
          await sendAlertEmail(endpoint, healthCheck, 'down');
          state.lastAlertTime = now;
        } catch (error) {
          console.error('Failed to send DOWN alert:', error);
        }
      }
      
      // API RECOVERED
      if (currentStatus === 'up' && state.lastStatus === 'down') {
        console.log(`✅ Alert: ${endpoint.name} recovered`);
        try {
          await sendAlertEmail(endpoint, healthCheck, 'recovered');
          state.lastAlertTime = now;
        } catch (error) {
          console.error('Failed to send RECOVERY alert:', error);
        }
      }
    }

    // Update state
    state.lastStatus = currentStatus;
    if (currentStatus === 'down') {
      state.consecutiveFailures++;
    } else {
      state.consecutiveFailures = 0;
    }

    this.states.set(endpoint.id, state);
  }

  getState(endpointId: string): AlertState | undefined {
    return this.states.get(endpointId);
  }

  reset(endpointId?: string): void {
    if (endpointId) {
      this.states.delete(endpointId);
    } else {
      this.states.clear();
    }
  }
}

// Singleton instance
export const alertManager = new AlertManager();
