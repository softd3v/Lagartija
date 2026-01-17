import type { ApiEndpoint, ApiHealthCheck, ApiStatus } from '@/types';
import { sendAlertEmail } from './email-service';

interface AlertState {
  endpointId: string;
  lastStatus: ApiStatus;
  lastDatabaseConnected?: boolean;
  lastDownAlertTime: number;
  lastRecoveredAlertTime: number;
  lastDbAlertTime: number;
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
      lastDatabaseConnected: undefined,
      lastDownAlertTime: 0,
      lastRecoveredAlertTime: 0,
      lastDbAlertTime: 0,
      consecutiveFailures: 0,
    };

    const currentStatus = healthCheck.status;
    const now = Date.now();
    const cooldownMs = this.cooldownMinutes * 60 * 1000;

    // Check API status changes
    const statusChanged = state.lastStatus !== currentStatus;

    if (statusChanged) {
      // API went DOWN (including initial detection)
      if (currentStatus === 'down') {
        const downCooldownPassed = now - state.lastDownAlertTime > cooldownMs;
        if (downCooldownPassed) {
          console.log(`🚨 Alert: ${endpoint.name} went DOWN`);
          try {
            await sendAlertEmail(endpoint, healthCheck, 'down');
            state.lastDownAlertTime = now;
          } catch (error) {
            console.error('Failed to send DOWN alert:', error);
          }
        }
      }
      
      // API RECOVERED (only if it was previously DOWN, not from unknown)
      if (currentStatus === 'up' && state.lastStatus === 'down') {
        const recoveredCooldownPassed = now - state.lastRecoveredAlertTime > cooldownMs;
        if (recoveredCooldownPassed) {
          console.log(`✅ Alert: ${endpoint.name} recovered`);
          try {
            await sendAlertEmail(endpoint, healthCheck, 'recovered');
            state.lastRecoveredAlertTime = now;
          } catch (error) {
            console.error('Failed to send RECOVERY alert:', error);
          }
        }
      }
    }

    // Check DATABASE status changes (separate from API status)
    if (healthCheck.databaseConnected !== undefined) {
      const dbStatusChanged = state.lastDatabaseConnected !== undefined && 
                              state.lastDatabaseConnected !== healthCheck.databaseConnected;
      const dbCooldownPassed = now - state.lastDbAlertTime > cooldownMs;

      if (dbStatusChanged && dbCooldownPassed) {
        // Database went DOWN
        if (!healthCheck.databaseConnected) {
          console.log(`🚨 Database Alert: ${endpoint.name} database disconnected`);
          try {
            await sendAlertEmail(endpoint, healthCheck, 'database-down');
            state.lastDbAlertTime = now;
          } catch (error) {
            console.error('Failed to send DATABASE DOWN alert:', error);
          }
        }
        
        // Database RECOVERED
        if (healthCheck.databaseConnected && !state.lastDatabaseConnected) {
          console.log(`✅ Database Alert: ${endpoint.name} database reconnected`);
          try {
            await sendAlertEmail(endpoint, healthCheck, 'database-recovered');
            state.lastDbAlertTime = now;
          } catch (error) {
            console.error('Failed to send DATABASE RECOVERY alert:', error);
          }
        }
      }

      state.lastDatabaseConnected = healthCheck.databaseConnected;
    }

    // Update API state
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
