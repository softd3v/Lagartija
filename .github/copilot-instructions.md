# Lagartija - Monitor de APIs RESTful

## 📌 Descripción del Proyecto
Aplicación para monitorear APIs RESTful locales en tiempo real, con dashboard visual, métricas de rendimiento y alertas.

---

## 🛠️ Stack Tecnológico (T3-Light)

### Core
- **Next.js 14+** - Framework principal (App Router)
- **TypeScript** - Lenguaje de programación
- **Tailwind CSS** - Framework de estilos
- **React Query (TanStack Query)** - Gestión de estado y polling automático
- **Zod** - Validación de schemas y tipos

### Visualización y UI
- **Recharts** o **Chart.js** - Gráficas de métricas
- **Lucide React** - Iconos
- **shadcn/ui** - Componentes UI (opcional)

### Persistencia (Futuro)
- **Prisma** - ORM para base de datos
- **SQLite** o **PostgreSQL** - Base de datos para historial

---

## ⚠️ REGLA FUNDAMENTAL DE TRABAJO

**NUNCA ejecutar cambios sin aprobación previa:**

1. **SIEMPRE** mostrar primero un plan detallado de los pasos a seguir
2. **LISTAR** todos los archivos que se crearán o modificarán
3. **ESPERAR** confirmación explícita del usuario antes de proceder
4. **MOSTRAR** código relevante cuando sea necesario para revisión
5. Solo después de la aprobación, ejecutar los cambios

**Formato para presentar cambios:**
```
## Pasos a Ejecutar:
1. [Paso 1 con descripción]
2. [Paso 2 con descripción]
...

## Archivos a Crear/Modificar:
- path/archivo1.ts - [descripción del cambio]
- path/archivo2.tsx - [descripción del cambio]

¿Procedo con estos cambios?
```

---

## 📁 Estructura de Carpetas

```
/app
  ├── /api              # API Routes para health checks
  ├── /dashboard        # Página principal de monitoreo
  ├── /config           # Configuración de endpoints
  └── layout.tsx        # Layout raíz

/components
  ├── /ui               # Componentes base reutilizables
  ├── /dashboard        # Componentes específicos del dashboard
  ├── /monitors         # Componentes de monitoreo
  └── /charts           # Componentes de gráficas

/lib
  ├── /api-monitor      # Lógica de monitoreo de APIs
  ├── /utils            # Funciones utilitarias
  └── /hooks            # Custom React hooks

/types
  └── index.ts          # Definiciones TypeScript centralizadas

/config
  └── apis.config.ts    # Configuración de APIs a monitorear

/prisma (futuro)
  └── schema.prisma     # Schema de base de datos
```

---

## 💻 Convenciones de Código

### General
- Idioma: **English** for everything (code, comments, UI, documentation)
- Use **strict TypeScript** (no any, explicit types)
- Prefer **functional components** and hooks
- Use **"use client"** only when absolutely necessary
- All user-facing text in English

### Naming Conventions
```typescript
// Componentes: PascalCase
export default function ApiMonitorCard() {}

// Funciones: camelCase
function checkApiHealth() {}

// Tipos/Interfaces: PascalCase con prefijo
type ApiEndpoint = {}
interface IMonitorConfig = {}

// Constantes: UPPER_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;

// Archivos: kebab-case
// api-monitor.ts, health-checker.tsx
```

### Imports
```typescript
// Orden de imports:
// 1. React/Next
// 2. External libraries
// 3. Internal components
// 4. Types
// 5. Styles/utils

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import ApiCard from '@/components/dashboard/api-card';
import type { ApiEndpoint } from '@/types';
import { cn } from '@/lib/utils';
```

### Componentes
```typescript
// Estructura preferida:
'use client'; // Solo si es necesario

import statements...

type Props = {
  // Props tipadas
};

export default function ComponentName({ ...props }: Props) {
  // 1. Hooks
  // 2. Estado local
  // 3. Funciones/handlers
  // 4. Efectos
  // 5. Return JSX
  
  return (
    <div className="...">
      {/* Contenido */}
    </div>
  );
}
```

---

## 🎯 Features del Proyecto

### Fase 1: MVP (Mínimo Viable)
- [ ] Dashboard básico con lista de APIs
- [ ] Health check manual de endpoints
- [ ] Visualización de estado (✅ UP / ❌ DOWN)
- [ ] Tiempo de respuesta básico

### Fase 2: Monitoreo Automático
- [ ] Polling automático con React Query
- [ ] Configuración de intervalos personalizados
- [ ] Gráficas de tiempo de respuesta
- [ ] Indicadores visuales de latencia

### Fase 3: Persistencia e Historial
- [ ] Guardar configuración de endpoints
- [ ] Historial de estados (últimas 24h, 7 días, 30 días)
- [ ] Estadísticas de uptime
- [ ] Logs de errores/incidentes

### Fase 4: Alertas y Notificaciones
- [ ] Sistema de alertas cuando API cae
- [ ] Notificaciones de navegador
- [ ] Umbrales configurables de latencia
- [ ] Reportes por correo (opcional)

### Fase 5: Avanzado
- [ ] Múltiples métodos HTTP (GET, POST, etc.)
- [ ] Headers y autenticación personalizados
- [ ] Validación de respuestas esperadas
- [ ] Comparación de versiones de API
- [ ] Export de métricas (CSV, JSON)

---

## 🔧 Configuración de APIs

### Formato de Configuración
```typescript
type ApiEndpoint = {
  id: string;
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  interval: number; // segundos
  timeout: number; // milisegundos
  enabled: boolean;
  expectedStatus?: number;
  tags?: string[];
};
```

---

## 🎨 Guía de UI/UX

### Colores
- **Success (API UP)**: Verde (green-500)
- **Error (API DOWN)**: Rojo (red-500)
- **Warning (Latencia alta)**: Amarillo (yellow-500)
- **Info**: Azul (blue-500)
- **Neutral**: Gris (slate-500)

### Componentes Principales
1. **ApiCard** - Tarjeta individual de API con estado
2. **ApiList** - Grid/lista de todas las APIs
3. **MetricsChart** - Gráfica de tiempo de respuesta
4. **StatusBadge** - Badge de estado (UP/DOWN)
5. **LatencyIndicator** - Indicador visual de latencia

---

## 📝 Notas de Desarrollo

### Polling Strategy
- Usar React Query con `refetchInterval`
- Implementar backoff exponencial en errores
- Pausar polling cuando tab no está activo

### Performance
- Lazy loading de gráficas
- Virtualización para listas largas
- Memoización de componentes pesados

### Testing (Futuro)
- Unit tests con Jest
- Component tests con React Testing Library
- E2E tests con Playwright

---

## 🚀 Scripts Útiles

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "type-check": "tsc --noEmit"
}
```

---

## 📚 Recursos y Referencias

- [Next.js Docs](https://nextjs.org/docs)
- [TanStack Query](https://tanstack.com/query/latest)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Zod](https://zod.dev/)
- [shadcn/ui](https://ui.shadcn.com/)

---

**Última actualización:** 2026-01-17
**Versión:** 0.1.0 (Inicialización)
