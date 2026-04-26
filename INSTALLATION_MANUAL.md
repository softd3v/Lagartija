# Manual de Instalación - Xentinel Windows Service

## 📋 Tabla de Contenidos
1. [Requisitos Previos](#requisitos-previos)
2. [Archivos Necesarios](#archivos-necesarios)
3. [Instalación Paso a Paso](#instalación-paso-a-paso)
4. [Verificación de Instalación](#verificación-de-instalación)
5. [Gestión del Servicio](#gestión-del-servicio)
6. [Configuración](#configuración)
7. [Monitoreo y Logs](#monitoreo-y-logs)
8. [Desinstalación](#desinstalación)
9. [Solución de Problemas](#solución-de-problemas)

---

## 📋 Requisitos Previos

### Software Necesario
- ✅ **Node.js** (versión 18 o superior)
- ✅ **Windows** (7, 8, 10, 11, Server 2012+)
- ✅ **PowerShell** (incluido en Windows)
- ✅ **Privilegios de Administrador** (para instalar servicios)

### Verificar Node.js
```powershell
node --version
# Debe mostrar: v18.x.x o superior
```

Si no tienes Node.js instalado, descárgalo de: https://nodejs.org/

---

## 📁 Archivos Necesarios

### Estructura de Carpetas Requerida

```
H:\DEV\Lagartija\
├── .env.local                          ⚠️ CRÍTICO - Configuración de emails
├── package.json                        ✅ Dependencias del proyecto
├── node_modules\                       ✅ Instalado con npm install
│   └── node-windows\                   ⚠️ Requerido para el servicio
│   └── nodemailer\                     ⚠️ Requerido para emails
│
└── service\                            📁 Carpeta del servicio
    ├── monitor-service.js              ⚠️ Script principal de monitoreo
    ├── install-service.js              ⚠️ Instalador del servicio
    ├── uninstall-service.js            ⚠️ Desinstalador del servicio
    ├── SERVICE_GUIDE.md                📖 Guía de referencia
    ├── .gitignore                      🔒 Protege logs en git
    └── logs\                           📁 Se crea automáticamente
        └── monitor-YYYY-MM-DD.log      📝 Logs diarios
```

### Archivo CRÍTICO: `.env.local`

**Ubicación**: `H:\DEV\Lagartija\.env.local`

**Contenido mínimo requerido**:
```env
# Mailgun SMTP Configuration
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@tudominio.com
SMTP_PASSWORD=tu-contraseña-mailgun

# Email Settings
ALERT_FROM_EMAIL=noreply@tudominio.com
ALERT_FROM_NAME=Xentinel API Monitor
ALERT_TO_EMAILS=admin1@ejemplo.com,admin2@ejemplo.com

# Alert Configuration
ALERT_COOLDOWN_MINUTES=5

# API Endpoints
NEXT_PUBLIC_CCT_API_URL=http://172.20.10.112:5000/health/detailed
```

⚠️ **SIN ESTE ARCHIVO EL SERVICIO NO FUNCIONARÁ**

---

## 🚀 Instalación Paso a Paso

### Paso 1: Navegar a la Carpeta del Proyecto

Abre **PowerShell** (no es necesario como Administrador aún):

```powershell
cd H:\DEV\Lagartija
```

### Paso 2: Verificar Dependencias

Asegúrate de que todas las dependencias estén instaladas:

```powershell
npm install
```

**Salida esperada**:
```
added XXX packages, and audited XXX packages in Xs
found 0 vulnerabilities
```

### Paso 3: Verificar que `.env.local` Existe

```powershell
Test-Path .env.local
```

**Debe mostrar**: `True`

Si muestra `False`, crea el archivo con la configuración de la sección anterior.

### Paso 4: Probar el Servicio (Opcional pero Recomendado)

**Antes de instalar como servicio**, prueba que funciona correctamente:

```powershell
npm run service:test
```

**Salida esperada**:
```
=== Xentinel Monitoring Service Started ===
Monitoring 2 endpoints
Alert cooldown: 5 minutes
Recipients: admin1@ejemplo.com, admin2@ejemplo.com
Scheduling CCT API CAMCO EA (every 30s)
Scheduling API Producction for SOL DMDT (every 30s)
[INFO] Checking CCT API CAMCO EA...
[INFO] CCT API CAMCO EA: UP (52ms)
[INFO] Checking API Producction for SOL DMDT...
[INFO] API Producction for SOL DMDT: UP (48ms)
```

Presiona **Ctrl + C** para detener.

✅ Si ves esto, el servicio está listo para instalarse.  
❌ Si hay errores, revisa [Solución de Problemas](#solución-de-problemas)

### Paso 5: Instalar el Servicio de Windows

**Cierra PowerShell** y ábrelo nuevamente **como Administrador**:

1. Presiona `Win + X`
2. Selecciona **"Windows PowerShell (Admin)"** o **"Terminal (Admin)"**
3. Navega al proyecto:

```powershell
cd H:\DEV\Lagartija
```

4. Instala el servicio:

```powershell
npm run service:install
```

**Salida esperada**:
```
Installing Xentinel API Monitor as Windows Service...
Please wait...

✅ Service installed successfully!
   Service Name: Xentinel API Monitor
   Starting service...
✅ Service started successfully!

Service Details:
   Name: Xentinel API Monitor
   Status: Running
   Startup Type: Automatic

Logs are saved to: service/logs/
```

⚠️ **Si aparece algún error**, consulta [Solución de Problemas](#solución-de-problemas)

---

## ✅ Verificación de Instalación

### Método 1: Verificar en Servicios de Windows

1. Presiona `Win + R`
2. Escribe: `services.msc`
3. Presiona Enter
4. Busca: **"Xentinel API Monitor"** o **"xentinelapimonitor.exe"**

**Debe mostrar**:
- **Estado**: Iniciado (Running)
- **Tipo de inicio**: Automático (Automatic)

### Método 2: Verificar con PowerShell

```powershell
Get-Service | Where-Object { $_.DisplayName -like "*Xentinel*" }
```

**Salida esperada**:
```
Name                   DisplayName           Status StartType
----                   -----------           ------ ---------
xentinelapimonitor.exe Xentinel API Monitor Running Automatic
```

### Método 3: Verificar con SC (Service Control)

```powershell
sc query xentinelapimonitor.exe
```

**Salida esperada**:
```
SERVICE_NAME: xentinelapimonitor.exe
        TYPE               : 10  WIN32_OWN_PROCESS
        STATE              : 4  RUNNING
        WIN32_EXIT_CODE    : 0  (0x0)
```

### Método 4: Verificar Logs

```powershell
Get-Content service/logs/monitor-$(Get-Date -Format 'yyyy-MM-dd').log -Tail 10
```

**Debe mostrar actividad reciente** (chequeos cada 30 segundos).

---

## 🎛️ Gestión del Servicio

### Iniciar el Servicio

#### Opción 1: PowerShell (como Administrador)
```powershell
sc start xentinelapimonitor.exe
```

#### Opción 2: Servicios de Windows (services.msc)
1. Abre `services.msc`
2. Busca "Xentinel API Monitor"
3. Clic derecho → **Iniciar**

### Detener el Servicio

#### Opción 1: PowerShell (como Administrador)
```powershell
sc stop xentinelapimonitor.exe
```

#### Opción 2: Servicios de Windows
1. Abre `services.msc`
2. Busca "Xentinel API Monitor"
3. Clic derecho → **Detener**

### Reiniciar el Servicio

#### PowerShell (como Administrador)
```powershell
sc stop xentinelapimonitor.exe
Start-Sleep -Seconds 3
sc start xentinelapimonitor.exe
```

#### Servicios de Windows
1. Detener el servicio
2. Esperar 2-3 segundos
3. Iniciar el servicio

### Verificar Estado

```powershell
Get-Service xentinelapimonitor.exe | Select-Object Name, Status, StartType
```

### Cambiar Tipo de Inicio

#### Automático (inicia con Windows)
```powershell
sc config xentinelapimonitor.exe start= auto
```

#### Manual (requiere inicio manual)
```powershell
sc config xentinelapimonitor.exe start= demand
```

#### Deshabilitado
```powershell
sc config xentinelapimonitor.exe start= disabled
```

⚠️ **Nota**: El espacio después de `start=` es obligatorio.

---

## ⚙️ Configuración

### Agregar Nuevos Endpoints a Monitorear

**Edita**: `service/monitor-service.js`

**Busca la sección** `API_ENDPOINTS` (línea ~45):

```javascript
const API_ENDPOINTS = [
  {
    id: "CCTAPIEA",
    name: "CCT API CAMCO EA",
    url: CONFIG.CCT_API_URL || "http://172.20.10.112:5000/health/detailed",
    method: "GET",
    interval: 30000, // 30 segundos
    timeout: 5000,
    enabled: true,
  },
  {
    id: "SOLDMDT-API",
    name: "API Producction for SOL DMDT",
    url: "http://172.20.10.114:5000/health",
    method: "GET",
    interval: 30000,
    timeout: 5000,
    enabled: true,
  },
  // ⬇️ AGREGA NUEVOS ENDPOINTS AQUÍ
  {
    id: "NUEVO_API",
    name: "Mi Nuevo API",
    url: "http://192.168.1.100:8080/health",
    method: "GET",
    interval: 60000, // 60 segundos = 1 minuto
    timeout: 5000,   // 5 segundos de timeout
    enabled: true,
  },
];
```

**Después de editar, REINICIA el servicio**:
```powershell
sc stop xentinelapimonitor.exe
sc start xentinelapimonitor.exe
```

### Cambiar Destinatarios de Emails

**Edita**: `.env.local`

```env
ALERT_TO_EMAILS=email1@dominio.com,email2@dominio.com,email3@dominio.com
```

**Separar con comas, SIN espacios**.

**Después de editar, REINICIA el servicio**.

### Cambiar Intervalo de Monitoreo

En `monitor-service.js`, modifica el valor de `interval`:

```javascript
interval: 10000,  // 10 segundos
interval: 30000,  // 30 segundos (default)
interval: 60000,  // 1 minuto
interval: 300000, // 5 minutos
```

**Después de editar, REINICIA el servicio**.

### Cambiar Cooldown de Alertas

**Edita**: `.env.local`

```env
ALERT_COOLDOWN_MINUTES=1   # 1 minuto
ALERT_COOLDOWN_MINUTES=5   # 5 minutos (default)
ALERT_COOLDOWN_MINUTES=10  # 10 minutos
```

**Después de editar, REINICIA el servicio**.

---

## 📊 Monitoreo y Logs

### Ubicación de los Logs

```
H:\DEV\Lagartija\service\logs\monitor-2026-01-21.log
```

El nombre del archivo cambia diariamente: `monitor-YYYY-MM-DD.log`

### Ver Logs en Tiempo Real

```powershell
Get-Content service/logs/monitor-$(Get-Date -Format 'yyyy-MM-dd').log -Wait
```

Presiona **Ctrl + C** para detener.

### Ver Últimas 50 Líneas

```powershell
Get-Content service/logs/monitor-$(Get-Date -Format 'yyyy-MM-dd').log -Tail 50
```

### Buscar Errores en Logs

```powershell
Select-String -Path "service/logs/*.log" -Pattern "ERROR"
```

### Buscar Alertas Enviadas

```powershell
Select-String -Path "service/logs/*.log" -Pattern "Alert email sent"
```

### Tipos de Mensajes en Logs

| Nivel | Descripción | Ejemplo |
|-------|-------------|---------|
| `[INFO]` | Operaciones normales | `CCT API CAMCO EA: UP (52ms)` |
| `[DEBUG]` | Detalles de chequeos | `Checking CCT API CAMCO EA...` |
| `[ALERT]` | Cambios de estado | `🚨 Alert: CCT API went DOWN` |
| `[ERROR]` | Errores del sistema | `Failed to send alert email` |

### Limpiar Logs Antiguos

```powershell
# Eliminar logs mayores a 30 días
Get-ChildItem service/logs/*.log | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } | Remove-Item
```

---

## 🗑️ Desinstalación

### Método 1: Con npm (Recomendado)

Abre PowerShell **como Administrador**:

```powershell
cd H:\DEV\Lagartija
npm run service:uninstall
```

**Salida esperada**:
```
Uninstalling Xentinel API Monitor Windows Service...
✅ Service uninstalled successfully!
```

### Método 2: Manual con Node

```powershell
cd H:\DEV\Lagartija
node service/uninstall-service.js
```

### Verificar Desinstalación

```powershell
sc query xentinelapimonitor.exe
```

**Debe mostrar**:
```
[SC] EnumQueryServicesStatus:OpenService FAILED 1060:
The specified service does not exist as an installed service.
```

### Limpiar Archivos Residuales (Opcional)

Después de desinstalar, puedes eliminar:

```powershell
# Logs (OPCIONAL - pueden contener información útil)
Remove-Item -Recurse service/logs

# Archivos del servicio wrapper (se crean automáticamente)
Remove-Item service/*.exe -ErrorAction SilentlyContinue
Remove-Item service/*.xml -ErrorAction SilentlyContinue
Remove-Item service/*.wrapper.log -ErrorAction SilentlyContinue
```

---

## 🔧 Solución de Problemas

### Error: "Access Denied" al Instalar

**Causa**: No tienes privilegios de administrador.

**Solución**:
1. Cierra PowerShell
2. Presiona `Win + X`
3. Selecciona **"Windows PowerShell (Admin)"**
4. Vuelve a ejecutar `npm run service:install`

---

### Error: "Service already installed"

**Causa**: El servicio ya existe.

**Solución**:
```powershell
# Desinstalar primero
npm run service:uninstall

# Esperar 5 segundos
Start-Sleep -Seconds 5

# Volver a instalar
npm run service:install
```

---

### Error: "Cannot find module 'node-windows'"

**Causa**: La dependencia `node-windows` no está instalada.

**Solución**:
```powershell
npm install node-windows
```

---

### Error: "Cannot find module 'nodemailer'"

**Causa**: La dependencia `nodemailer` no está instalada.

**Solución**:
```powershell
npm install nodemailer
```

---

### El Servicio Está Instalado pero No Envía Emails

**Pasos de diagnóstico**:

1. **Verificar que el servicio está corriendo**:
   ```powershell
   Get-Service xentinelapimonitor.exe
   ```

2. **Revisar logs de errores**:
   ```powershell
   Select-String -Path "service/logs/*.log" -Pattern "ERROR"
   ```

3. **Verificar `.env.local`**:
   ```powershell
   Get-Content .env.local
   ```
   
   Asegúrate de que tiene:
   - `SMTP_USER`
   - `SMTP_PASSWORD`
   - `ALERT_TO_EMAILS`

4. **Probar fuera del servicio**:
   ```powershell
   npm run service:test
   ```
   
   Si funciona aquí pero no como servicio, reinicia el servicio:
   ```powershell
   sc stop xentinelapimonitor.exe
   sc start xentinelapimonitor.exe
   ```

---

### El Servicio No Detecta Cambios en `.env.local`

**Causa**: El servicio carga la configuración al iniciarse.

**Solución**: Reinicia el servicio después de cualquier cambio:
```powershell
sc stop xentinelapimonitor.exe
sc start xentinelapimonitor.exe
```

---

### No se Crean Logs

**Verificar**:
1. Carpeta `service/logs/` existe:
   ```powershell
   Test-Path service/logs
   ```

2. Permisos de escritura:
   ```powershell
   # El servicio debería poder escribir aquí
   New-Item -Path "service/logs/test.txt" -ItemType File -Force
   Remove-Item service/logs/test.txt
   ```

3. Revisar Event Viewer de Windows:
   - Presiona `Win + R`
   - Escribe: `eventvwr.msc`
   - Navega a: **Windows Logs → Application**
   - Busca errores de "Xentinel API Monitor"

---

### El Servicio se Detiene Después de Unos Minutos

**Causa posible**: Errores no controlados.

**Diagnóstico**:
1. Revisar Event Viewer (ver arriba)
2. Revisar últimos logs antes de detenerse
3. Configurar reinicio automático:

```powershell
# Abre services.msc
# Busca "Xentinel API Monitor"
# Clic derecho → Propiedades → Pestaña "Recuperación"
# Configura:
#   - Primera falla: Reiniciar el servicio
#   - Segunda falla: Reiniciar el servicio
#   - Errores posteriores: Reiniciar el servicio
#   - Reiniciar servicio tras: 1 minuto
```

---

## 📞 Checklist de Instalación

Usa este checklist para verificar la instalación completa:

- [ ] Node.js instalado (v18+)
- [ ] Carpeta del proyecto: `H:\DEV\Lagartija`
- [ ] `npm install` ejecutado sin errores
- [ ] Archivo `.env.local` creado y configurado
- [ ] SMTP credentials en `.env.local` correctos
- [ ] `ALERT_TO_EMAILS` configurado
- [ ] `npm run service:test` funciona correctamente
- [ ] PowerShell abierto como Administrador
- [ ] `npm run service:install` ejecutado sin errores
- [ ] Servicio visible en `services.msc`
- [ ] Servicio con estado "Running"
- [ ] Tipo de inicio "Automático"
- [ ] Logs creándose en `service/logs/`
- [ ] Últimos logs muestran actividad
- [ ] Email de prueba recibido (detener un API para probar)

---

## 📚 Comandos de Referencia Rápida

```powershell
# INSTALACIÓN
npm run service:install              # Instalar servicio
npm run service:test                 # Probar sin instalar

# GESTIÓN
sc start xentinelapimonitor.exe      # Iniciar
sc stop xentinelapimonitor.exe       # Detener
Get-Service xentinelapimonitor.exe   # Ver estado

# LOGS
Get-Content service/logs/monitor-$(Get-Date -Format 'yyyy-MM-dd').log -Tail 50   # Últimas 50 líneas
Get-Content service/logs/monitor-$(Get-Date -Format 'yyyy-MM-dd').log -Wait      # Tiempo real
Select-String -Path "service/logs/*.log" -Pattern "ERROR"                        # Buscar errores

# DESINSTALACIÓN
npm run service:uninstall            # Desinstalar servicio
```

---

## 🆘 Soporte

Si después de seguir este manual tienes problemas:

1. Revisa los logs en `service/logs/`
2. Consulta el Event Viewer de Windows
3. Verifica que `.env.local` esté correctamente configurado
4. Prueba con `npm run service:test` primero
5. Reinicia el servicio después de cualquier cambio

---

**Versión del Manual**: 1.0  
**Fecha**: 21 de enero de 2026  
**Proyecto**: Xentinel API Monitor
