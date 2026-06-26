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
  → getPlanillaBySlug()              reads config
  → usePlanillaPaginada(tabla)       server-side pagination: fetches ONE page of 50
                                     rows via .range() + total via { count: 'exact' };
                                     owns page/search/sort state; returns
                                     {filas, total, page, setPage, pageCount, search,
                                      setSearch, sort, setSort, refetch}
  → useRealtime(tabla, cb)           subscribes postgres_changes for THIS table; on any
                                     event debounce-calls refetch (re-reads current page
                                     + count, so list and pagination update live)
  → PlanillaTable                    renders the 50 page rows + <Paginacion>; search and
                                     column sort are controlled and resolved server-side
  → RecordForm                       mutates Supabase (realtime refreshes the page)
  → ExcelActualizarColumna / ExcelExport   lazily fetch ALL rows on demand (bulk ops need
                                     the full dataset, not just the visible page)
```

Pagination is **server-side**: only 50 rows live in memory at a time. `pageCount = Math.ceil(total / 50)`; with 0 workers the table shows an empty state and `<Paginacion>` hides itself (it returns `null` when `pageCount <= 1`). Search (name ILIKE / DNI exact) and column sort are pushed to Supabase and reset to page 1.

Realtime now **refetches the current page** (debounced ~200 ms) instead of mutating local state — required because inserts/deletes change which 50 rows belong on the page and the total page count. The subscription channel is `realtime:<tabla>`, so it only listens to the current planilla's table (each planilla is its own table) and is torn down on unmount or planilla change. Realtime is paused (`enabled=false`) during bulk Excel/recalcular operations.

> **Realtime must be enabled for each planilla table in Supabase** (Database → Replication, or via `_migracion_completa.sql` which adds the tables to the `supabase_realtime` publication with `REPLICA IDENTITY FULL`). The subscription is silently inert if the table isn't in the publication.

### Pages

| Page | Route | Access |
|---|---|---|
| `Login.jsx` | `/login` | Public |
| `Dashboard.jsx` | `/dashboard` | All |
| `PlanillaPage.jsx` | `/planilla/:slug` | All |
| `NuevoRegistro.jsx` | `/nuevo-registro` | editor/admin (`puedeEditar`) |
| `BusquedaGlobal.jsx` | `/buscar` | All |
| `MiPerfil.jsx` | `/perfil` | All |
| `Auditoria.jsx` | `/auditoria` | Admin only |
| `Usuarios.jsx` | `/usuarios` | Admin only |

**Dashboard** shows KPIs, a bar chart (Recharts) of total líquido by group, a summary table per planilla, and a button to generate a consolidated Excel report (`reporteConsolidado.js`).

**NuevoRegistro** is a 3-step wizard (grupo → planilla → datos) that reuses `RecordForm` in `soloBasicos` mode — only **DNI, Apellidos y Nombres, Fecha de Ingreso, S.N.P., Tipo de acto administrativo** are shown, all required. S.N.P. is an ONP/AFP selector (AFP reveals a second select with the 4 AFPs; the full AFP name is stored in `snp`). Gated by `puedeEditar`; relies on `AuthContext.loading` staying true until the profile/role resolves (otherwise a direct URL load would bounce to `/dashboard`).

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
| `PlanillaTable.jsx` | Data table for the current page (50 rows) with controlled server-side sort/search, inline edit, row alerts, PDF boleta download, edit/delete actions; renders `<Paginacion>` |
| `Paginacion.jsx` | Reusable Tailwind pagination control (« Anterior \| 1 … 4 5 6 … 20 \| Siguiente »), current page highlighted, ellipsis for large ranges, prev/next disabled at ends; hidden when ≤1 page |
| `RecordForm.jsx` | Modal to edit a record (or quick-create in `soloBasicos`); live auto-calculates totals. **On edit, ALL non-total fields are required** (forces filling fields left blank during quick-create) — see `esRequerido`; validation runs in JS on submit (the save button sits outside the `<form>`, so native `required` doesn't fire). `soloBasicos` prop (used by `NuevoRegistro`) restricts to DNI/Apellidos/Fecha/S.N.P./Tipo de acto administrativo, makes them required, and renders S.N.P. as an ONP/AFP selector. **The per-planilla page has no create button** — new records are added only from `/nuevo-registro`. |
| `ExcelActualizarColumna.jsx` | Pick one column → upload Excel (DNI + value) → preview (matched/not-found/invalid) → atomic single-column UPDATE by DNI via `actualizar_columna_planilla` RPC; also downloads a fill-in template |
| `ExcelExport.jsx` | Download current rows as `.xlsx` |
| `ConfirmDialog.jsx` | Reusable confirm modal; `danger` prop for red styling |

### Hooks

| Hook | Signature | Returns |
|---|---|---|
| `usePlanillaPaginada` | `usePlanillaPaginada(tabla, { pageSize=50 })` | `{ filas, total, page, setPage, pageCount, pageSize, search, setSearch, sort, setSort, loading, error, refetch }` — server-side paginated page of 50 |
| `usePlanilla` | `usePlanilla(tabla)` | `{ filas, loading, error, refetch, applyChange }` — fetches ALL rows; **superseded by `usePlanillaPaginada` for PlanillaPage**, kept for reference |
| `useRealtime` | `useRealtime(tabla, onPayload, enabled=true)` | — (subscribes to `tabla`'s postgres_changes, cleans up on unmount/table change) |

### Context

`AuthContext.jsx` — provides `{ session, perfil, isAdmin, isEditor, isConsultor, puedeEditar, loading, signOut, refreshPerfil }` via `useAuth()`. `refreshPerfil()` re-fetches the `perfiles` row (used after MiPerfil edits so the Header reflects the new name). **`loading` stays true until the current user's profile (role) has resolved**, not just the session — it tracks `perfilUserId` (the user whose `perfiles` fetch finished) so role-gated pages (e.g. `/nuevo-registro`) don't redirect before the role is known, even on direct URL load or refresh.

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
- Planilla RLS: SELECT → all three roles; INSERT/UPDATE/DELETE → `('editor','administrador')`. The bulk RPCs (`recalcular_totales`, `actualizar_columna_planilla`) check `get_my_rol() IN ('editor','administrador')`.
- `perfiles` row is auto-created on signup via the `handle_new_user` trigger with default role `consultor`. Admin reassigns roles from the `/usuarios` page, or via `UPDATE perfiles SET rol = '<rol>' WHERE id = '<uuid>'`.
- `perfiles` columns: `id`, `nombre`, `celular`, `rol`, `created_at`. Users self-edit `nombre`/`celular` from `/perfil`; the `proteger_rol` BEFORE UPDATE trigger blocks non-admins from changing `rol`.
- The whole schema (including the `editor` role) lives in the single file `supabase/_migracion_completa.sql` — the source of truth for a **fresh install**, into which every schema change is also folded. For changes against a **live DB with data**, apply a targeted, idempotent patch instead of reinstalling (e.g. `supabase/migracion_rename_observaciones.sql`, which renames `observaciones → tipo_acto_administrativo` across the 19 tables via `ALTER TABLE … RENAME COLUMN`).

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
| Operaciones | RPCs atómicas `recalcular_totales(p_tabla)` y `actualizar_columna_planilla(p_tabla, p_columna, p_valores)` (solo admin, whitelist de tablas) |
| DNI único global | `dni_registro` (PK en `dni`) + vista `vw_dni_todos` (`security_invoker`) + trigger `sync_dni_registro` en las 19 tablas |

> El consolidado se generó concatenando los antiguos archivos `01..13`. Si en el
> futuro editas el esquema (p. ej. una columna vía `planillas.js` + `genSql.mjs`),
> integra el nuevo SQL dentro de `_migracion_completa.sql`.

**Totals are computed in the database.** Los triggers de totales son la fuente de
verdad para `t_ingreso/t_dsctos/t_liquido`. El `calculos.js` del cliente es solo
para la vista previa en vivo en `RecordForm`; lo que envíe el
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
