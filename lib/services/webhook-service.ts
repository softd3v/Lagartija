import type {
  AlertType,
  ApiHealthCheck,
  MonitorEndpoint,
  WebhookConfig,
  WebhookType,
} from '@/types';
import { getEnabledWebhooks } from '@/lib/db/webhooks-repository';

const DISCORD_COLORS: Record<string, number> = {
  down: 15158332,
  recovered: 3066993,
  'database-down': 15105570,
  'database-recovered': 5763719,
};

function getEndpointTarget(endpoint: MonitorEndpoint): string {
  if (endpoint.type === 'api') return endpoint.url;
  if (endpoint.type === 'database') {
    return `${endpoint.host}:${endpoint.port}/${endpoint.serviceName}`;
  }
  return endpoint.host;
}

function getAlertLabel(alertType: AlertType): string {
  switch (alertType) {
    case 'down':
      return 'API DOWN';
    case 'recovered':
      return 'API RECOVERED';
    case 'database-down':
      return 'DATABASE DOWN';
    case 'database-recovered':
      return 'DATABASE RECOVERED';
  }
}

function getAlertEmoji(alertType: AlertType): string {
  if (alertType.includes('recovered')) return '✅';
  return '🚨';
}

export function buildGenericPayload(
  endpoint: MonitorEndpoint,
  healthCheck: ApiHealthCheck,
  alertType: AlertType
) {
  return {
    source: 'xentinel-api-monitor',
    event: alertType,
    timestamp: healthCheck.timestamp || new Date().toISOString(),
    endpoint: {
      id: endpoint.id,
      name: endpoint.name,
      type: endpoint.type,
      target: getEndpointTarget(endpoint),
    },
    healthCheck: {
      status: healthCheck.status,
      responseTime: healthCheck.responseTime,
      statusCode: healthCheck.statusCode,
      error: healthCheck.error,
      databaseConnected: healthCheck.databaseConnected,
      databaseError: healthCheck.databaseError,
    },
  };
}

function buildDiscordPayload(
  endpoint: MonitorEndpoint,
  healthCheck: ApiHealthCheck,
  alertType: AlertType
) {
  const isDown = !alertType.includes('recovered');
  const fields = [
    { name: 'Endpoint', value: endpoint.name, inline: true },
    { name: 'Type', value: endpoint.type.toUpperCase(), inline: true },
    { name: 'Status', value: getAlertLabel(alertType), inline: true },
    { name: 'Target', value: getEndpointTarget(endpoint) },
    {
      name: 'Response Time',
      value: `${healthCheck.responseTime ?? 'N/A'} ms`,
      inline: true,
    },
  ];

  if (healthCheck.statusCode) {
    fields.push({
      name: 'Status Code',
      value: String(healthCheck.statusCode),
      inline: true,
    });
  }

  if (healthCheck.error) {
    fields.push({ name: 'Error', value: healthCheck.error });
  }

  return {
    username: 'Xentinel API Monitor',
    embeds: [
      {
        title: `${getAlertEmoji(alertType)} ${getAlertLabel(alertType)}`,
        description: isDown
          ? 'Action required: please investigate this endpoint.'
          : 'The endpoint is responding normally again.',
        color: DISCORD_COLORS[alertType] ?? 9807270,
        fields,
        timestamp: healthCheck.timestamp || new Date().toISOString(),
        footer: { text: 'Xentinel API Monitor' },
      },
    ],
  };
}

function buildSlackPayload(
  endpoint: MonitorEndpoint,
  healthCheck: ApiHealthCheck,
  alertType: AlertType
) {
  const emoji = getAlertEmoji(alertType);
  const label = getAlertLabel(alertType);
  const lines = [
    `${emoji} *${label}: ${endpoint.name}*`,
    `Target: ${getEndpointTarget(endpoint)}`,
    `Response: ${healthCheck.responseTime ?? 'N/A'} ms`,
  ];
  if (healthCheck.error) lines.push(`Error: ${healthCheck.error}`);

  return { text: lines.join('\n') };
}

export function buildWebhookBody(
  webhookType: WebhookType,
  endpoint: MonitorEndpoint,
  healthCheck: ApiHealthCheck,
  alertType: AlertType
): object {
  switch (webhookType) {
    case 'discord':
      return buildDiscordPayload(endpoint, healthCheck, alertType);
    case 'slack':
      return buildSlackPayload(endpoint, healthCheck, alertType);
    default:
      return buildGenericPayload(endpoint, healthCheck, alertType);
  }
}

function shouldNotifyWebhook(
  webhook: WebhookConfig,
  endpointId: string,
  alertType: AlertType
): boolean {
  if (!webhook.enabled) return false;
  if (!webhook.events.includes(alertType)) return false;
  if (webhook.endpointIds.length > 0 && !webhook.endpointIds.includes(endpointId)) {
    return false;
  }
  return true;
}

export async function sendWebhook(
  webhook: WebhookConfig,
  endpoint: MonitorEndpoint,
  healthCheck: ApiHealthCheck,
  alertType: AlertType
): Promise<void> {
  const body = buildWebhookBody(webhook.type, endpoint, healthCheck, alertType);

  const response = await fetch(webhook.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status}${text ? `: ${text.slice(0, 200)}` : ''}`);
  }
}

export async function sendWebhookAlerts(
  endpoint: MonitorEndpoint,
  healthCheck: ApiHealthCheck,
  alertType: AlertType,
  webhooks?: WebhookConfig[]
): Promise<{ sent: number; failed: number }> {
  const targets = (webhooks ?? getEnabledWebhooks()).filter((w) =>
    shouldNotifyWebhook(w, endpoint.id, alertType)
  );

  if (targets.length === 0) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;

  await Promise.all(
    targets.map(async (webhook) => {
      try {
        await sendWebhook(webhook, endpoint, healthCheck, alertType);
        console.log(`Webhook alert sent: ${webhook.name} (${alertType})`);
        sent++;
      } catch (error) {
        failed++;
        console.error(
          `Failed to send webhook ${webhook.name}:`,
          error instanceof Error ? error.message : error
        );
      }
    })
  );

  return { sent, failed };
}

export async function sendTestWebhook(
  webhook: WebhookConfig
): Promise<void> {
  const mockEndpoint: MonitorEndpoint = {
    id: 'TEST',
    type: 'api',
    name: 'Test Endpoint (Xentinel)',
    url: 'https://example.com/health',
    method: 'GET',
    interval: 30,
    timeout: 5000,
    enabled: true,
  };

  const mockHealthCheck: ApiHealthCheck = {
    endpointId: 'TEST',
    status: 'down',
    responseTime: 5000,
    statusCode: 0,
    timestamp: new Date().toISOString(),
    error: 'Test notification from Xentinel API Monitor',
  };

  await sendWebhook(webhook, mockEndpoint, mockHealthCheck, 'down');
}
