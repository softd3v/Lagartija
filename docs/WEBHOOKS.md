# Webhooks — Xentinel

Notificaciones por HTTP (Discord, Slack u otras herramientas) cuando un endpoint falla o se recupera.

## Por qué webhooks

- Usan **HTTPS (puerto 443)** — suele estar permitido en redes corporativas
- **Discord funciona** aunque SMTP esté bloqueado
- Configurables por evento y por endpoint

## Configurar desde el dashboard

1. Abre http://localhost:3000/dashboard
2. Sección **Webhook Notifications**
3. Completa el formulario:

| Campo | Descripción |
|-------|-------------|
| ID | Identificador único (`discord-alertas`) |
| Name | Nombre descriptivo |
| Webhook URL | URL del webhook |
| Type | `discord`, `slack` o `generic` |
| Enabled | **Debe estar activo** para alertas reales |
| Events | `down`, `recovered`, etc. |
| Endpoint IDs | Vacío = todos; o lista separada por comas |

4. Clic en **Test** → verificar en Discord/Slack
5. **Add Webhook**

## Discord — crear webhook

1. Canal → Editar → **Integraciones** → **Webhooks** → **Nuevo webhook**
2. Copiar URL: `https://discord.com/api/webhooks/{id}/{token}`
3. En Xentinel: Type = **Discord**, pegar URL, marcar **Enabled**

## Eventos disponibles

| Evento | Cuándo se envía |
|--------|-----------------|
| API Down | UP → DOWN |
| API Recovered | DOWN → UP |
| Database Down | BD desconectada |
| Database Recovered | BD reconectada |

## Tipos de payload

### Discord
Mensaje con embed (color rojo=down, verde=recovered).

### Slack
Mensaje de texto con markdown.

### Generic JSON
```json
{
  "source": "xentinel-api-monitor",
  "event": "down",
  "timestamp": "2026-07-07T15:00:00.000Z",
  "endpoint": {
    "id": "CCTAPIEA",
    "name": "CCT API CAMCO EA",
    "type": "api",
    "target": "http://172.20.10.112:5000/health/detailed"
  },
  "healthCheck": {
    "status": "down",
    "responseTime": 5000,
    "error": "Request timeout"
  }
}
```

## API REST

```http
# Crear
POST /api/webhooks
Content-Type: application/json

{
  "id": "discord-alertas",
  "name": "Discord Alertas",
  "url": "https://discord.com/api/webhooks/...",
  "type": "discord",
  "enabled": true,
  "events": ["down", "recovered"],
  "endpointIds": []
}

# Probar
POST /api/webhooks/discord-alertas/test

# Listar
GET /api/webhooks
```

## Cuándo se envían

| Componente | Condición |
|------------|-----------|
| Servicio Windows | Siempre 24/7 si webhook **Enabled** |
| Dashboard | Solo con **Start Monitoring** activo |

Ambos leen la misma tabla `webhook_configs` en SQLite.

## Problemas frecuentes

| Problema | Solución |
|----------|----------|
| DOWN llega, RECOVERED no | Ver [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) — cooldown |
| Test funciona, alertas reales no | Marcar **Enabled** en el webhook |
| Nada llega | Verificar URL, permisos del canal Discord |
