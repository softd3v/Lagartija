# Email y notificaciones — Xentinel

## Canales de alerta

| Canal | Puerto | Estado típico en red corporativa |
|-------|--------|----------------------------------|
| **Webhooks** (Discord) | 443 HTTPS | ✅ Funciona |
| **Email** (Mailgun SMTP) | 587 / 465 | ❌ Suele estar bloqueado |

## Configuración email (.env.local)

```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@tudominio.com
SMTP_PASSWORD=password-mailgun-smtp
ALERT_FROM_EMAIL=noreply@tudominio.com
ALERT_FROM_NAME=Xentinel API Monitor
ALERT_TO_EMAILS=admin1@ejemplo.com,admin2@ejemplo.com
ALERT_COOLDOWN_MINUTES=5
```

## Probar email

```http
GET http://localhost:3000/api/send-test-email
```

O endpoints de prueba por tipo:
- `/api/send-test-down-alert`
- `/api/send-test-recovered-alert`

## Diagnóstico: SMTP bloqueado

Síntoma en logs:

```
Failed to send alert email: connect ETIMEDOUT 34.160.x.x:587
```

Prueba de conectividad:

```powershell
Test-NetConnection smtp.mailgun.org -Port 587
# TcpTestSucceeded: False
```

Puertos probados bloqueados en esta red:
- 587, 465, 2525 → `smtp.mailgun.org`
- 443 → `api.mailgun.net` → **sí funciona**

**Conclusión:** el firewall bloquea SMTP saliente, no es error de credenciales Mailgun.

## Soluciones

### 1. Pedir a IT (SMTP)
Habilitar salida a `smtp.mailgun.org` puerto **587**.

### 2. Usar webhooks (recomendado hoy)
Discord/Slack vía [WEBHOOKS.md](./WEBHOOKS.md) — ya operativo.

### 3. Mailgun HTTP API (futuro)
Enviar email por API REST en puerto 443 en lugar de SMTP. Pendiente de implementar.

## Comportamiento dual

Cuando hay un incidente, Xentinel intenta **ambos canales**:

```
dispatchAlert()
  ├── sendAlertEmail()    → puede fallar si SMTP bloqueado
  └── sendWebhookAlerts() → funciona si webhook Enabled
```

El monitor sigue funcionando aunque el email falle.

## Destinatarios

`ALERT_TO_EMAILS` acepta múltiples correos separados por coma.

Para cambiar destinatarios: editar `.env.local` y reiniciar el servicio Windows.
