# Xyntel - API Monitor

Real-time monitoring dashboard for RESTful APIs and databases, built with Next.js, TypeScript, and Tailwind CSS.

## Features

- ✅ Real-time health monitoring for REST APIs and Oracle databases
- 📊 Response time tracking per endpoint
- 🔔 Automated email alerts when an endpoint goes down or recovers
- 🖥️ Windows background service for 24/7 monitoring without a browser
- 🎯 Configurable polling intervals per endpoint
- 🏷️ Tag-based endpoint organization
- 🗄️ SQLite-backed endpoint persistence

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Data fetching | TanStack Query v5 |
| Validation | Zod v4 |
| Charts | Recharts |
| Database | SQLite (better-sqlite3) |
| DB monitoring | oracledb |
| Email alerts | Nodemailer |
| Windows service | node-windows |

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Open [http://localhost:3000](http://localhost:3000) to access the dashboard.

## Environment Variables

Create a `.env.local` file at the project root. See `.env.example` for all available variables:

```env
# Email alerts
ALERT_EMAIL_HOST=smtp.example.com
ALERT_EMAIL_PORT=587
ALERT_EMAIL_USER=user@example.com
ALERT_EMAIL_PASS=yourpassword
ALERT_EMAIL_TO=recipient@example.com
ALERT_FROM_NAME=Xyntel API Monitor
```

## Project Structure

```
/app
  /api            - Next.js API routes (health checks, CRUD endpoints)
  /dashboard      - Dashboard page
  layout.tsx      - Root layout and metadata
/components
  /dashboard      - ApiCard, EndpointForm, PollingControls
  /ui             - Shared UI components (StatusBadge)
/lib
  /api-monitor    - Health checker logic (REST + database)
  /db             - SQLite repository
  /hooks          - Custom React hooks
  /services       - Alert manager and email service
  /validation     - Zod schemas
/types            - Centralized TypeScript definitions
/config           - Default API configuration
/service          - Windows service scripts and daemon
/public/images    - Static assets (logo, icons)
```

## Windows Service

Run monitoring 24/7 as a Windows background service (requires Administrator):

```bash
# Install service
npm run service:install

# Uninstall service
npm run service:uninstall

# Run service manually (for testing)
npm run service:test

# Seed database with initial endpoints
npm run service:seed-db
```

## Scripts

```bash
npm run dev           # Start development server (Turbopack)
npm run build         # Production build
npm run start         # Start production server
npm run lint          # ESLint
npm run type-check    # TypeScript check (no emit)
```

## License

MIT

---

**Version:** 0.1.0
