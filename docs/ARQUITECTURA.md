# Arquitectura — Xentinel

## Visión general

Xentinel monitorea endpoints REST, bases de datos Oracle y hosts de red (ping). Tiene dos modos de ejecución que comparten la misma base de datos y lógica de alertas:

```
┌─────────────────────┐     ┌──────────────────────────┐
│  Dashboard Next.js  │     │  Servicio Windows 24/7   │
│  (browser polling)  │     │  monitor-service.js      │
└─────────┬───────────┘     └────────────┬─────────────┘
          │                              │
          └──────────┬───────────────────┘
                     ▼
          ┌─────────────────────┐
          │   data/xentinel.db   │
          │  endpoints + webhooks│
          └─────────────────────┘
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
    Email (SMTP)          Webhooks (HTTPS)
    Mailgun :587          Discord / Slack / JSON
```

## Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 16, React 19, Tailwind |
| Estado | TanStack Query |
| Validación | Zod |
| Persistencia | SQLite (better-sqlite3) |
| Monitor DB | oracledb |
| Alertas email | Nodemailer |
| Alertas webhook | fetch / HTTP POST |
| Servicio Windows | node-windows |

## Tipos de endpoint

| Tipo | Qué monitorea | Ejemplo |
|------|---------------|---------|
| `api` | HTTP/HTTPS health check | `/health/detailed` |
| `database` | Conexión Oracle | `host:1521/SERVICE` |
| `network` | Ping ICMP | `175.30.30.149` |

## Flujos de monitoreo

### Dashboard con auto-polling

```
Usuario → Start Monitoring
  → ApiCard hace polling a /api/monitor/[id]
  → Health check server-side
  → alertManager.checkAndAlert()
  → dispatchAlert() → email + webhooks
```

### Servicio Windows

```
monitor-service.js (cada N segundos por endpoint)
  → check API / Oracle / ping
  → checkAndAlert()
  → dispatchAlert() → email + webhooks
  → logs en service/logs/
```

### Check manual ("Check Now")

- **API**: cliente directo, **sin alertas**
- **Database / Network**: vía API server, **sí dispara alertas**

## Sistema de alertas

### Tipos de evento

| Evento | Cuándo |
|--------|--------|
| `down` | Endpoint pasa a DOWN |
| `recovered` | Endpoint vuelve a UP tras DOWN |
| `database-down` | BD desconectada en respuesta API |
| `database-recovered` | BD reconectada |

### Reglas de cooldown

| Evento | Cooldown |
|--------|----------|
| DOWN | Ninguno — siempre inmediato |
| RECOVERED | 5 min por defecto, **excepto** si hay un DOWN pendiente sin RECOVERED |
| Database | 5 min entre alertas del mismo tipo |

Configurable: `ALERT_COOLDOWN_MINUTES` en `.env.local`.

### Componentes clave

| Archivo | Rol |
|---------|-----|
| `lib/services/alert-manager.ts` | Detecta cambios de estado |
| `lib/services/notification-service.ts` | Despacha email + webhooks |
| `lib/services/email-service.ts` | Plantillas y envío SMTP |
| `lib/services/webhook-service.ts` | Discord, Slack, JSON genérico |
| `lib/db/endpoints-repository.ts` | CRUD endpoints SQLite |
| `lib/db/webhooks-repository.ts` | CRUD webhooks SQLite |
| `service/monitor-service.js` | Monitor 24/7 (paridad con dashboard) |
| `service/webhook-alert.js` | Webhooks en el servicio JS |

## API routes principales

| Ruta | Uso |
|------|-----|
| `GET /api/endpoints` | Listar endpoints |
| `POST /api/endpoints` | Crear endpoint |
| `GET /api/monitor/[id]` | Health check + alertas |
| `GET /api/webhooks` | Listar webhooks |
| `POST /api/webhooks/[id]/test` | Probar webhook |
