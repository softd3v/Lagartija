# Xyntel — API Monitor

Monitor en tiempo real de APIs REST, bases de datos Oracle y hosts de red.

## Inicio rápido

```bash
npm install
npm run dev        # http://localhost:3000/dashboard
```

## Documentación

**Documentación actualizada en español:** [`docs/README.md`](./docs/README.md)

| Guía | Descripción |
|------|-------------|
| [Instalación](./docs/INSTALACION.md) | Dashboard + servicio Windows |
| [Arquitectura](./docs/ARQUITECTURA.md) | Componentes y flujos |
| [Webhooks](./docs/WEBHOOKS.md) | Discord, Slack, alertas HTTP |
| [Email y notificaciones](./docs/EMAIL_Y_NOTIFICACIONES.md) | Mailgun, SMTP, canales |
| [Troubleshooting](./docs/TROUBLESHOOTING.md) | Problemas frecuentes |

## Features

- Monitoreo de APIs, Oracle DB y ping de red
- Alertas por **email** (SMTP) y **webhooks** (Discord/Slack)
- Servicio Windows 24/7 sin navegador
- Dashboard Next.js con SQLite

## Scripts

```bash
npm run dev              # Dashboard desarrollo
npm run build && npm start   # Producción
npm run service:install  # Instalar servicio Windows (Admin)
npm run service:uninstall
```

## Tech Stack

Next.js 16 · TypeScript · Tailwind · TanStack Query · SQLite · Nodemailer · node-windows

---

**Version:** 0.1.0 · **License:** MIT
