import type { AlertType, ApiHealthCheck, MonitorEndpoint } from '@/types';
import { sendAlertEmail } from './email-service';
import { sendWebhookAlerts } from './webhook-service';

export async function dispatchAlert(
  endpoint: MonitorEndpoint,
  healthCheck: ApiHealthCheck,
  alertType: AlertType
): Promise<void> {
  const [emailResult, webhookResult] = await Promise.allSettled([
    sendAlertEmail(endpoint, healthCheck, alertType),
    sendWebhookAlerts(endpoint, healthCheck, alertType),
  ]);

  if (emailResult.status === 'rejected') {
    console.error('Failed to send email alert:', emailResult.reason);
  }

  if (webhookResult.status === 'rejected') {
    console.error('Failed to send webhook alerts:', webhookResult.reason);
  }
}
