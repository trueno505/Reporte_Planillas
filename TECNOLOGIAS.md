# Tecnologías del proyecto — Muni Sheets

Aplicación web para la gestión y reporte de planillas de la **Municipalidad
Provincial de Ica**. A continuación, todas las tecnologías utilizadas.

---

## Resumen rápido

| Capa | Tecnología principal |
|---|---|
| Frontend | React 19 + Vite |
| Estilos | Tailwind CSS |
| Backend / Base de datos | Supabase (PostgreSQL + Auth + Realtime + RLS) |
| Lenguaje | JavaScript (ES Modules, JSX) |
| Despliegue | Build estático generado por Vite |

---

## Frontend

| Tecnología | Versión | Para qué se usa |
|---|---|---|
| **React** | ^19.2.6 | Librería de interfaz de usuario (componentes, hooks) |
| **React DOM** | ^19.2.6 | Renderizado de React en el navegador |
| **React Router DOM** | ^7.18.0 | Enrutamiento entre páginas (Dashboard, Planillas, Auditoría, etc.) |
| **Vite** | ^8.0.12 | Servidor de desarrollo y empaquetador (build) |
| **@vitejs/plugin-react** | ^6.0.1 | Soporte de React (Fast Refresh / JSX) en Vite |

## Estilos / UI

| Tecnología | Versión | Para qué se usa |
|---|---|---|
| **Tailwind CSS** | ^3.4.19 | Framework de estilos utilitarios (color primario `#003366`) |
| **PostCSS** | ^8.5.15 | Procesamiento de CSS (requerido por Tailwind) |
| **Autoprefixer** | ^10.5.0 | Prefijos CSS automáticos para compatibilidad entre navegadores |
| **lucide-react** | ^1.21.0 | Íconos SVG |
| **react-hot-toast** | ^2.6.0 | Notificaciones / mensajes emergentes (toasts) |

## Datos, tablas y reportes

| Tecnología | Versión | Para qué se usa |
|---|---|---|
| **@tanstack/react-table** | ^8.21.3 | Renderizado de tablas (orden, filtros, edición en línea, alertas) |
| **xlsx-js-style** | ^1.2.0 | **Toda** la manipulación de Excel: lectura de archivos subidos (importación masiva, actualizar columna por DNI, plantillas) y exportes **estilizados** (encabezado institucional, agrupación por área, resúmenes RESÚMEN / ESSALUD 9% / COMPROBACIÓN, cuadros presupuestales y reporte consolidado) |
| **jspdf** | ^4.2.1 | Generación de PDF (boletas de pago individuales) |
| **jspdf-autotable** | ^5.0.8 | Tablas dentro de los PDF |
| **recharts** | ^3.8.1 | Gráficos del Dashboard (barras de líquido total por grupo) |

> **Una sola librería de Excel.** El proyecto tenía además `xlsx` (SheetJS 0.20.3)
> solo para *leer* archivos, mientras `xlsx-js-style` se usaba para *escribir*.
> Como la segunda es un fork de la primera y lee de forma idéntica (verificado,
> incluidos los seriales de fecha), se eliminó la dependencia duplicada: el
> bundle bajó **161 kB gzip**. **No vuelvas a añadir `xlsx`**: usa
> `xlsx-js-style` también para leer.

## Backend / Base de datos

| Tecnología | Versión | Para qué se usa |
|---|---|---|
| **Supabase** | — | Plataforma backend (BaaS) |
| **@supabase/supabase-js** | ^2.108.2 | Cliente JavaScript para conectarse a Supabase |
| **PostgreSQL** | (gestionado por Supabase) | Base de datos relacional |
| **Supabase Auth** | — | Autenticación de usuarios (login por email) |
| **Supabase Realtime** | — | Actualización en vivo de las tablas (postgres_changes) |
| **PostgREST** | — | API REST automática sobre PostgreSQL (consultas del cliente) |

### Características de PostgreSQL utilizadas

- **Row Level Security (RLS)** — control de acceso por rol (`consultor` / `editor` / `administrador` / `superadmin`).
- **Funciones (PL/pgSQL y SQL)** — `get_my_rol()`, `recalcular_totales()`,
  `actualizar_columna_planilla()`, `abrir_periodo()`, `corregir_identidad()`,
  `buscar_trabajador()`, `resumen_planillas()`, `sync_dni_registro()`,
  `calcular_aportes_pension()` + `afp_canonica()` / `comision_canonica()`
  (aportes previsionales ONP/AFP), etc.
- **Triggers** — totales **y aportes previsionales** calculados en la BD (el cliente no
  puede fijarlos), auditoría automática, DNI único global,
  protección de la cuenta `superadmin` (`proteger_rol_perfil`, `proteger_superadmin_ban`,
  `proteger_superadmin_delete`).
- **Vistas** — `vw_dni_todos` (con `security_invoker`).
- **Extensiones** — `moddatetime` (timestamps) y `pg_trgm` (búsqueda por nombre con índices GIN).
- **Índices parciales `UNIQUE`** — en `parametros_aportes`, porque en un `UNIQUE` normal
  los `NULL` de `afp` se consideran distintos y dejarían duplicar la fila de ONP.
- **Políticas RLS separadas por acción** — una política `FOR ALL` cuenta también como
  política de `SELECT`; separarlas evita evaluar dos permisivas en cada lectura.

## Pruebas (testing)

| Tecnología | Versión | Para qué se usa |
|---|---|---|
| **Vitest** | ^4.1.9 | Pruebas unitarias / de componentes (`npm run test`) |
| **@testing-library/react** | ^16.3.2 | Render y consultas de componentes en las pruebas |
| **@testing-library/jest-dom** · **user-event** | ^6.x · ^14.x | Matchers del DOM y simulación de interacción del usuario |
| **jsdom** | ^29.1.1 | DOM simulado para las pruebas unitarias |
| **@playwright/test** | ^1.61.1 | Pruebas end-to-end en navegador real (`npm run test:e2e`), herméticas con un mock de Supabase (auth/REST/RPC/realtime) — sin backend ni credenciales |

## Herramientas de desarrollo (tooling)

| Tecnología | Versión | Para qué se usa |
|---|---|---|
| **ESLint** | ^10.3.0 | Análisis estático / linting del código |
| **@eslint/js** | ^10.0.1 | Reglas base de ESLint |
| **eslint-plugin-react-hooks** | ^7.1.1 | Reglas para los hooks de React |
| **eslint-plugin-react-refresh** | ^0.5.2 | Reglas para Fast Refresh |
| **globals** | ^17.6.0 | Definición de variables globales para ESLint |
| **@types/react**, **@types/react-dom** | ^19.x | Tipados de React (autocompletado) |
| **Git** | — | Control de versiones |
| **npm** | — | Gestor de paquetes |

## Lenguajes

- **JavaScript** (ES Modules, `type: "module"`) — lógica de la aplicación.
- **JSX** — componentes de React.
- **TypeScript (Deno)** — Edge Functions de Supabase (`supabase/functions/`).
- **SQL (PostgreSQL / PL-pgSQL)** — esquema, funciones y triggers (carpeta `supabase/`).
- **HTML / CSS** — estructura y estilos base.

---

## Arquitectura en una frase

> SPA en **React + Vite** estilizada con **Tailwind**, que consume **Supabase**
> (PostgreSQL con RLS, Auth, Realtime, Edge Functions y funciones/triggers en SQL)
> como backend, con exportación **Excel estilizada** (resúmenes por área, ESSALUD,
> cuadros presupuestales), carga masiva de trabajadores nuevos y actualización masiva
> por **Excel**, generación de **PDF** y gráficos con **Recharts**.
