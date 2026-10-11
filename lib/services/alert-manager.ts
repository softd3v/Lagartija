import type { MonitorEndpoint, ApiHealthCheck, ApiStatus } from '@/types';
import { dispatchAlert } from './notification-service';

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
    endpoint: MonitorEndpoint,
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
      // API went DOWN - NO COOLDOWN (always alert immediately)
      if (currentStatus === 'down') {
        console.log(`🚨 Alert: ${endpoint.name} went DOWN`);
        try {
          await dispatchAlert(endpoint, healthCheck, 'down');
          state.lastDownAlertTime = now;
        } catch (error) {
          console.error('Failed to send DOWN alert:', error);
        }
      }
      
      // API RECOVERED - cooldown unless a DOWN alert is still pending acknowledgement
      if (currentStatus === 'up' && state.lastStatus === 'down') {
        const pendingRecovery = state.lastDownAlertTime > state.lastRecoveredAlertTime;
        const recoveredCooldownPassed = now - state.lastRecoveredAlertTime > cooldownMs;
        if (pendingRecovery || recoveredCooldownPassed) {
          console.log(`✅ Alert: ${endpoint.name} recovered`);
          try {
            await dispatchAlert(endpoint, healthCheck, 'recovered');
            state.lastRecoveredAlertTime = now;
          } catch (error) {
            console.error('Failed to send RECOVERY alert:', error);
          }
        } else {
          console.log(`⏳ RECOVERED alert skipped (cooldown active, ${Math.ceil((cooldownMs - (now - state.lastRecoveredAlertTime)) / 60000)} min remaining)`);
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
            await dispatchAlert(endpoint, healthCheck, 'database-down');
            state.lastDbAlertTime = now;
          } catch (error) {
            console.error('Failed to send DATABASE DOWN alert:', error);
          }
        }
        
        // Database RECOVERED
        if (healthCheck.databaseConnected && !state.lastDatabaseConnected) {
          console.log(`✅ Database Alert: ${endpoint.name} database reconnected`);
          try {
            await dispatchAlert(endpoint, healthCheck, 'database-recovered');
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
