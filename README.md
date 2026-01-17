# Xentinel - API Monitor

RESTful API monitoring dashboard built with Next.js, TypeScript, and Tailwind CSS.

## Features

- ✅ Real-time API health monitoring
- 📊 Response time tracking and visualization
- 🔔 Status alerts and notifications
- 📈 Historical metrics and uptime statistics
- 🎯 Customizable monitoring intervals
- 🏷️ Tag-based API organization

## Tech Stack

- **Next.js 14+** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **TanStack Query** - Data fetching and polling
- **Recharts** - Data visualization
- **Zod** - Schema validation

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

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

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

## Configuration

Edit `config/apis.config.ts` to add or modify API endpoints to monitor:

```typescript
export const DEFAULT_APIS: ApiEndpoint[] = [
  {
    id: "my-api",
    name: "My API",
    url: "https://api.example.com/health",
    method: "GET",
    interval: 30, // seconds
    timeout: 5000, // milliseconds
    enabled: true,
    expectedStatus: 200,
    tags: ["production"],
  },
];
```

## Project Structure

```
/app              - Next.js App Router pages
/components       - React components
/lib              - Utilities and helpers
/types            - TypeScript definitions
/config           - Configuration files
```

## Development

```bash
# Type checking
npm run type-check

# Linting
npm run lint
```

## License

MIT

---

**Version:** 0.1.0 (MVP)
