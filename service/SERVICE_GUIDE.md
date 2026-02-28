# Xentinel Windows Service Guide

## Overview

The Xentinel Windows Service allows you to run **API and Database monitoring 24/7 without a browser**, completely independent of the Next.js dashboard. The service runs in the background and automatically sends email alerts when APIs go down or recover, and when database connections fail or are restored.

---

## Features

✅ **24/7 Monitoring** - Runs continuously in the background  
✅ **Multi-Type Support** - Monitors REST APIs and Oracle Databases  
✅ **No Browser Required** - Independent standalone service  
✅ **Auto-Start** - Starts automatically with Windows  
✅ **Auto-Restart** - Restarts automatically if it crashes  
✅ **Email Alerts** - Same alert system as the dashboard  
✅ **Logging** - All events logged to `service/logs/`  
✅ **No Cooldown on DOWN** - Always alerts when API/DB goes down  
✅ **Cooldown on RECOVERED** - Prevents spam (5 min)  

---

## Installation Steps

### 1. Install the Service (Administrator Required)

Open PowerShell **as Administrator** and run:

```powershell
cd H:\DEV\Lagartija
npm run service:install
```

Or manually:

```powershell
node service/install-service.js
```

**Expected Output:**
```
Installing Xentinel API Monitor as Windows Service...
✅ Service installed successfully!
✅ Service started successfully!
```

### 2. Verify Service is Running

Open **Services** (press `Win + R`, type `services.msc`):

- Look for **"Xentinel API Monitor"**
- Status should be **"Running"**
- Startup Type should be **"Automatic"**

Alternatively, use PowerShell:

```powershell
sc query "Xentinel API Monitor"
```

---

## Managing the Service

### Start the Service

```powershell
sc start "Xentinel API Monitor"
```

Or through Services Manager (services.msc):
1. Find "Xentinel API Monitor"
2. Right-click → Start

### Stop the Service

```powershell
sc stop "Xentinel API Monitor"
```

Or through Services Manager:
1. Find "Xentinel API Monitor"
2. Right-click → Stop

### Restart the Service

```powershell
sc stop "Xentinel API Monitor"
sc start "Xentinel API Monitor"
```

Or through Services Manager:
1. Find "Xentinel API Monitor"
2. Right-click → Restart

### Check Service Status

```powershell
sc query "Xentinel API Monitor"
```

---

## Uninstallation

### Option 1: Using npm script

Open PowerShell **as Administrator**:

```powershell
cd H:\DEV\Lagartija
npm run service:uninstall
```

### Option 2: Manual

```powershell
node service/uninstall-service.js
```

**Expected Output:**
```
Uninstalling Xentinel API Monitor Windows Service...
✅ Service uninstalled successfully!
```

---

## Testing the Service (Without Installing)

To test the monitoring script without installing as a service:

```powershell
npm run service:test
```

Or:

```powershell
node service/monitor-service.js
```

Press `Ctrl + C` to stop.

**This is useful for**:
- Testing configuration changes
- Debugging email alerts
- Verifying API endpoints
- Checking logs output

---

## Configuration

### Monitored Endpoints

Edit `service/monitor-service.js` and modify the `MONITOR_ENDPOINTS` array:

```javascript
const MONITOR_ENDPOINTS = [
  // API Endpoint Example
  {
    id: "CCTAPIEA",
    type: "api",
    name: "CCT API CAMCO EA",
    url: "http://172.20.10.112:5000/health/detailed",
    method: "GET",
    interval: 30000, // 30 seconds
    timeout: 5000,
    enabled: true,
  },
  // Oracle Database Example
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
```

**After changes, restart the service:**

```powershell
sc stop "Xentinel API Monitor"
sc start "Xentinel API Monitor"
```

### Oracle Database Credentials

Oracle credentials are stored in `.env.local`:

```env
# Oracle Database Credentials
DB_ORACLE_CCTPROD_USER=SYSTEM
DB_ORACLE_CCTPROD_PASSWORD=Manager1
```

**Format:** `DB_<ENDPOINT_ID>_USER` and `DB_<ENDPOINT_ID>_PASSWORD`

### Email Settings

The service reads from `.env.local` automatically. No changes needed if already configured for the dashboard.

**Environment Variables Used:**
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`
- `ALERT_FROM_EMAIL`, `ALERT_FROM_NAME`
- `ALERT_TO_EMAILS` (comma-separated list)
- `ALERT_COOLDOWN_MINUTES`
- `NEXT_PUBLIC_CCT_API_URL`

### Monitoring Intervals

Change the `interval` property in `API_ENDPOINTS` (in milliseconds):

- `10000` = 10 seconds
- `30000` = 30 seconds (default)
- `60000` = 1 minute
- `300000` = 5 minutes

---

## Logs

### Location

Logs are saved to: **`service/logs/`**

### Log Files

- **Filename Format**: `monitor-YYYY-MM-DD.log`
- **Example**: `monitor-2026-01-21.log`
- **Rotation**: New file created each day automatically

### Log Levels

- `[INFO]` - Normal operations
- `[ALERT]` - API status changes (DOWN/RECOVERED)
- `[ERROR]` - Errors (email failures, network issues)
- `[DEBUG]` - Detailed monitoring checks

### Viewing Logs

**Latest log file:**

```powershell
Get-Content service/logs/monitor-$(Get-Date -Format "yyyy-MM-dd").log -Wait
```

**Last 50 lines:**

```powershell
Get-Content service/logs/monitor-$(Get-Date -Format "yyyy-MM-dd").log -Tail 50
```

**Search for errors:**

```powershell
Select-String -Path "service/logs/*.log" -Pattern "ERROR"
```

---

## Troubleshooting

### Service won't install

**Error**: "Access Denied" or "Permission Error"

**Solution**: Run PowerShell **as Administrator**

---

### Service installed but not running

**Check Event Viewer:**

1. Press `Win + R`, type `eventvwr.msc`
2. Go to **Windows Logs → Application**
3. Look for errors from "Xentinel API Monitor"

**Common Issues:**
- Missing `.env.local` file
- Invalid SMTP credentials
- Node.js not in PATH

---

### Emails not sending

**Check:**

1. Service is running: `sc query "Xentinel API Monitor"`
2. Logs for errors: `Get-Content service/logs/*.log`
3. SMTP credentials in `.env.local`
4. API endpoints are actually failing

**Test email manually:**

```powershell
npm run service:test
```

Then manually stop the API you're monitoring to trigger an alert.

---

### Service crashes repeatedly

**Check logs** for error messages:

```powershell
Get-Content service/logs/monitor-$(Get-Date -Format "yyyy-MM-dd").log
```

**Common causes:**
- Invalid API URLs
- Network connectivity issues
- Corrupted `.env.local` file

---

### How to change alert recipients

1. Edit `.env.local`:
   ```env
   ALERT_TO_EMAILS=email1@domain.com,email2@domain.com,email3@domain.com
   ```

2. Restart the service:
   ```powershell
   sc stop "Xentinel API Monitor"
   sc start "Xentinel API Monitor"
   ```

---

## Dashboard vs Service

### When to use the Dashboard

- Manual health checks
- Visual monitoring
- Real-time response data
- Testing new endpoints
- Viewing JSON responses

### When to use the Service

- 24/7 monitoring
- Production environments
- Server installations
- No browser access
- Background monitoring

### Can I use both?

**Yes!** They are completely independent:

- **Dashboard**: Runs when browser is open (localhost:3000)
- **Service**: Runs 24/7 in background

They use the **same alert system**, so cooldowns are shared. If the service sends a DOWN alert, the dashboard won't spam another one within 5 minutes.

---

## Advanced Configuration

### Change Service Startup Type

**Automatic (Delayed Start):**

```powershell
sc config "Xentinel API Monitor" start= delayed-auto
```

**Manual Start:**

```powershell
sc config "Xentinel API Monitor" start= demand
```

**Automatic Start:**

```powershell
sc config "Xentinel API Monitor" start= auto
```

### View Service Configuration

```powershell
sc qc "Xentinel API Monitor"
```

### Service Recovery Options

Set the service to restart automatically on failure:

1. Open `services.msc`
2. Find "Xentinel API Monitor"
3. Right-click → Properties
4. Go to **Recovery** tab
5. Set:
   - First failure: **Restart the Service**
   - Second failure: **Restart the Service**
   - Subsequent failures: **Restart the Service**
   - Restart service after: **1 minute**

---

## Performance

### Resource Usage

- **CPU**: < 1% (idle)
- **Memory**: ~50-100 MB
- **Network**: Minimal (only during health checks)
- **Disk**: Log files grow ~1-5 MB per day

### Monitoring Multiple APIs

The service can monitor dozens of APIs simultaneously. Each API runs on its own interval independently.

---

## Security Notes

1. **SMTP Password**: Stored in `.env.local` (not committed to git)
2. **Administrator Rights**: Only required for install/uninstall
3. **Service Runs As**: Local System account by default
4. **Logs**: May contain sensitive data (review before sharing)

---

## Quick Command Reference

| Action | Command |
|--------|---------|
| Install Service | `npm run service:install` |
| Uninstall Service | `npm run service:uninstall` |
| Test Service | `npm run service:test` |
| Start Service | `sc start "Xentinel API Monitor"` |
| Stop Service | `sc stop "Xentinel API Monitor"` |
| Check Status | `sc query "Xentinel API Monitor"` |
| View Logs | `Get-Content service/logs/*.log -Tail 50` |
| Watch Logs Live | `Get-Content service/logs/*.log -Wait` |

---

## Support

For issues or questions:

1. Check logs in `service/logs/`
2. Review this documentation
3. Test with `npm run service:test`
4. Verify `.env.local` configuration

---

**Last Updated**: January 21, 2026  
**Version**: 1.0.0
