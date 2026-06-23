# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server (localhost:5173)
npm run build      # Production build
npm run lint       # ESLint check
npm run preview    # Serve the production build locally

node scripts/genSql.mjs   # Regenerate supabase/03_tablas.sql, 09_totales.sql and 10_indices.sql from the planillas config
```

## Environment

Create a `.env` file with:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Architecture

### Single source of truth: `src/config/planillas.js`

Every planilla (pay-roll table) is defined here as an object with `{ slug, tabla, label, grupo, columnas[], sinAutoTotales?, excluirCalculo? }`. Each column has `{ key, label, type, required? }` where type is one of `'dni' | 'text' | 'date' | 'int' | 'money'`.

**Adding or renaming a column** = edit `planillas.js`, then run `node scripts/genSql.mjs` to regenerate `supabase/03_tablas.sql`, then run that SQL in the Supabase SQL Editor.

The same config object drives:
- SQL generation (column types, UNIQUE constraint on `dni`)
- `PlanillaTable` column rendering, formatting, and alerts
- `RecordForm` input types, validation, and live auto-calculation
- Excel export header order (`ExcelExport`)
- Excel import header-to-key mapping (`ExcelImport`)
- PDF boleta layout (`boletaPdf.js`)
- Totals calculation (`calculos.js`)

**Exported helpers from `planillas.js`:**
- `getPlanillaBySlug(slug)` — lookup by URL slug
- `getPlanillaByTabla(tabla)` — lookup by table name
- `getSeccionesCalculo(planilla)` — returns ingresos/descuentos/totales sections
- `GRUPOS` — array of unique group names

### Shared column sets

`CAS_COLS` and `EMPL_PI_COLS` are local constants in `planillas.js` shared by multiple planilla definitions (7 CAS tables share identical columns; `empleados_contrato_provisional` mirrors `empleados_contrato_plazo_indet`). Edit those constants to update all affected planillas at once.

### 19 Planillas defined

Groups: Obreros, Empleados, CAS, Pensionistas, Autoridades.

Slugs: `obreros-permanentes`, `obreros-plazo-indeterminado`, `obreros-mandato-judicial`, `obreros-concurso`, `obreros-necesidad-mercado`, `empleados-permanentes`, `empleados-contrato-plazo-indet`, `empleados-contrato-provisional`, `empleados-mandato-judicial`, `cas-general`, `cas-choferes`, `cas-i-2025`, `cas-ii-2023`, `cas-ii-2024`, `cas-iii-2025`, `cas-funcional`, `cesantes-pensionistas`, `gerente-municipal`, `alcalde`.

### Data flow per planilla page

```
PlanillaPage (slug from URL)
  → getPlanillaBySlug()         reads config
  → usePlanilla(tabla)          initial fetch from Supabase, returns {filas, applyChange, refetch}
  → useRealtime(tabla, cb)      subscribes postgres_changes; calls applyChange on event
  → PlanillaTable               renders rows via @tanstack/react-table with alerts
  → RecordForm / ExcelImport / ExcelDelete / ExcelExport   mutate/read Supabase
```

Realtime updates mutate local state (`applyChange`) **without** re-fetching. A full refetch (`refetch`) is called only after bulk Excel operations.

### Pages

| Page | Route | Access |
|---|---|---|
| `Login.jsx` | `/login` | Public |
| `Dashboard.jsx` | `/dashboard` | All |
| `PlanillaPage.jsx` | `/planilla/:slug` | All |
| `BusquedaGlobal.jsx` | `/buscar` | All |
| `Auditoria.jsx` | `/auditoria` | Admin only |
| `Usuarios.jsx` | `/usuarios` | Admin only |

**Dashboard** shows KPIs, a bar chart (Recharts) of total líquido by group, a summary table per planilla, and a button to generate a consolidated Excel report (`reporteConsolidado.js`).

**BusquedaGlobal** searches all 19 planillas by DNI (exact) or name (ILIKE) via the `buscar_trabajador(termino)` RPC.

**Auditoria** shows the change log from `public.auditoria` with filters by table and action (INSERT/UPDATE/DELETE), joined with `perfiles`.

**Usuarios** allows admins to promote/demote users between `consultor` and `administrador` roles.

### Components

| Component | Purpose |
|---|---|
| `Layout.jsx` | Shell with Header + Sidebar + main content area |
| `Header.jsx` | Top bar: current user, role badge, logout |
| `Sidebar.jsx` | Collapsible navigation grouped by `grupo` |
| `ProtectedRoute.jsx` | Redirects unauthenticated users to `/login` |
| `PlanillaTable.jsx` | Data table with sort, filter, inline edit, row alerts, PDF boleta download, edit/delete actions |
| `RecordForm.jsx` | Modal to create/edit a record; live auto-calculates totals |
| `ExcelImport.jsx` | Upload Excel → preview (new/updated/errors) → UPSERT; also generates blank template |
| `ExcelExport.jsx` | Download current rows as `.xlsx` |
| `ExcelDelete.jsx` | Upload Excel with DNIs → confirm → bulk DELETE |
| `ConfirmDialog.jsx` | Reusable confirm modal; `danger` prop for red styling |

### Hooks

| Hook | Signature | Returns |
|---|---|---|
| `usePlanilla` | `usePlanilla(tabla)` | `{ filas, loading, error, refetch, applyChange }` |
| `useRealtime` | `useRealtime(tabla, onPayload)` | — (sets up subscription, cleans up on unmount) |

### Context

`AuthContext.jsx` — provides `{ session, perfil, isAdmin, isConsultor, loading, signOut }` via `useAuth()`.

### Utility libraries (`src/lib/`)

| File | Purpose |
|---|---|
| `supabaseClient.js` | Initializes Supabase client from env vars |
| `calculos.js` | `calcularTotales(planilla, fila)`, `recalcularFilas(planilla, filas)` |
| `alertas.js` | `detectarAlertas(planilla, fila)` — detects LIQUIDO_NEGATIVO, TOTAL_DESCUADRADO, FALTAS_EXCESIVAS |
| `boletaPdf.js` | `generarBoletaPdf(planilla, fila)` — generates and downloads individual pay-slip PDF |
| `reporteConsolidado.js` | `generarReporteConsolidado(resumenData)` — multi-sheet Excel; `descargarPlantilla(planilla)` — blank template |

### Roles and security

- Two roles: `consultor` (SELECT + export + boleta PDF) and `administrador` (full CRUD + bulk Excel + auditoría + user management).
- Role is stored in `public.perfiles.rol` and read by the Supabase RLS function `get_my_rol()` (SECURITY DEFINER).
- The UI hides admin actions based on `isAdmin` from `AuthContext`, but actual security enforcement is RLS — never bypass it.
- `perfiles` row is auto-created on signup via the `handle_new_user` trigger with default role `consultor`. To promote to admin: `UPDATE perfiles SET rol = 'administrador' WHERE id = '<uuid>'`.
- Admin can also change roles from the `/usuarios` page.

### Database setup order

Run `supabase/` files in order in the Supabase SQL Editor:

`01_extensions` → `02_perfiles` → `03_tablas` → `04_rls` → `05_realtime` → `06_auditoria` → `07_funciones` → `08_admin` → `09_totales` → `10_indices` → `11_operaciones` → `12_fix_auditoria_y_admin` → `13_dni_unico_global`

`03_tablas.sql`, `09_totales.sql` and `10_indices.sql` are generated by `scripts/genSql.mjs` — do not edit them by hand.

| File | Contents |
|---|---|
| `01_extensions.sql` | Enables `moddatetime` and `pg_trgm` |
| `02_perfiles.sql` | `perfiles` table + `handle_new_user` trigger |
| `03_tablas.sql` | 19 planilla tables (generated) |
| `04_rls.sql` | `get_my_rol()` function + RLS policies (wrapped in `(select …)` for perf) |
| `05_realtime.sql` | Enables Realtime + REPLICA IDENTITY FULL on 19 tables |
| `06_auditoria.sql` | `auditoria` table (`usuario_id` FK → `public.perfiles.id` so PostgREST can embed `perfiles(nombre)`) + trigger on all 19 tables |
| `07_funciones.sql` | `resumen_planillas()` and `buscar_trabajador(termino)` RPCs (ILIKE escaped, DNI guard) |
| `08_admin.sql` | Extra policies so admins can manage all `perfiles` rows |
| `09_totales.sql` | BEFORE INSERT/UPDATE triggers that compute `t_ingreso/t_dsctos/t_liquido` in the DB (generated; 18 planillas — not `obreros_necesidad_mercado`) |
| `10_indices.sql` | GIN trigram indexes on `apellidos_y_nombres` for fast name search (generated) |
| `11_operaciones.sql` | Atomic RPCs `importar_planilla(p_tabla, p_filas)` and `recalcular_totales(p_tabla)` (admin-only, table whitelist) |
| `12_fix_auditoria_y_admin.sql` | Migración correctiva para BD ya creada: reapunta `auditoria.usuario_id` FK a `perfiles`, reasegura las políticas admin de `perfiles` y recarga el esquema de PostgREST |
| `13_dni_unico_global.sql` | DNI único **entre todas las planillas**: tabla-registro central `dni_registro` (PK en `dni`) + vista `vw_dni_todos` + trigger `sync_dni_registro` en las 19 tablas. El `dni UNIQUE` por tabla (en `03_tablas.sql`) sigue vigente como capa adicional |

**Totals are computed in the database.** The `09_totales.sql` triggers are the source of truth for `t_ingreso/t_dsctos/t_liquido`. The client-side `calculos.js` is only for live preview in `RecordForm`/`ExcelImport`; whatever totals the client sends are overwritten by the trigger on write.

### Type mapping reference

| config `type` | SQL type | JS coercion |
|---|---|---|
| `dni` | `INTEGER UNIQUE NOT NULL` | `parseInt` |
| `int` | `INTEGER` | `parseInt` |
| `money` | `NUMERIC(12,2)` | `parseFloat` |
| `date` | `DATE` | string / Excel serial → `YYYY-MM-DD` |
| `text` | `TEXT` | string |

### Key dependencies

| Package | Use |
|---|---|
| `@supabase/supabase-js` | Backend client |
| `react-router-dom` | Routing |
| `@tanstack/react-table` | Table rendering |
| `xlsx` | Excel import/export |
| `jspdf` + `jspdf-autotable` | PDF boleta generation |
| `recharts` | Dashboard charts |
| `lucide-react` | Icons |
| `react-hot-toast` | Toast notifications |
| `tailwindcss` | Styling (custom colors: primary `#003366`) |
