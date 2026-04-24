/**
 * Xentinel Monitoring Service
 * 
 * Standalone Node.js service for 24/7 API monitoring without browser dependency.
 * Runs as a Windows Service and sends email alerts on API failures.
 */

const https = require('https');
const http = require('http');
const nodemailer = require('nodemailer');
const oracledb = require('oracledb');
const fs = require('fs');
const path = require('path');

// Configure oracledb
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.autoCommit = true;

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envConfig = {};

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    // Skip empty lines and comments
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    
    // Match KEY=VALUE (value can contain =, #, etc.)
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      
      // Remove inline comments (only if # is preceded by space)
      const commentIndex = value.indexOf(' #');
      if (commentIndex > 0) {
        value = value.substring(0, commentIndex).trim();
      }
      
      envConfig[key] = value;
    }
  });
  console.log(`[INIT] Loaded ${Object.keys(envConfig).length} environment variables from .env.local`);
} else {
  console.error(`[ERROR] .env.local not found at: ${envPath}`);
}

// Configuration
const CONFIG = {
  SMTP_HOST: envConfig.SMTP_HOST || 'smtp.mailgun.org',
  SMTP_PORT: parseInt(envConfig.SMTP_PORT) || 587,
  SMTP_SECURE: envConfig.SMTP_SECURE === 'true',
  SMTP_USER: envConfig.SMTP_USER,
  SMTP_PASSWORD: envConfig.SMTP_PASSWORD,
  ALERT_FROM_EMAIL: envConfig.ALERT_FROM_EMAIL,
  ALERT_FROM_NAME: envConfig.ALERT_FROM_NAME || 'Xentinel API Monitor',
  ALERT_TO_EMAILS: envConfig.ALERT_TO_EMAILS ? envConfig.ALERT_TO_EMAILS.split(',') : [],
  ALERT_COOLDOWN_MINUTES: parseInt(envConfig.ALERT_COOLDOWN_MINUTES) || 5,
  CCT_API_URL: envConfig.NEXT_PUBLIC_CCT_API_URL,
};

// Validate critical configuration
if (!CONFIG.SMTP_USER || !CONFIG.SMTP_PASSWORD) {
  console.error('[ERROR] SMTP credentials missing! Check .env.local file.');
  console.error(`  SMTP_USER: ${CONFIG.SMTP_USER ? 'OK' : 'MISSING'}`);
  console.error(`  SMTP_PASSWORD: ${CONFIG.SMTP_PASSWORD ? 'OK' : 'MISSING'}`);
}
if (CONFIG.ALERT_TO_EMAILS.length === 0) {
  console.error('[ERROR] ALERT_TO_EMAILS is empty! Check .env.local file.');
}

// Endpoints to monitor (APIs and Databases)
const MONITOR_ENDPOINTS = [
  {
    id: "CCTAPIEA",
    type: "api",
    name: "CCT API CAMCO EA",
    url: CONFIG.CCT_API_URL || "http://172.20.10.112:5000/health/detailed",
    method: "GET",
    interval: 30000, // 30 seconds in milliseconds
    timeout: 5000,
    enabled: true,
  },
  {
    id: "SOLDMDT-API",
    type: "api",
    name: "API Producction for SOL DMDT",
    url: "http://172.20.10.114:5000/health",
    method: "GET",
    interval: 30000,
    timeout: 5000,
    enabled: true,
  },
  {
    id: "CCTAPI-PA",
    type: "api",
    name: "CCT API CAMCO PA",
    url: "http://172.20.10.117:5000/health/detailed",
    method: "GET",
    interval: 30000,
    timeout: 5000,
    enabled: true,
  },
  {
    id: "BRIDGECAMCO-TEST",
    type: "api",
    name: "Bridge Camco Test Environment",
    url: "http://172.100.5.13",
    method: "GET",
    interval: 30000,
    timeout: 5000,
    enabled: true,
  },
  {
    id: "CCTSUITE-WEB",
    type: "api",
    name: "MUI WEB",
    url: "http://172.20.10.11:8080/ords/wscct/r/cct-suite/login?",
    method: "GET",
    interval: 30000,
    timeout: 5000,
    enabled: true,
  },
  {
    id: "INFOS-AUTOSERVICIO",
    type: "api",
    name: "INFOS-AUTOSERVICIO",
    url: "http://172.20.10.11:8080/infos/f?p=103:101:18766474252733:::::",
    method: "GET",
    interval: 30000,
    timeout: 5000,
    enabled: true,
  },
  {
    id: "ORACLE_CCTPROD",
    type: "database",
    name: "Oracle CCTPROD Database",
    host: "172.20.10.10",
    port: 1521,
    serviceName: "CCTPROD",
    username: envConfig.DB_ORACLE_CCTPROD_USER,
    password: envConfig.DB_ORACLE_CCTPROD_PASSWORD,
    interval: 60000, // 60 seconds
    timeout: 10000,
    enabled: true,
  },
];

// Alert State Management
const alertStates = new Map();

// Email transporter
const transporter = nodemailer.createTransport({
  host: CONFIG.SMTP_HOST,
  port: CONFIG.SMTP_PORT,
  secure: CONFIG.SMTP_SECURE,
  auth: CONFIG.SMTP_USER && CONFIG.SMTP_PASSWORD ? {
    user: CONFIG.SMTP_USER,
    pass: CONFIG.SMTP_PASSWORD,
  } : undefined,
  tls: {
    rejectUnauthorized: false
  }
});

// Logging utility
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  console.log(logMessage);
  
  const logFile = path.join(logDir, `monitor-${new Date().toISOString().split('T')[0]}.log`);
  fs.appendFileSync(logFile, logMessage + '\n');
}

// Oracle Database health check
async function checkOracleHealth(endpoint) {
  const startTime = Date.now();
  let connection;
  
  try {
    // Validate credentials
    if (!endpoint.username || !endpoint.password) {
      throw new Error(`Missing credentials for ${endpoint.name}`);
    }
    
    const connectionConfig = {
      user: endpoint.username,
      password: endpoint.password,
      connectString: `${endpoint.host}:${endpoint.port}/${endpoint.serviceName}`,
      connectionTimeout: endpoint.timeout / 1000,
    };
    
    connection = await oracledb.getConnection(connectionConfig);
    const result = await connection.execute('SELECT 1 FROM DUAL');
    await connection.close();
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'up',
      statusCode: 200,
      responseTime,
      responseData: {
        database: {
          connected: true,
          type: 'oracle',
          host: endpoint.host,
          serviceName: endpoint.serviceName,
        },
        query: result.rows,
      },
      databaseConnected: true,
    };
  } catch (error) {
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        log(`Error closing Oracle connection: ${closeError.message}`, 'ERROR');
      }
    }
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'down',
      responseTime,
      error: error.message,
      databaseConnected: false,
      databaseError: error.message,
    };
  }
}

// HTTP/HTTPS request wrapper with timeout
function makeRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint.url);
    const protocol = url.protocol === 'https:' ? https : http;
    
    const startTime = Date.now();
    
    const req = protocol.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: endpoint.method,
        timeout: endpoint.timeout,
      },
      (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          const responseTime = Date.now() - startTime;
          
          try {
            const jsonData = JSON.parse(data);
            resolve({
              status: res.statusCode >= 200 && res.statusCode < 300 ? 'up' : 'down',
              statusCode: res.statusCode,
              responseTime,
              responseData: jsonData,
              databaseConnected: jsonData.database?.connected,
              databaseError: jsonData.database?.error,
            });
          } catch (error) {
            resolve({
              status: 'down',
              statusCode: res.statusCode,
              responseTime,
              error: 'Invalid JSON response',
            });
          }
        });
      }
    );
    
    req.on('error', (error) => {
      reject({
        status: 'down',
        error: error.message,
        responseTime: Date.now() - startTime,
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject({
        status: 'down',
        error: 'Request timeout',
        responseTime: endpoint.timeout,
      });
    });
    
    req.end();
  });
}

// Generate database alert email HTML
function generateDatabaseAlertEmail(endpoint, healthCheck, alertType) {
  const statusColor = alertType === 'down' ? '#dc2626' : '#16a34a';
  const statusText = alertType === 'down' ? 'DOWN' : 'RECOVERED';
  const statusEmoji = alertType === 'down' ? '🚨' : '✅';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${statusColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
        .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .info-table td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
        .info-table td:first-child { font-weight: bold; width: 40%; }
        .footer { margin-top: 20px; text-align: center; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${statusEmoji} DATABASE ${statusText}</h1>
        </div>
        <div class="content">
          <h2>${endpoint.name}</h2>
          <table class="info-table">
            <tr><td>Status</td><td><strong>${statusText}</strong></td></tr>
            <tr><td>Host</td><td>${endpoint.host}:${endpoint.port}</td></tr>
            <tr><td>Service Name</td><td>${endpoint.serviceName}</td></tr>
            <tr><td>Time</td><td>${new Date().toLocaleString()}</td></tr>
            <tr><td>Connection Time</td><td>${healthCheck.responseTime || 'N/A'} ms</td></tr>
            ${healthCheck.error ? `<tr><td>Error</td><td style="color: #dc2626;">${healthCheck.error}</td></tr>` : ''}
          </table>
          ${alertType === 'down' ? '<p><strong>Action Required:</strong> Please investigate this database connection immediately.</p>' : '<p><strong>Good News:</strong> The database is now accessible.</p>'}
        </div>
        <div class="footer">
          <p>Xentinel Monitor - Automated Alert System</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Generate alert email HTML
function generateAlertEmail(endpoint, healthCheck, alertType) {
  const statusColor = alertType === 'down' ? '#dc2626' : '#16a34a';
  const statusText = alertType === 'down' ? 'DOWN' : 'RECOVERED';
  const statusEmoji = alertType === 'down' ? '🚨' : '✅';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${statusColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
        .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .info-table td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
        .info-table td:first-child { font-weight: bold; width: 40%; }
        .footer { margin-top: 20px; text-align: center; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${statusEmoji} API ${statusText}</h1>
        </div>
        <div class="content">
          <h2>${endpoint.name}</h2>
          <table class="info-table">
            <tr><td>Status</td><td><strong>${statusText}</strong></td></tr>
            <tr><td>Endpoint</td><td>${endpoint.url}</td></tr>
            <tr><td>Time</td><td>${new Date().toLocaleString()}</td></tr>
            <tr><td>Response Time</td><td>${healthCheck.responseTime || 'N/A'} ms</td></tr>
            ${healthCheck.statusCode ? `<tr><td>Status Code</td><td>${healthCheck.statusCode}</td></tr>` : ''}
            ${healthCheck.error ? `<tr><td>Error</td><td style="color: #dc2626;">${healthCheck.error}</td></tr>` : ''}
          </table>
          ${alertType === 'down' ? '<p><strong>Action Required:</strong> Please investigate this API endpoint immediately.</p>' : '<p><strong>Good News:</strong> The API is now responding normally.</p>'}
        </div>
        <div class="footer">
          <p>Xentinel API Monitor - Automated Alert System</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Send email alert
async function sendAlert(endpoint, healthCheck, alertType) {
  try {
    const isDatabase = endpoint.type === 'database';
    const label = isDatabase ? 'DATABASE' : 'API';
    
    const mailOptions = {
      from: `"${CONFIG.ALERT_FROM_NAME}" <${CONFIG.ALERT_FROM_EMAIL}>`,
      to: CONFIG.ALERT_TO_EMAILS.join(','),
      subject: `🚨 ${label} ${alertType === 'down' ? 'DOWN' : 'RECOVERED'}: ${endpoint.name}`,
      html: isDatabase 
        ? generateDatabaseAlertEmail(endpoint, healthCheck, alertType)
        : generateAlertEmail(endpoint, healthCheck, alertType),
    };
    
    await transporter.sendMail(mailOptions);
    log(`Alert email sent for ${endpoint.name} (${alertType})`, 'INFO');
    return true;
  } catch (error) {
    log(`Failed to send alert email: ${error.message}`, 'ERROR');
    return false;
  }
}

// Check and alert logic
async function checkAndAlert(endpoint, healthCheck) {
  const state = alertStates.get(endpoint.id) || {
    lastStatus: 'unknown',
    lastDatabaseConnected: undefined,
    lastDownAlertTime: 0,
    lastRecoveredAlertTime: 0,
    lastDbAlertTime: 0,
  };
  
  const currentStatus = healthCheck.status;
  const now = Date.now();
  const cooldownMs = CONFIG.ALERT_COOLDOWN_MINUTES * 60 * 1000;
  
  // Check API status changes
  const statusChanged = state.lastStatus !== currentStatus;
  
  if (statusChanged) {
    // API went DOWN - NO COOLDOWN (always alert immediately)
    if (currentStatus === 'down') {
      log(`🚨 Alert: ${endpoint.name} went DOWN`, 'ALERT');
      await sendAlert(endpoint, healthCheck, 'down');
      state.lastDownAlertTime = now;
    }
    
    // API RECOVERED - WITH COOLDOWN
    if (currentStatus === 'up' && state.lastStatus === 'down') {
      const recoveredCooldownPassed = now - state.lastRecoveredAlertTime > cooldownMs;
      if (recoveredCooldownPassed) {
        log(`✅ Alert: ${endpoint.name} recovered`, 'ALERT');
        await sendAlert(endpoint, healthCheck, 'recovered');
        state.lastRecoveredAlertTime = now;
      } else {
        const remainingMin = Math.ceil((cooldownMs - (now - state.lastRecoveredAlertTime)) / 60000);
        log(`⏳ RECOVERED alert skipped (cooldown active, ${remainingMin} min remaining)`, 'INFO');
      }
    }
  }
  
  // Update state
  state.lastStatus = currentStatus;
  alertStates.set(endpoint.id, state);
}

// Monitor single endpoint
async function monitorEndpoint(endpoint) {
  try {
    log(`Checking ${endpoint.name}...`, 'DEBUG');
    
    // Choose the appropriate health check based on endpoint type
    const healthCheck = endpoint.type === 'database'
      ? await checkOracleHealth(endpoint)
      : await makeRequest(endpoint);
    
    log(`${endpoint.name}: ${healthCheck.status.toUpperCase()} (${healthCheck.responseTime}ms)`, 'INFO');
    
    await checkAndAlert(endpoint, healthCheck);
  } catch (error) {
    log(`${endpoint.name}: ERROR - ${error.error || error.message}`, 'ERROR');
    await checkAndAlert(endpoint, error);
  }
}

// Start monitoring all endpoints
function startMonitoring() {
  log('=== Xentinel Monitoring Service Started ===', 'INFO');
  
  const enabledEndpoints = MONITOR_ENDPOINTS.filter(e => e.enabled);
  const apiCount = enabledEndpoints.filter(e => e.type === 'api').length;
  const dbCount = enabledEndpoints.filter(e => e.type === 'database').length;
  
  log(`Monitoring ${enabledEndpoints.length} endpoints (${apiCount} APIs, ${dbCount} Databases)`, 'INFO');
  log(`Alert cooldown: ${CONFIG.ALERT_COOLDOWN_MINUTES} minutes`, 'INFO');
  log(`Recipients: ${CONFIG.ALERT_TO_EMAILS.join(', ')}`, 'INFO');
  log(`SMTP: ${CONFIG.SMTP_USER} @ ${CONFIG.SMTP_HOST}:${CONFIG.SMTP_PORT}`, 'INFO');
  
  MONITOR_ENDPOINTS.forEach(endpoint => {
    if (endpoint.enabled) {
      log(`Scheduling ${endpoint.name} (every ${endpoint.interval / 1000}s)`, 'INFO');
      
      // Initial check
      monitorEndpoint(endpoint);
      
      // Schedule recurring checks
      setInterval(() => {
        monitorEndpoint(endpoint);
      }, endpoint.interval);
    }
  });
}

// Graceful shutdown
process.on('SIGINT', () => {
  log('=== Xentinel Monitoring Service Stopped ===', 'INFO');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('=== Xentinel Monitoring Service Stopped ===', 'INFO');
  process.exit(0);
});

// Start the service
startMonitoring();
