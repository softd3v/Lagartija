const https = require('https');
const http = require('http');
const { URL } = require('url');

const DISCORD_COLORS = {
  down: 15158332,
  recovered: 3066993,
  'database-down': 15105570,
  'database-recovered': 5763719,
};

function getEndpointTarget(endpoint) {
  if (endpoint.type === 'api') return endpoint.url;
  if (endpoint.type === 'database') {
    return `${endpoint.host}:${endpoint.port}/${endpoint.serviceName}`;
  }
  return endpoint.host;
}

function getAlertLabel(alertType) {
  switch (alertType) {
    case 'down':
      return 'API DOWN';
    case 'recovered':
      return 'API RECOVERED';
    case 'database-down':
      return 'DATABASE DOWN';
    case 'database-recovered':
      return 'DATABASE RECOVERED';
    default:
      return String(alertType).toUpperCase();
  }
}

function getAlertEmoji(alertType) {
  return String(alertType).includes('recovered') ? '✅' : '🚨';
}

function buildGenericPayload(endpoint, healthCheck, alertType) {
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

function buildDiscordPayload(endpoint, healthCheck, alertType) {
  const isDown = !String(alertType).includes('recovered');
  const fields = [
    { name: 'Endpoint', value: endpoint.name, inline: true },
    { name: 'Type', value: String(endpoint.type).toUpperCase(), inline: true },
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
        color: DISCORD_COLORS[alertType] || 9807270,
        fields,
        timestamp: healthCheck.timestamp || new Date().toISOString(),
        footer: { text: 'Xentinel API Monitor' },
      },
    ],
  };
}

function buildSlackPayload(endpoint, healthCheck, alertType) {
  const lines = [
    `${getAlertEmoji(alertType)} *${getAlertLabel(alertType)}: ${endpoint.name}*`,
    `Target: ${getEndpointTarget(endpoint)}`,
    `Response: ${healthCheck.responseTime ?? 'N/A'} ms`,
  ];
  if (healthCheck.error) lines.push(`Error: ${healthCheck.error}`);
  return { text: lines.join('\n') };
}

function buildWebhookBody(webhookType, endpoint, healthCheck, alertType) {
  switch (webhookType) {
    case 'discord':
      return buildDiscordPayload(endpoint, healthCheck, alertType);
    case 'slack':
      return buildSlackPayload(endpoint, healthCheck, alertType);
    default:
      return buildGenericPayload(endpoint, healthCheck, alertType);
  }
}

function postJson(targetUrl, body, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const url = new URL(targetUrl);
    const payload = JSON.stringify(body);
    const protocol = url.protocol === 'https:' ? https : http;

    const req = protocol.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
        timeout: timeoutMs,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ statusCode: res.statusCode, body: data });
            return;
          }
          reject(new Error(`HTTP ${res.statusCode}${data ? `: ${data.slice(0, 200)}` : ''}`));
        });
      }
    );

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Webhook request timeout'));
    });

    req.write(payload);
    req.end();
  });
}

function shouldNotifyWebhook(webhook, endpointId, alertType) {
  if (!webhook.enabled) return false;
  if (!webhook.events.includes(alertType)) return false;
  if (webhook.endpointIds.length > 0 && !webhook.endpointIds.includes(endpointId)) {
    return false;
  }
  return true;
}

async function sendWebhook(webhook, endpoint, healthCheck, alertType) {
  const body = buildWebhookBody(webhook.type, endpoint, healthCheck, alertType);
  await postJson(webhook.url, body);
}

async function sendWebhookAlerts(endpoint, healthCheck, alertType, webhooks, logFn) {
  const targets = (webhooks || []).filter((webhook) =>
    shouldNotifyWebhook(webhook, endpoint.id, alertType)
  );

  if (targets.length === 0) {
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  await Promise.all(
    targets.map(async (webhook) => {
      try {
        await sendWebhook(webhook, endpoint, healthCheck, alertType);
        if (logFn) logFn(`Webhook alert sent: ${webhook.name} (${alertType})`, 'INFO');
        sent += 1;
      } catch (error) {
        failed += 1;
        if (logFn) {
          logFn(`Failed to send webhook ${webhook.name}: ${error.message}`, 'ERROR');
        }
      }
    })
  );

  return { sent, failed };
}

module.exports = {
  sendWebhookAlerts,
  sendWebhook,
  buildWebhookBody,
};
