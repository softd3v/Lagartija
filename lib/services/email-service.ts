import nodemailer from 'nodemailer';
import type { ApiEndpoint, ApiHealthCheck } from '@/types';

interface EmailConfig {
  to: string[];
  subject: string;
  html: string;
}

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
};

// Format JSON for email display
const formatJSON = (data: any): string => {
  if (!data) return '<p class="text-gray-500">No response data</p>';
  
  const jsonString = typeof data === 'string' 
    ? data 
    : JSON.stringify(data, null, 2);
  
  return `<pre style="background: #1e293b; color: #10b981; padding: 16px; border-radius: 8px; overflow-x: auto; font-family: 'Courier New', monospace; font-size: 13px;">${jsonString}</pre>`;
};

// Generate professional HTML email template
const generateAlertEmail = (
  endpoint: ApiEndpoint,
  healthCheck: ApiHealthCheck,
  alertType: 'down' | 'recovered'
): string => {
  const isDown = alertType === 'down';
  const statusColor = isDown ? '#ef4444' : '#10b981';
  const statusText = isDown ? 'DOWN ⚠️' : 'RECOVERED ✅';
  const statusBg = isDown ? '#fee2e2' : '#d1fae5';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 32px; border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                🦎 Lagartija API Monitor
              </h1>
              <p style="margin: 8px 0 0 0; color: #e0e7ff; font-size: 14px;">
                API Status Alert
              </p>
            </td>
          </tr>

          <!-- Status Badge -->
          <tr>
            <td style="padding: 32px;">
              <div style="background-color: ${statusBg}; border-left: 4px solid ${statusColor}; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
                <h2 style="margin: 0 0 8px 0; color: ${statusColor}; font-size: 24px; font-weight: 700;">
                  ${statusText}
                </h2>
                <p style="margin: 0; color: #64748b; font-size: 14px;">
                  ${new Date(healthCheck.timestamp).toLocaleString('en-US', { 
                    dateStyle: 'full', 
                    timeStyle: 'long' 
                  })}
                </p>
              </div>

              <!-- API Details -->
              <table width="100%" cellpadding="12" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 24px;">
                <tr style="background-color: #f8fafc;">
                  <td style="font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0;">API Name</td>
                  <td style="color: #1e293b; border-bottom: 1px solid #e2e8f0;">${endpoint.name}</td>
                </tr>
                <tr>
                  <td style="font-weight: 600; color: #475569; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">Endpoint</td>
                  <td style="color: #1e293b; font-family: monospace; font-size: 13px; border-bottom: 1px solid #e2e8f0;">${endpoint.url}</td>
                </tr>
                <tr style="background-color: #f8fafc;">
                  <td style="font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0;">Method</td>
                  <td style="color: #1e293b; border-bottom: 1px solid #e2e8f0;">${endpoint.method}</td>
                </tr>
                <tr>
                  <td style="font-weight: 600; color: #475569; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">Response Time</td>
                  <td style="color: #1e293b; border-bottom: 1px solid #e2e8f0;">${healthCheck.responseTime}ms</td>
                </tr>
                <tr style="background-color: #f8fafc;">
                  <td style="font-weight: 600; color: #475569;">Status Code</td>
                  <td style="color: #1e293b;">${healthCheck.statusCode || 'N/A'}</td>
                </tr>
              </table>

              ${healthCheck.error ? `
                <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
                  <h3 style="margin: 0 0 8px 0; color: #dc2626; font-size: 16px; font-weight: 600;">Error Details</h3>
                  <p style="margin: 0; color: #991b1b; font-size: 14px; font-family: monospace;">${healthCheck.error}</p>
                </div>
              ` : ''}

              ${healthCheck.responseData ? `
                <div style="margin-bottom: 24px;">
                  <h3 style="margin: 0 0 12px 0; color: #1e293b; font-size: 18px; font-weight: 600;">Response Data</h3>
                  ${formatJSON(healthCheck.responseData)}
                </div>
              ` : ''}

              ${endpoint.tags && endpoint.tags.length > 0 ? `
                <div style="margin-top: 24px;">
                  <p style="margin: 0 0 8px 0; color: #64748b; font-size: 13px; font-weight: 600;">Tags:</p>
                  <div>
                    ${endpoint.tags.map(tag => 
                      `<span style="display: inline-block; background-color: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 12px; font-size: 12px; margin-right: 8px;">${tag}</span>`
                    ).join('')}
                  </div>
                </div>
              ` : ''}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0; color: #64748b; font-size: 13px;">
                This is an automated alert from Lagartija API Monitor
              </p>
              <p style="margin: 8px 0 0 0; color: #94a3b8; font-size: 12px;">
                Dashboard: <a href="http://localhost:3000/dashboard" style="color: #3b82f6; text-decoration: none;">View Dashboard</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

// Send alert email
export async function sendAlertEmail(
  endpoint: ApiEndpoint,
  healthCheck: ApiHealthCheck,
  alertType: 'down' | 'recovered'
): Promise<void> {
  const recipients = process.env.ALERT_TO_EMAILS?.split(',') || [];
  
  if (recipients.length === 0) {
    console.warn('No alert recipients configured');
    return;
  }

  const transporter = createTransporter();
  const subject = `🚨 API ${alertType === 'down' ? 'DOWN' : 'RECOVERED'}: ${endpoint.name}`;
  const html = generateAlertEmail(endpoint, healthCheck, alertType);

  try {
    await transporter.sendMail({
      from: `"${process.env.ALERT_FROM_NAME}" <${process.env.ALERT_FROM_EMAIL}>`,
      to: recipients.join(', '),
      subject,
      html,
    });
    
    console.log(`Alert email sent for ${endpoint.name} (${alertType})`);
  } catch (error) {
    console.error('Failed to send alert email:', error);
    throw error;
  }
}

// Send test email
export async function sendTestEmail(): Promise<void> {
  const recipients = process.env.ALERT_TO_EMAILS?.split(',') || [];
  
  const transporter = createTransporter();
  
  await transporter.sendMail({
    from: `"${process.env.ALERT_FROM_NAME}" <${process.env.ALERT_FROM_EMAIL}>`,
    to: recipients.join(', '),
    subject: '✅ Lagartija API Monitor - Test Email',
    html: `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 40px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; padding: 32px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <h1 style="color: #3b82f6; margin: 0 0 16px 0;">🦎 Lagartija API Monitor</h1>
    <h2 style="color: #10b981; margin: 0 0 16px 0;">✅ Email Configuration Test</h2>
    <p style="color: #475569; font-size: 16px;">
      This is a test email to verify your Mailgun SMTP configuration is working correctly.
    </p>
    <div style="background: #dbeafe; padding: 16px; border-radius: 8px; margin: 24px 0;">
      <p style="margin: 0; color: #1e40af; font-weight: 600;">Configuration Details:</p>
      <ul style="color: #1e40af; margin: 8px 0;">
        <li>SMTP Host: ${process.env.SMTP_HOST}</li>
        <li>From: ${process.env.ALERT_FROM_EMAIL}</li>
        <li>Recipients: ${recipients.join(', ')}</li>
        <li>Timestamp: ${new Date().toLocaleString()}</li>
      </ul>
    </div>
    <p style="color: #64748b; font-size: 14px; margin-top: 24px;">
      If you received this email, your alert system is ready to monitor your APIs! 🚀
    </p>
  </div>
</body>
</html>
    `,
  });
}
