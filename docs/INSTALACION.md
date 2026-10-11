# Instalación — Xentinel

## Requisitos

- **Node.js** 18+ (recomendado 20+)
- **Windows** 10/11 o Server
- **PowerShell** con privilegios de administrador (solo para el servicio)
- Archivo `.env.local` en la raíz del proyecto

## Estructura relevante

```
H:\DEV\Lagartija\
├── .env.local                 # Configuración (SMTP, alertas, DB)
├── package.json
├── data\xentinel.db           # SQLite (endpoints + webhooks)
├── docs\                        # Documentación
├── service\
│   ├── monitor-service.js       # Monitor 24/7
│   ├── install-service.js
│   ├── uninstall-service.js
│   └── logs\                    # Logs diarios
└── app\dashboard\               # UI web
```

## Paso 1 — Dependencias

```powershell
cd H:\DEV\Lagartija
npm install
```

Si actualizaste Node.js:

```powershell
npm rebuild better-sqlite3
```

## Paso 2 — Variables de entorno

Copia `.env.example` a `.env.local` y configura:

```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=tu-usuario@dominio.com
SMTP_PASSWORD=tu-password-mailgun
ALERT_FROM_EMAIL=noreply@dominio.com
ALERT_FROM_NAME=Xentinel API Monitor
ALERT_TO_EMAILS=admin@ejemplo.com
ALERT_COOLDOWN_MINUTES=5
```

Ver [EMAIL_Y_NOTIFICACIONES.md](./EMAIL_Y_NOTIFICACIONES.md) si el email no llega.

## Paso 3 — Dashboard web

```powershell
npm run dev
```

Abre: **http://localhost:3000/dashboard**

Producción:

```powershell
npm run build
npm run start
```

## Paso 4 — Servicio Windows 24/7

PowerShell **como Administrador**:

```powershell
cd H:\DEV\Lagartija
npm run service:install
```

Verificar:

```powershell
Get-Service "xentinelapimonitor.exe"
# Status: Running, StartType: Automatic
```

### Gestión del servicio

```powershell
Start-Service "xentinelapimonitor.exe"
Stop-Service "xentinelapimonitor.exe"
Restart-Service "xentinelapimonitor.exe"
```

O desde `services.msc` → **Xentinel API Monitor**.

### Desinstalar

```powershell
npm run service:uninstall
```

## Paso 5 — Sembrar endpoints (opcional)

```powershell
npm run service:seed-db
```

## Verificación

| Check | Comando / URL |
|-------|---------------|
| Dashboard | http://localhost:3000/dashboard |
| API endpoints | http://localhost:3000/api/endpoints |
| Webhooks | http://localhost:3000/api/webhooks |
| Test email | http://localhost:3000/api/send-test-email |
| Logs servicio | `Get-Content service\logs\monitor-*.log -Tail 30` |

## Scripts npm

| Script | Uso |
|--------|-----|
| `npm run dev` | Dashboard en desarrollo |
| `npm run build` | Build producción |
| `npm run start` | Servidor producción |
| `npm run service:install` | Instalar servicio Windows |
| `npm run service:uninstall` | Desinstalar servicio |
| `npm run service:test` | Ejecutar monitor manualmente |
| `npm run service:seed-db` | Sembrar endpoints en SQLite |
