# Troubleshooting — Xentinel

## Failed to load endpoints (dashboard)

**Causa:** `better-sqlite3` compilado para otra versión de Node.js.

```
NODE_MODULE_VERSION 127 vs 137
```

**Solución:**

```powershell
cd H:\DEV\Lagartija
npm rebuild better-sqlite3
# Reiniciar npm run dev o el servicio Windows
```

---

## Webhook DOWN llega, RECOVERED no

**Causa:** Cooldown de 5 min bloqueaba recovered si hubo otro recovered reciente.

**Estado:** Corregido — si se envió DOWN y no hubo RECOVERED para ese incidente, siempre notifica la recuperación.

**Acción:** Reiniciar servicio Windows para aplicar:

```powershell
Restart-Service "xentinelapimonitor.exe"
```

---

## Webhook no envía alertas reales (pero Test sí)

**Causa:** Webhook con `Enabled = false` en la base de datos.

**Solución:** Dashboard → Webhook Notifications → Edit → marcar **Enabled** → Save.

Verificar en logs del servicio:

```
Webhooks: 0 enabled   ← mal
Webhooks: 1 enabled   ← bien
```

---

## Email no llega (Mailgun)

Ver [EMAIL_Y_NOTIFICACIONES.md](./EMAIL_Y_NOTIFICACIONES.md).

Resumen: SMTP puerto 587 bloqueado por firewall. Usar Discord/webhooks.

---

## Servicio Windows no arranca

```powershell
Get-Service "xentinelapimonitor.exe"
```

Revisar:
1. `.env.local` existe
2. `npm install` completado
3. Event Viewer → Application → "Xentinel API Monitor"
4. Logs: `service\logs\monitor-YYYY-MM-DD.log`

Reinstalar:

```powershell
npm run service:uninstall
npm run service:install
```

---

## RTG14 / RTG40 — error better-sqlite3 en servicio

Mismo fix que dashboard:

```powershell
npm rebuild better-sqlite3
Restart-Service "xentinelapimonitor.exe"
```

---

## Alertas solo con dashboard abierto

El dashboard solo alerta con **Start Monitoring** activo.

Para 24/7 sin navegador: usar el **servicio Windows**.

```powershell
Get-Service "xentinelapimonitor.exe"  # debe estar Running
```

---

## Ver logs en tiempo real

```powershell
Get-Content H:\DEV\Lagartija\service\logs\monitor-2026-07-07.log -Tail 30 -Wait
```

Buscar:
- `[ALERT]` — alertas disparadas
- `Webhook alert sent` — webhook enviado
- `Failed to send alert email` — SMTP bloqueado
- `RECOVERED alert skipped` — cooldown (legacy, ya corregido)

---

## Comandos útiles

```powershell
# Estado servicio
Get-Service "xentinelapimonitor.exe"

# Probar API
Invoke-WebRequest http://localhost:3000/api/endpoints

# Probar webhook
Invoke-WebRequest -Method POST http://localhost:3000/api/webhooks/ID/test

# Probar email
Invoke-WebRequest http://localhost:3000/api/send-test-email
```
