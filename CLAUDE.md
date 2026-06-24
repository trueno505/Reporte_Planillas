# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server (localhost:5173)
npm run build      # Production build
npm run lint       # ESLint check
npm run preview    # Serve the production build locally

node scripts/genSql.mjs   # Regenerate the planilla table/totals/index SQL from planillas.js. NOTE: el esquema vive ahora en un único archivo supabase/_migracion_completa.sql; el script recrea archivos sueltos 03/09/10 que debes fusionar en el consolidado y luego borrar.
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

**Adding or renaming a column** = edit `planillas.js`, run `node scripts/genSql.mjs` to regenerate the table SQL, fold the change into `supabase/_migracion_completa.sql`, and run it in the Supabase SQL Editor.

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
| `MiPerfil.jsx` | `/perfil` | All |
| `Auditoria.jsx` | `/auditoria` | Admin only |
| `Usuarios.jsx` | `/usuarios` | Admin only |

**Dashboard** shows KPIs, a bar chart (Recharts) of total líquido by group, a summary table per planilla, and a button to generate a consolidated Excel report (`reporteConsolidado.js`).

**BusquedaGlobal** searches all 19 planillas by DNI (exact) or name (ILIKE) via the `buscar_trabajador(termino)` RPC.

**Auditoria** shows the change log from `public.auditoria` with filters by table and action (INSERT/UPDATE/DELETE), joined with `perfiles`.

**Usuarios** allows admins to assign each user one of the three roles (`consultor`, `editor`, `administrador`) via a dropdown. Admins cannot change their own role (guards against lock-out). Account creation is done by inviting from the Supabase panel (Authentication → Invite); the new profile appears here as `consultor` and the admin reassigns it.

**MiPerfil** is each user's self-service page (any role): shows email + role (read-only), lets them edit their own `nombre` and `celular` (`perfiles` row), and change their own password via `supabase.auth.updateUser({ password })`. Users **cannot** change their own `rol` — the DB trigger `proteger_rol` reverts any role change made by a non-admin (defense against privilege escalation, since the `perfiles_update` RLS policy allows self-update of the row).

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
| `ExcelActualizarColumna.jsx` | Pick one column → upload Excel (DNI + value) → preview (matched/not-found/invalid) → atomic single-column UPDATE by DNI via `actualizar_columna_planilla` RPC; also downloads a fill-in template |
| `ExcelExport.jsx` | Download current rows as `.xlsx` |
| `ExcelDelete.jsx` | Upload Excel with DNIs → confirm → bulk DELETE |
| `ConfirmDialog.jsx` | Reusable confirm modal; `danger` prop for red styling |

### Hooks

| Hook | Signature | Returns |
|---|---|---|
| `usePlanilla` | `usePlanilla(tabla)` | `{ filas, loading, error, refetch, applyChange }` |
| `useRealtime` | `useRealtime(tabla, onPayload)` | — (sets up subscription, cleans up on unmount) |

### Context

`AuthContext.jsx` — provides `{ session, perfil, isAdmin, isEditor, isConsultor, puedeEditar, loading, signOut, refreshPerfil }` via `useAuth()`. `refreshPerfil()` re-fetches the `perfiles` row (used after MiPerfil edits so the Header reflects the new name).

### Utility libraries (`src/lib/`)

| File | Purpose |
|---|---|
| `supabaseClient.js` | Initializes Supabase client from env vars |
| `calculos.js` | `calcularTotales(planilla, fila)`, `recalcularFilas(planilla, filas)` |
| `alertas.js` | `detectarAlertas(planilla, fila)` — detects LIQUIDO_NEGATIVO, TOTAL_DESCUADRADO, FALTAS_EXCESIVAS |
| `boletaPdf.js` | `generarBoletaPdf(planilla, fila)` — generates and downloads individual pay-slip PDF |
| `reporteConsolidado.js` | `generarReporteConsolidado(resumenData)` — multi-sheet Excel; `descargarPlantilla(planilla)` — blank template |

### Roles and security

- Three roles, stored in `public.perfiles.rol` (`CHECK (rol IN ('consultor','editor','administrador'))`):
  - `consultor` — SELECT + export + boleta PDF (read-only).
  - `editor` — everything consultor can, plus full CRUD on planilla data and bulk Excel ops (import / update-column / delete / recalcular). **Cannot** manage users or view auditoría.
  - `administrador` — full control: data + user management (`/usuarios`) + auditoría (`/auditoria`).
- Role is read by the Supabase RLS function `get_my_rol()` (SECURITY DEFINER). RLS is the real enforcement; the UI only hides controls.
- `AuthContext` exposes `isAdmin`, `isEditor`, `isConsultor` and the derived **`puedeEditar`** (= admin || editor). Use `puedeEditar` to gate data-editing UI and `isAdmin` to gate user/auditoría UI.
- Planilla RLS: SELECT → all three roles; INSERT/UPDATE/DELETE → `('editor','administrador')`. The bulk RPCs (`importar_planilla`, `recalcular_totales`, `actualizar_columna_planilla`) check `get_my_rol() IN ('editor','administrador')`.
- `perfiles` row is auto-created on signup via the `handle_new_user` trigger with default role `consultor`. Admin reassigns roles from the `/usuarios` page, or via `UPDATE perfiles SET rol = '<rol>' WHERE id = '<uuid>'`.
- `perfiles` columns: `id`, `nombre`, `celular`, `rol`, `created_at`. Users self-edit `nombre`/`celular` from `/perfil`; the `proteger_rol` BEFORE UPDATE trigger blocks non-admins from changing `rol`.
- The whole schema (including the `editor` role) lives in the single file `supabase/_migracion_completa.sql`. There are no standalone patch files; any schema change is folded into this consolidated file.

### Database setup — un solo archivo

Todo el esquema está consolidado en **`supabase/_migracion_completa.sql`**. Para
instalar (o reinstalar) la base de datos, pega ese archivo completo en el
**SQL Editor de Supabase** y ejecútalo una sola vez. Es la única fuente de SQL
del proyecto; ya no se mantienen archivos sueltos por número.

El consolidado contiene, en orden:

| Bloque | Contenido |
|---|---|
| Extensiones | `moddatetime` y `pg_trgm` |
| `perfiles` | tabla + trigger `handle_new_user` |
| 19 planillas | tablas (generadas desde `planillas.js`; `dni INTEGER UNIQUE NOT NULL`) |
| RLS | `get_my_rol()` + políticas (envueltas en `(select …)` por rendimiento) |
| Realtime | habilita Realtime + `REPLICA IDENTITY FULL` en las 19 tablas |
| `auditoria` | tabla (`usuario_id` FK → `public.perfiles.id` para poder embeber `perfiles(nombre)`) + trigger en las 19 tablas |
| Funciones | RPCs `resumen_planillas()` y `buscar_trabajador(termino)` |
| Admin | políticas extra para que el admin gestione todos los `perfiles` |
| Totales | triggers BEFORE INSERT/UPDATE que calculan `t_ingreso/t_dsctos/t_liquido` (18 planillas — no `obreros_necesidad_mercado`) |
| Índices | GIN trigram sobre `apellidos_y_nombres` para búsqueda por nombre |
| Operaciones | RPCs atómicas `importar_planilla(p_tabla, p_filas)`, `recalcular_totales(p_tabla)` y `actualizar_columna_planilla(p_tabla, p_columna, p_valores)` (solo admin, whitelist de tablas) |
| DNI único global | `dni_registro` (PK en `dni`) + vista `vw_dni_todos` (`security_invoker`) + trigger `sync_dni_registro` en las 19 tablas |

> El consolidado se generó concatenando los antiguos archivos `01..13`. Si en el
> futuro editas el esquema (p. ej. una columna vía `planillas.js` + `genSql.mjs`),
> integra el nuevo SQL dentro de `_migracion_completa.sql`.

**Totals are computed in the database.** Los triggers de totales son la fuente de
verdad para `t_ingreso/t_dsctos/t_liquido`. El `calculos.js` del cliente es solo
para la vista previa en vivo en `RecordForm`/`ExcelImport`; lo que envíe el
cliente es sobrescrito por el trigger al escribir.

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
