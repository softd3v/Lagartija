# Documentación Xentinel (Lagartija)

Índice central de la documentación del monitor de APIs y bases de datos.

## Guías disponibles

| Documento | Contenido |
|-----------|-----------|
| [INSTALACION.md](./INSTALACION.md) | Instalación, dashboard, servicio Windows |
| [ARQUITECTURA.md](./ARQUITECTURA.md) | Componentes, flujos de datos y alertas |
| [WEBHOOKS.md](./WEBHOOKS.md) | Discord, Slack y notificaciones HTTP |
| [EMAIL_Y_NOTIFICACIONES.md](./EMAIL_Y_NOTIFICACIONES.md) | Email SMTP, Mailgun y canales de alerta |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | Problemas frecuentes y soluciones |

## Inicio rápido

```powershell
cd H:\DEV\Lagartija
npm install
npm run dev          # Dashboard → http://localhost:3000/dashboard
npm run service:install   # Servicio Windows 24/7 (como Admin)
```

## Documentos legacy (raíz del proyecto)

Los archivos en la raíz se mantienen por compatibilidad pero **esta carpeta `docs/` es la fuente actualizada**:

- `README.md` — entrada rápida en inglés
- `DOCUMENTATION.md` — documentación técnica legacy (inglés)
- `INSTALLATION_MANUAL.md` — manual de instalación legacy
- `service/SERVICE_GUIDE.md` — guía del servicio legacy

---

*Última actualización: Julio 2026*
