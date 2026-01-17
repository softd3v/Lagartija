# Xentinel - Technical Documentation

## 📖 Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Data Flow](#data-flow)
3. [Core Components](#core-components)
4. [Alert System](#alert-system)
5. [Adding New APIs](#adding-new-apis)
6. [Environment Variables](#environment-variables)
7. [File Structure](#file-structure)

---

## Architecture Overview

Xentinel is a real-time API monitoring dashboard built with **Next.js 16** using the **App Router** and **TypeScript**. It monitors RESTful APIs for availability and database connectivity, sending automated email alerts when issues are detected.

### Technology Stack
- **Framework**: Next.js 16.1 with Turbopack
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v3
- **State Management**: TanStack Query (React Query) 5.90
- **Email**: Nodemailer with Mailgun SMTP
- **Validation**: Zod
- **Icons**: Lucide React

### Key Features
- ✅ Manual and automatic API health monitoring
- 📧 Email alerts (DOWN/RECOVERED/DATABASE_DISCONNECTED/DATABASE_RECONNECTED)
- 🔄 Configurable polling intervals
- 🗄️ Database connection monitoring
- ⏱️ Response time tracking
- 🎨 Real-time dashboard updates
- 🛡️ Alert cooldown system (prevents spam)

---

## Data Flow

### 1. Manual Health Check Flow
```
User clicks "Check Now"
    ↓
ApiCard component (client)
    ↓
checkApiHealth() function
    ↓
Direct fetch() to API endpoint
    ↓
Display results in dashboard
    ↓
NO EMAIL ALERTS SENT
```

### 2. Automatic Monitoring Flow
```
User clicks "Start Monitoring"
    ↓
React Query starts polling (every X seconds)
    ↓
Fetch to /api/monitor/[id] (server-side)
    ↓
checkApiHealth() + Alert Manager
    ↓
Detect status changes (UP↔DOWN, DB connected↔disconnected)
    ↓
Send email alerts if status changed + cooldown passed
    ↓
Return health data to dashboard
    ↓
Update UI in real-time
```

### 3. Alert Trigger Logic
```
Current Status vs Last Status
    ↓
Status Changed? → YES
    ↓
Cooldown Passed? (5 min since last alert of same type) → YES
    ↓
Send Email via Mailgun SMTP
    ↓
Update lastAlertTime
    ↓
Continue monitoring
```

---

## Core Components

### 📂 Frontend Components

#### `app/dashboard/page.tsx`
- **Purpose**: Main dashboard page
- **State**: `autoPolling` (boolean) - Controls monitoring state
- **Key Logic**: 
  - Renders PollingControls component
  - Maps DEFAULT_APIS to ApiCard components
  - Passes autoPolling state to all cards

#### `components/dashboard/polling-controls.tsx`
- **Purpose**: Start/Stop monitoring button
- **Props**: `onTogglePolling`, `isPolling`
- **Key Logic**: 
  - Toggles autoPolling state
  - Displays monitoring status indicator

#### `components/dashboard/api-card.tsx`
- **Purpose**: Individual API monitoring card
- **Props**: `endpoint`, `autoPolling`
- **Key Features**:
  - **Manual Check**: useMutation for on-demand health checks
  - **Auto Polling**: useQuery with refetchInterval when autoPolling=true
  - **Data Display**: Status badge, response time, database status, JSON response
  - **Auto-polling route**: `/api/monitor/[id]` (triggers alerts)
  - **Manual route**: Direct `checkApiHealth()` call (no alerts)

#### `components/ui/status-badge.tsx`
- **Purpose**: Visual status indicator
- **Props**: `status` ("up" | "down" | "checking" | "unknown")
- **Styling**: Color-coded badges with icons

### 🔧 Backend Services

#### `lib/api-monitor/health-checker.ts`
**Function**: `checkApiHealth(endpoint: ApiEndpoint)`

**What it does**:
1. Starts performance timer
2. Makes fetch() request with timeout
3. Parses JSON response
4. **Extracts `database.connected`** from response if available
5. Returns ApiHealthCheck object with:
   - status (up/down)
   - responseTime (ms)
   - statusCode
   - responseData
   - databaseConnected (boolean)
   - databaseError (string)

**Response Structure Expected**:
```json
{
  "status": "healthy",
  "database": {
    "connected": true,
    "error": null
  }
}
```

#### `lib/services/alert-manager.ts`
**Class**: `AlertManager` (Singleton)

**Purpose**: Detects status changes and triggers email alerts

**State Tracking (per endpoint)**:
```typescript
{
  lastStatus: 'up' | 'down' | 'unknown',
  lastDatabaseConnected: boolean | undefined,
  lastDownAlertTime: number,
  lastRecoveredAlertTime: number,
  lastDbAlertTime: number
}
```

**Alert Types**:
1. **API DOWN**: When API changes from UP → DOWN
2. **API RECOVERED**: When API changes from DOWN → UP
3. **DATABASE DOWN**: When database.connected changes from true → false
4. **DATABASE RECOVERED**: When database.connected changes from false → true

**Cooldown Logic**:
- Each alert type has independent 5-minute cooldown
- Prevents spam if API flaps repeatedly
- Allows immediate notification of new issue type

#### `lib/services/email-service.ts`
**Functions**:
1. `generateAlertEmail()` - HTML template for API alerts
2. `generateDatabaseAlertEmail()` - HTML template for DB alerts
3. `sendAlertEmail()` - Sends email via Nodemailer + Mailgun

**Email Template Features**:
- Professional HTML design
- Responsive layout
- Status badges (color-coded)
- Full API details table
- JSON syntax highlighting
- Error messages
- Dashboard link

### 🌐 API Routes

#### `app/api/monitor/[id]/route.ts`
**Method**: GET

**Purpose**: Server-side monitoring endpoint (used by auto-polling)

**Flow**:
1. Receive endpoint ID
2. Find endpoint in DEFAULT_APIS
3. Call `checkApiHealth(endpoint)`
4. Call `alertManager.checkAndAlert()` - **TRIGGERS EMAILS**
5. Return health check data

**Critical**: This route enables email alerts. Manual checks bypass this.

#### `app/api/health/route.ts`
**Method**: GET

**Purpose**: Health check for Xentinel itself

**Returns**:
```json
{
  "status": "ok",
  "timestamp": "2026-01-17T...",
  "service": "Xentinel API Monitor"
}
```

---

## Alert System

### Alert State Machine

```
[UNKNOWN STATE]
    ↓ First check
[UP or DOWN]
    ↓ Status changes
[Cooldown Check]
    ↓ If cooldown passed
[Send Email Alert]
    ↓
[Update lastAlertTime]
    ↓
[Continue monitoring]
```

### Alert Types & Conditions

| Alert Type | Condition | Cooldown | Email Subject |
|------------|-----------|----------|---------------|
| API DOWN | status: 'up' → 'down' | lastDownAlertTime | 🚨 API DOWN: {name} |
| API RECOVERED | status: 'down' → 'up' | lastRecoveredAlertTime | 🚨 API RECOVERED: {name} |
| DB DISCONNECTED | database.connected: true → false | lastDbAlertTime | 🚨 DATABASE DISCONNECTED: {name} |
| DB RECONNECTED | database.connected: false → true | lastDbAlertTime | 🚨 DATABASE RECONNECTED: {name} |

### Cooldown System
- **Purpose**: Prevent email spam during API instability
- **Duration**: 5 minutes (configurable via ALERT_COOLDOWN_MINUTES)
- **Implementation**: Separate timestamps for each alert type
- **Example**:
  - API goes DOWN → Email sent immediately
  - API recovers after 30 seconds → Email sent immediately (different cooldown)
  - API goes DOWN again after 2 minutes → No email (within 5-min cooldown)

---

## Adding New APIs

### Method 1: Using Environment Variables (Recommended for Private IPs)

**Step 1**: Add environment variable in `.env.local`
```env
NEXT_PUBLIC_NEW_API_URL=http://192.168.1.50:3000/health
```

**Step 2**: Update `config/apis.config.ts`
```typescript
export const DEFAULT_APIS: ApiEndpoint[] = [
  {
    id: "NEWAPI",
    name: "My New API",
    url: process.env.NEXT_PUBLIC_NEW_API_URL || "",
    method: "GET",
    interval: 30,        // Polling interval in seconds
    timeout: 5000,       // Request timeout in milliseconds
    enabled: true,
    expectedStatus: 200,
    tags: ["Production", "Critical"],
  },
];
```

**Step 3**: Update `.env.example` (for repository)
```env
NEXT_PUBLIC_NEW_API_URL=http://localhost:3000/health
```

**Step 4**: Restart server
```bash
npm run dev
```

### Method 2: Direct URL (For Public APIs)

If the URL is not sensitive:

```typescript
{
  id: "GITHUB_API",
  name: "GitHub Status",
  url: "https://api.github.com/status",
  method: "GET",
  interval: 60,
  timeout: 5000,
  enabled: true,
}
```

### Configuration Options

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | ✅ | Unique identifier (used in routes) |
| name | string | ✅ | Display name in dashboard |
| url | string | ✅ | API endpoint URL |
| method | HttpMethod | ✅ | HTTP method (GET, POST, etc.) |
| interval | number | ✅ | Polling interval (seconds) |
| timeout | number | ✅ | Request timeout (milliseconds) |
| enabled | boolean | ✅ | Enable/disable monitoring |
| expectedStatus | number | ❌ | Expected HTTP status (default: 200) |
| tags | string[] | ❌ | Categorization tags |
| headers | Record<string,string> | ❌ | Custom HTTP headers |

---

## Environment Variables

### Required Variables

#### SMTP Configuration (Mailgun)
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@domain.com
SMTP_PASSWORD=your-mailgun-password
```

#### Email Settings
```env
ALERT_FROM_EMAIL=noreply@yourdomain.com
ALERT_FROM_NAME=Xentinel API Monitor
ALERT_TO_EMAILS=admin1@example.com,admin2@example.com
```

#### Alert Configuration
```env
ALERT_COOLDOWN_MINUTES=5
```

### Optional Variables (API Endpoints)
```env
NEXT_PUBLIC_CCT_API_URL=http://172.20.10.112:5000/health/detailed
NEXT_PUBLIC_API2_URL=http://localhost:8080/status
```

### Environment File Structure
- `.env.local` - Your local configuration (NEVER commit)
- `.env.example` - Template with placeholder values (commit to repo)
- `.gitignore` - Ensures .env*.local is never committed

---

## File Structure

```
h:\DEV\Lagartija\
├── .env.local                    # Local environment variables (GITIGNORED)
├── .env.example                  # Environment template for repository
├── .gitignore                    # Git ignore rules
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript config (strict mode)
├── tailwind.config.ts            # Tailwind CSS config
├── next.config.js                # Next.js config
│
├── app/
│   ├── layout.tsx                # Root layout with QueryProvider
│   ├── page.tsx                  # Redirects to /dashboard
│   ├── globals.css               # Global styles with Tailwind
│   │
│   ├── dashboard/
│   │   └── page.tsx              # Main dashboard page
│   │
│   └── api/
│       ├── health/
│       │   └── route.ts          # Xentinel health check
│       └── monitor/
│           └── [id]/
│               └── route.ts      # Server-side monitoring (triggers alerts)
│
├── components/
│   ├── dashboard/
│   │   ├── api-card.tsx          # Individual API monitor card
│   │   └── polling-controls.tsx  # Start/Stop monitoring button
│   └── ui/
│       └── status-badge.tsx      # Status indicator component
│
├── lib/
│   ├── api-monitor/
│   │   └── health-checker.ts     # Core health check logic
│   ├── services/
│   │   ├── alert-manager.ts      # Alert state tracking & triggers
│   │   └── email-service.ts      # Email template & sending
│   ├── providers/
│   │   └── query-provider.tsx    # React Query setup
│   ├── hooks/
│   │   └── use-api-health.ts     # Custom React Query hook
│   └── utils/
│       └── cn.ts                 # Tailwind className utility
│
├── types/
│   └── index.ts                  # TypeScript type definitions
│
└── config/
    └── apis.config.ts            # API endpoints configuration
```

---

## Key Design Decisions

### Why React Query for Polling?
- **Automatic refetching** with configurable intervals
- **Built-in error handling** and retry logic
- **Cache management** for better performance
- **Request deduplication** prevents unnecessary calls

### Why Server-Side Monitoring Route?
- **Persistent state**: Alert manager state survives client refreshes
- **Security**: SMTP credentials stay on server
- **Reliability**: Not dependent on browser being open (for future backend scheduler)

### Why Separate Cooldowns?
- **Flexibility**: DOWN and RECOVERED are independent events
- **Better UX**: Users get immediate notification of recovery
- **Prevents missed alerts**: Different issue types don't block each other

### Why Database Monitoring?
- **Real-world scenario**: API can be UP but DB disconnected (degraded state)
- **Critical alerts**: Database failures are often more severe than API timeouts
- **Separate tracking**: Independent from API status for accurate alerting

---

## Troubleshooting

### Emails Not Sending
1. Check SMTP credentials in `.env.local`
2. Verify `ALERT_TO_EMAILS` is set correctly
3. Check server logs for error messages
4. Ensure port 587 is not blocked by firewall
5. Test with Mailgun dashboard logs

### Monitoring Not Starting
1. Ensure "Start Monitoring" button was clicked
2. Check browser console for errors
3. Verify `/api/monitor/[id]` route is accessible
4. Restart Next.js server (`npm run dev`)

### No Alerts on Status Change
1. Verify alert manager cooldown hasn't blocked the alert
2. Check server terminal for "Alert: ..." log messages
3. Ensure status actually changed (not same as last check)
4. Restart server to reset alert manager state

### Database Status Not Showing
1. API response must include `database.connected` field
2. Check JSON structure matches expected format
3. Inspect `responseData` in dashboard to verify structure

---

## Development Workflow

### Adding a New Feature
1. Create new component/service in appropriate folder
2. Add TypeScript types in `types/index.ts`
3. Update relevant configuration if needed
4. Test locally before committing
5. Update this documentation

### Making Changes to Alert Logic
1. Modify `lib/services/alert-manager.ts`
2. **Always restart server** (singleton instance)
3. Test with manual status changes
4. Verify email content and cooldown behavior

### Deploying to Production
1. Set up environment variables on hosting platform
2. Configure production SMTP settings
3. Update API URLs to production endpoints
4. Enable production-level monitoring intervals
5. Test email delivery in production environment

---

## Future Enhancements

### Planned Features (Not Yet Implemented)
- ⏱️ Historical data storage (Prisma + SQLite/PostgreSQL)
- 📊 Charts and graphs for response time trends
- 🌐 UI for adding/editing APIs (no code changes needed)
- 🔔 Browser push notifications
- 📱 Mobile responsive dashboard improvements
- 🤖 Standalone background monitoring service (no browser required)
- 🔐 Authentication and multi-user support
- 🎯 Custom alert rules (latency thresholds, regex validation)
- 📈 Uptime percentage calculations
- 📧 Alert digest emails (summary instead of per-event)

---

## License & Credits

**Project**: Xentinel - API Monitor  
**Version**: 0.1.0  
**Stack**: T3-Light (Next.js + TypeScript + Tailwind)  
**Author**: Internal Development  
**Last Updated**: January 17, 2026

---

## Quick Reference

### Common Commands
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run type-check

# Linting
npm run lint
```

### Important Files to Edit
- **Add APIs**: `config/apis.config.ts` + `.env.local`
- **Email templates**: `lib/services/email-service.ts`
- **Alert logic**: `lib/services/alert-manager.ts`
- **UI styling**: `components/dashboard/*.tsx`

### Testing Checklist
- [ ] Manual health check works
- [ ] Auto-monitoring starts/stops
- [ ] DOWN alert email received
- [ ] RECOVERED alert email received
- [ ] Database status displayed
- [ ] Database alerts (if applicable)
- [ ] Response data shows correctly
- [ ] Multiple APIs monitored simultaneously

---

**For questions or issues, refer to the source code comments or contact the development team.**
