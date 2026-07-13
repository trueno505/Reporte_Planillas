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

Every planilla (pay-roll table) is defined here as an object with `{ slug, tabla, label, titulo?, grupo, columnas[], sinAutoTotales?, excluirCalculo?, areas? }`. `titulo` is the official long title (e.g. "PLANILLA ÚNICA DE PAGO DEL PERSONAL EMPLEADOS PERMANENTES - RÉGIMEN LABORAL D. L. N° 276") printed as the styled header of the Excel exports (falls back to `label`). Each column has `{ key, label, type, required? }` where type is one of `'dni' | 'text' | 'date' | 'int' | 'money'`.

**`areas`** (optional): list of activity names that divide the planilla. 12 planillas have it (the 5 obreros, `empleados-permanentes`, `empleados-contrato-plazo-indet`, `empleados-contrato-provisional`, `empleados-mandato-judicial`, `cas-general`, `gerente-municipal`, `alcalde`); those also carry an `area` column (text, identity). The three `empleados-contrato-*`/`mandato-judicial` planillas only list a single área (`GESTION ADMINISTRATIVA`). Drives: the área `<select>` in RecordForm/NuevoRegistro and CorregirIdentidad, and the server-side área filter in PlanillaPage (`usePlanillaPaginada` → `db.js fetchPagina .eq('area', …)`). In both the RecordForm and CorregirIdentidad `<select>`s the options are sorted alphabetically at render (`localeCompare(…, 'es')`, `areas` stays unsorted in config) and the field is widened so the long activity names are readable (RecordForm: área row spans full width `sm:col-span-2 lg:col-span-3`; CorregirIdentidad modal is `max-w-2xl`).

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
- `getColumnasIdentidad(planilla)` — returns the fixed identity columns (see below) that exist in that planilla
- `esColumnaIdentidad(key)` — true if the column is an identity field (`dni`, `apellidos_y_nombres`, `f_ingreso`/`fecha_ing`, `snp`, `area`, `tipo_acto_administrativo`)
- `GRUPOS` — array of unique group names

### Shared column sets

`CAS_COLS` and `EMPL_PI_COLS` are local constants in `planillas.js` shared by multiple planilla definitions (`cas_general` uses `CAS_COLS`; `empleados_contrato_provisional` mirrors `empleados_contrato_plazo_indet`). Edit those constants to update all affected planillas at once.

### 13 Planillas defined

Groups: Obreros, Empleados, CAS, Pensionistas, Autoridades.

Slugs: `obreros-permanentes`, `obreros-plazo-indeterminado`, `obreros-mandato-judicial`, `obreros-concurso`, `obreros-necesidad-mercado`, `empleados-permanentes`, `empleados-contrato-plazo-indet`, `empleados-contrato-provisional`, `empleados-mandato-judicial`, `cas-general`, `cesantes-pensionistas`, `gerente-municipal`, `alcalde`.

> **CAS**: originalmente había 7 subplanillas CAS; se eliminaron 6 (`cas-choferes`, `cas-i-2025`, `cas-ii-2023`, `cas-ii-2024`, `cas-iii-2025`, `cas-funcional`) dejando solo `cas-general`. Ver `supabase/migracion_eliminar_cas_subplanillas.sql`.

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

**Dashboard** shows KPIs, a bar chart (Recharts) of total líquido by group, a summary table per planilla, and a button to generate a consolidated Excel report (`reporteConsolidado.js`). Clicking it first fetches all data (`cargarDatosConsolidado`), then opens `SiafModal` to ask ONE Nº Siaf per planilla (applied automatically to every área with cuadro presupuestal) before generating.

**NuevoRegistro** is a 3-step wizard (grupo → planilla → datos) that reuses `RecordForm` in `soloBasicos` mode — only **DNI, Apellidos y Nombres, Fecha de Ingreso, S.N.P., Área (select, only in planillas with `areas`), Tipo de acto administrativo** are shown, all required. S.N.P. is an ONP/AFP selector (AFP reveals a second select with the 4 AFPs; the full AFP name is stored in `snp`). Gated by `puedeEditar`; relies on `AuthContext.loading` staying true until the profile/role resolves (otherwise a direct URL load would bounce to `/dashboard`).

**BusquedaGlobal** searches all 13 planillas by DNI (exact) or name (ILIKE) via the `buscar_trabajador(termino, p_periodo)` RPC, for the month/year picked in the `<input type="month">`. Each result row has an **Imprimir** (boleta PDF) button: since the search RPC returns only DNI, name and `t_liquido`, the button first fetches the **full row** from that worker's own table (`getPlanillaByTabla(tabla)` → `supabase.from(tabla).select('*').eq('dni', …).eq('periodo', …).single()`) and then calls `generarBoletaPdf(planilla, fila)` — so the boleta can be printed without navigating to the planilla. A per-row spinner (`boletaCargando` keyed by `tabla-dni`) disables that button while it loads; errors surface via `react-hot-toast`.

**Auditoria** shows the change log from `public.auditoria` with filters by table and action (INSERT/UPDATE/DELETE/GENERACION), joined with `perfiles`. **GENERACION** marks the rows cloned by "Generar mes siguiente", distinguishing them from manual creates: `abrir_periodo` sets the transaction GUC `app.generando_mes = '1'` and the `registrar_auditoria` trigger records those INSERTs as `GENERACION` (patch `supabase/migracion_auditoria_generacion.sql`, folded into `_migracion_completa.sql`).

**Usuarios** allows admins to (a) **create accounts in-app** via a "Nuevo usuario" modal — nombre, email, rol, and an admin-set initial password — (b) assign each user one of the three roles (`consultor`, `editor`, `administrador`) via a dropdown, (c) **reset any user's password** via a "Contraseña" button per row (modal with generate/show controls), and (d) **deactivate / reactivate** any account via a per-row toggle (an **Estado** column shows Activa/Desactivada). **Accounts are never deleted** — deactivating bans the user (cannot log in) while keeping its profile and audit trail; reactivating restores access. Admins cannot change their own role nor deactivate their own account (guards against lock-out). Account creation calls the `crear-usuario` Edge Function; password-reset, listing and (de)activation call the `admin-usuarios` Edge Function (`accion: 'listar' | 'cambiar_password' | 'desactivar' | 'activar'`) — both via `supabase.functions.invoke` and both verify the caller is `administrador` server-side with the service-role key. The user is created already confirmed (`email_confirm: true`) so it can log in immediately, and can later change its password from `/perfil`. (Inviting from the Supabase panel still works as a fallback and lands the profile here as `consultor`.)

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
| `RecordForm.jsx` | Modal to edit a record (or quick-create in `soloBasicos`); live auto-calculates totals. **On edit, ALL non-total fields are required** (forces filling fields left blank during quick-create) — see `esRequerido`; validation runs in JS on submit (the save button sits outside the `<form>`, so native `required` doesn't fire). `soloBasicos` prop (used by `NuevoRegistro`) restricts to DNI, Apellidos y Nombres, the **date column(s)** (`type === 'date'`, typically F. Ingreso), S.N.P., Área and Tipo de acto administrativo, makes them required, renders S.N.P. as an ONP/AFP selector and Área as a `<select>` from `planilla.areas` (also on normal create; read-only identity on edit). **The per-planilla page has no create button** — new records are added only from `/nuevo-registro`. |
| `ExcelActualizarColumna.jsx` | Pick one column → upload Excel (DNI + value) → preview (matched/not-found/invalid) → atomic single-column UPDATE by DNI via `actualizar_columna_planilla` RPC; also downloads a fill-in template |
| `ExcelExport.jsx` | Download current rows as `.xlsx`, with a styled institutional header (membrete + planilla `titulo` + month + RUC) built by `lib/excelEncabezado.js` using `xlsx-js-style`. Before downloading, if the planilla has cuadros presupuestales configured (`config/cuadrosPresupuestales.js`), a modal asks ONE **Nº Siaf** for the planilla (blank allowed) and applies it to every área present in the month's data, passed as `siafPorArea` |
| `ConfirmDialog.jsx` | Reusable confirm modal; `danger` prop for red styling |
| `SiafModal.jsx` | Reusable modal that asks ONE Nº Siaf per planilla before an Excel download and applies it to all its áreas; `grupos` = `[{ id, label, areas }]` (one group per planilla, área `'*'` = whole planilla), `onConfirm(valores)` returns `{ [id]: { [area]: siaf } }` with the same value replicated across each group's áreas. The input accepts **digits only** (non-numeric characters are stripped on change; `inputMode="numeric"` shows the numeric keyboard on mobile). Used by `ExcelExport` (single planilla → one input) and `Dashboard` (consolidated → one input per planilla) |
| `PeriodoSelector.jsx` | Month/period selector dropdown (populated from `periodos_planilla`); used by `PlanillaPage` to switch between historical months |
| `CorregirIdentidad.jsx` | Modal that corrects the fixed identity fields (Apellidos y Nombres, Fecha, S.N.P., Área — select when the planilla has `areas` —, Tipo de acto) across **all** months of a worker via the `corregir_identidad` RPC |

### Hooks

| Hook | Signature | Returns |
|---|---|---|
| `usePlanillaPaginada` | `usePlanillaPaginada(tabla, { pageSize=50 })` | `{ filas, total, page, setPage, pageCount, pageSize, search, setSearch, sort, setSort, loading, error, refetch }` — server-side paginated page of 50 |
| `usePlanilla` | `usePlanilla(tabla)` | `{ filas, loading, error, refetch, applyChange }` — fetches ALL rows; **superseded by `usePlanillaPaginada` for PlanillaPage**, kept for reference |
| `useRealtime` | `useRealtime(tabla, onPayload, enabled=true)` | — (subscribes to `tabla`'s postgres_changes, cleans up on unmount/table change) |

### Context

The context is split into two files for React Fast Refresh compatibility: `context/auth-context.js` defines the `AuthContext` object and the `useAuth()` hook, and `context/AuthContext.jsx` is the `AuthProvider` component. The provider provides `{ session, perfil, isAdmin, isEditor, isConsultor, puedeEditar, loading, signOut, refreshPerfil }` via `useAuth()`. `refreshPerfil()` re-fetches the `perfiles` row (used after MiPerfil edits so the Header reflects the new name). **`loading` stays true until the current user's profile (role) has resolved**, not just the session — it tracks `perfilUserId` (the user whose `perfiles` fetch finished) so role-gated pages (e.g. `/nuevo-registro`) don't redirect before the role is known, even on direct URL load or refresh.

### Utility libraries (`src/lib/`)

| File | Purpose |
|---|---|
| `supabaseClient.js` | Initializes Supabase client from env vars |
| `calculos.js` | `calcularTotales(planilla, fila)`, `recalcularFilas(planilla, filas)` |
| `alertas.js` | `detectarAlertas(planilla, fila)` — detects LIQUIDO_NEGATIVO, TOTAL_DESCUADRADO, FALTAS_EXCESIVAS |
| `boletaPdf.js` | `generarBoletaPdf(planilla, fila)` — generates and downloads individual pay-slip PDF |
| `reporteConsolidado.js` | `cargarDatosConsolidado(periodo)` — fetches all rows of every planilla and lists, per planilla, the áreas with cuadro presupuestal (key `'*'` for planillas without áreas); `generarReporteConsolidado(resumenData, periodo, datos, siafPorPlanilla)` — multi-sheet Excel (each planilla sheet uses `excelEncabezado.js` for its styled header/title), `siafPorPlanilla` = `{ [slug]: { [area]: siaf } }` fills the Nº Siaf of each cuadro |
| `excelEncabezado.js` | `construirHojaPlanilla(planilla, filas, periodo, siafPorArea)` — builds a styled worksheet (institutional membrete, planilla `titulo`, month in magenta, RUC, column labels + data) via `xlsx-js-style`. For planillas **with `areas`**, rows are grouped by área (alphabetical) and the per-row `area` column is **excluded from the sheet** (redundant with the band): each área gets a band row `ÁREA: <nombre>`, its worker rows, a `SUBTOTAL <área>` row (sums every money column), and a per-área block (`escribirBloqueArea`) with three side-by-side sections: **RESÚMEN** (ingresos by concept + TOTAL INGRESOS, then, slightly separated, `A ESSALUD (IPSS) (CAJA DE ENFERM. Y MATERNIDAD)` = 9% of total ingresos rounded to 2 decimals, + TOTAL), **COMPROBACIÓN** (TOTAL LÍQUIDO + RETENCIONES by concept + CUOTA PATRONAL, which must equal the RESÚMEN total), and the **cuadro presupuestal** of the área (fixed data from `config/cuadrosPresupuestales.js`; the Nº Siaf comes from `siafPorArea`, montos/fecha cells stay blank). Planillas without áreas (Cesantes) get a TOTAL GENERAL row + a single global block (siaf key `'*'`). `construirHojaResumenAreas(planilla, filas, periodo)` — the global "Resumen por áreas" sheet: one row per área with **every money column** of the planilla (each concept + totals) + N° trab, and a TOTAL GENERAL row summing each column (null if the planilla has no áreas). Both shared by `ExcelExport` (which appends the resumen sheet) and `reporteConsolidado` (per-planilla sheets only, no extra global sheet); both ask one Nº Siaf per planilla via `SiafModal` (replicated to every área) before downloading. Note: `xlsx-js-style` is used only for these styled writers; plain `xlsx` (0.20.3) is still used by `ExcelActualizarColumna` for reading uploads/templates |

### Roles and security

- Three roles, stored in `public.perfiles.rol` (`CHECK (rol IN ('consultor','editor','administrador'))`):
  - `consultor` — SELECT + export + boleta PDF (read-only).
  - `editor` — everything consultor can, plus full CRUD on planilla data and bulk Excel ops (import / update-column / delete / recalcular). **Cannot** manage users or view auditoría.
  - `administrador` — full control: data + user management (`/usuarios`) + auditoría (`/auditoria`).
- Role is read by the Supabase RLS function `get_my_rol()` (SECURITY DEFINER). RLS is the real enforcement; the UI only hides controls.
- `AuthContext` exposes `isAdmin`, `isEditor`, `isConsultor` and the derived **`puedeEditar`** (= admin || editor). Use `puedeEditar` to gate data-editing UI and `isAdmin` to gate user/auditoría UI.
- Planilla RLS: SELECT → all three roles; INSERT/UPDATE/DELETE → `('editor','administrador')`. The bulk RPCs (`recalcular_totales`, `actualizar_columna_planilla`) check `get_my_rol() IN ('editor','administrador')`.
- `perfiles` row is auto-created on signup via the `handle_new_user` trigger with default role `consultor`. Admin reassigns roles from the `/usuarios` page, or via `UPDATE perfiles SET rol = '<rol>' WHERE id = '<uuid>'`.
- **Creating users from the app** is done by the `crear-usuario` Edge Function (`supabase/functions/crear-usuario/index.ts`). It needs the **service_role key** (Admin API `auth.admin.createUser`), which can never live in the frontend — that's the whole reason it's an Edge Function. The function: ① reads the caller's JWT, ② confirms the caller's `perfiles.rol = 'administrador'` (using a service-role client), ③ creates the user `email_confirm: true`, ④ upserts `nombre` + `rol` into `perfiles`. Deploy with `npx supabase functions deploy crear-usuario --project-ref <ref>`. `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically into the function runtime — no secrets are copied into the repo or Vercel.
- **Resetting passwords, (de)activating accounts, and listing emails/status from the app** is done by the `admin-usuarios` Edge Function (`supabase/functions/admin-usuarios/index.ts`) — the sibling of `crear-usuario`, sharing the same admin-verification boilerplate. It dispatches on `accion`: `'listar'` (no args → `auth.admin.listUsers`, paginated, returns `[{ id, email, banned_until }]`), `'cambiar_password'` (`{ userId, password }` → `auth.admin.updateUserById`), `'desactivar'` (`{ userId }` → `updateUserById` with `ban_duration: '876000h'`; refuses to ban the caller's own account), and `'activar'` (`{ userId }` → `ban_duration: 'none'`). **No delete action** — accounts are banned, not removed. Deploy with `npx supabase functions deploy admin-usuarios --project-ref <ref>`. The `/usuarios` list shows each user's **Correo** and **Estado** (Activa/Desactivada, derived from `banned_until`) by merging the `'listar'` result into the `perfiles` rows by `id`.
- `perfiles` columns: `id`, `nombre`, `celular`, `rol`, `created_at`. Users self-edit `nombre`/`celular` from `/perfil`; the `proteger_rol` BEFORE UPDATE trigger blocks non-admins from changing `rol`.
- The whole schema (including the `editor` role) lives in the single file `supabase/_migracion_completa.sql` — the source of truth for a **fresh install**, into which every schema change is also folded. For changes against a **live DB with data**, apply a targeted, idempotent patch instead of reinstalling (e.g. `supabase/migracion_rename_observaciones.sql`, which renames `observaciones → tipo_acto_administrativo` across the 13 tables via `ALTER TABLE … RENAME COLUMN`).

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
| 13 planillas | tablas (generadas desde `planillas.js`; `dni INTEGER UNIQUE NOT NULL`) |
| RLS | `get_my_rol()` + políticas (envueltas en `(select …)` por rendimiento) |
| Realtime | habilita Realtime + `REPLICA IDENTITY FULL` en las 13 tablas |
| `auditoria` | tabla (`usuario_id` FK → `public.perfiles.id` para poder embeber `perfiles(nombre)`) + trigger en las 13 tablas |
| Funciones | RPCs `resumen_planillas()` y `buscar_trabajador(termino)` |
| Admin | políticas extra para que el admin gestione todos los `perfiles` |
| Totales | triggers BEFORE INSERT/UPDATE que calculan `t_ingreso/t_dsctos/t_liquido` (13 planillas — todas las que tienen columnas `t_*`) |
| Índices | GIN trigram sobre `apellidos_y_nombres` para búsqueda por nombre |
| Operaciones | RPCs atómicas `recalcular_totales(p_tabla)` y `actualizar_columna_planilla(p_tabla, p_columna, p_valores)` (solo admin, whitelist de tablas) |
| DNI único global | `dni_registro` (PK en `dni`) + vista `vw_dni_todos` (`security_invoker`) + trigger `sync_dni_registro` en las 13 tablas |

> El consolidado se generó concatenando los antiguos archivos `01..13`. Si en el
> futuro editas el esquema (p. ej. una columna vía `planillas.js` + `genSql.mjs`),
> integra el nuevo SQL dentro de `_migracion_completa.sql`.

**Totals are computed in the database.** Los triggers de totales son la fuente de
verdad para `t_ingreso/t_dsctos/t_liquido`. El `calculos.js` del cliente es solo
para la vista previa en vivo en `RecordForm`; lo que envíe el
cliente es sobrescrito por el trigger al escribir.

### Historización mensual (`periodo`)

Cada planilla es un **histórico mensual**: una fila por `(dni, periodo)`, donde
`periodo DATE` = primer día del mes. Los datos **no se sobrescriben** mes a mes.

- **Columna `periodo`** en las 13 tablas (`DATE NOT NULL DEFAULT date_trunc('month', now())`),
  con `UNIQUE (dni, periodo)` (reemplaza la antigua `dni UNIQUE`) e índice `idx_<tabla>_periodo`.
  El histórico arranca en **junio 2026** (las filas previas se backfillearon a `2026-06-01`).
- **Identidad fija**: al generar un mes, se copian `dni` + las que existan de
  `{apellidos_y_nombres, f_ingreso/fecha_ing, snp, area, tipo_acto_administrativo}`; el resto de
  columnas (montos, faltas, cargo…) quedan en blanco. En el front, `getColumnasIdentidad(planilla)`
  (en `planillas.js`) devuelve esas columnas; `RecordForm` las muestra **solo lectura** al editar.
- **Mes abierto vs cerrado**: el mes editable es `MAX(periodo)` de cada tabla; los anteriores son
  **solo lectura**, impuesto por el trigger `proteger_periodo_cerrado` (BEFORE I/U/D en las 13
  tablas). Se salta con el GUC de sesión `app.bypass_periodo='1'` (lo usa solo `corregir_identidad`).
- **DNI único por periodo**: `dni_registro` pasa a PK `(dni, periodo)`; `vw_dni_todos` y
  `sync_dni_registro` incluyen `periodo` (un DNI no puede estar en dos planillas el **mismo mes**).
- **RPCs** (todas reciben/filtran por mes): `resumen_planillas(p_periodo)`,
  `buscar_trabajador(termino, p_periodo)`, `recalcular_totales(p_tabla, p_periodo)`,
  `actualizar_columna_planilla(p_tabla, p_periodo, p_columna, p_valores)`. Nuevas:
  `abrir_periodo(p_tabla, p_periodo)` (genera el mes clonando identidad; admin/editor; **solo
  permite el mes inmediatamente siguiente** al último existente, `MAX(periodo) + 1 mes` —
  rechaza saltos como julio→diciembre incluso si se llama al RPC directamente; las filas
  clonadas se auditan como `GENERACION`, no como `INSERT`),
  `periodos_planilla(p_tabla)` (lista de meses para el selector), `corregir_identidad(p_tabla,
  p_dni, p_datos)` (corrige los campos fijos —incluida `area`— en **todos** los meses, vía el bypass).
- **Frontend**: `src/lib/periodo.js` (helpers `formatPeriodo`/`periodoActual`/`siguientePeriodo`/`aPrimerDiaMes`),
  `PeriodoSelector.jsx`, y `periodo` enhebrado por `usePlanillaPaginada` → `db.js`
  (`fetchPagina`/`fetchAllRows` filtran `.eq('periodo', …)`). `PlanillaPage` tiene el selector de
  mes, banner de solo-lectura y botón **"Generar mes siguiente"** (`abrir_periodo`). `Dashboard` y
  `BusquedaGlobal` usan un `<input type="month">` para consultar meses/años anteriores. `CorregirIdentidad.jsx`
  es el modal de corrección de datos fijos. `boletaPdf`/`ExcelExport`/`reporteConsolidado` reflejan el mes.
- **SQL**: el parche idempotente para BD viva es `supabase/migracion_historico_periodo.sql`; el mismo
  bloque está integrado al final de `_migracion_completa.sql` y `genSql.mjs` ya genera las tablas con
  `periodo` + `UNIQUE (dni, periodo)`.

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
