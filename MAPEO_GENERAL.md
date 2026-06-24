# Mapeo General — Reporte de Planillas (MPI)

> Documento de referencia que explica **todo lo que está creado e implementado** en el
> proyecto. Generado a partir de una revisión completa del código fuente.
> **Última revisión:** 2026-06-24

---

## 1. ¿Qué es este proyecto?

Sistema web para la **Municipalidad Provincial de Ica (MPI)** que centraliza, consulta
y gestiona **19 planillas de pago** (remuneraciones) de distintos regímenes laborales
(Obreros, Empleados, CAS, Pensionistas y Autoridades).

Permite:
- Ver cada planilla en una tabla con búsqueda, orden, paginación y edición en línea.
- Crear / editar / eliminar registros con **cálculo automático de totales**.
- Importar y exportar datos en **Excel**, y eliminar masivamente por Excel.
- Generar **boletas de pago en PDF** por trabajador y un **reporte consolidado** en Excel.
- Buscar a un trabajador por DNI o nombre en **las 19 planillas a la vez**.
- Un **dashboard** con KPIs y gráficos.
- **Edición de datos** disponible para administradores y **editores**; los **consultores** solo leen/exportan.
- **Auditoría** de cambios y **gestión de usuarios/roles** (solo administradores).
- Actualizaciones en **tiempo real** (Supabase Realtime) entre usuarios conectados.

---

## 2. Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | **React 19** + **Vite 8** |
| Ruteo | **react-router-dom 7** |
| Estilos | **Tailwind CSS 3** (color institucional `primary #003366`) |
| Tablas | **@tanstack/react-table 8** |
| Excel | **xlsx (SheetJS)** |
| PDF | **jspdf** + **jspdf-autotable** |
| Gráficos | **recharts** |
| Iconos | **lucide-react** |
| Notificaciones | **react-hot-toast** |
| Backend / BD | **Supabase** (PostgreSQL + Auth + Realtime + RLS + RPC) |

### Comandos
```bash
npm run dev        # Servidor de desarrollo (localhost:5173)
npm run build      # Build de producción → dist/
npm run lint       # ESLint
npm run preview    # Sirve el build de producción

node scripts/genSql.mjs   # Regenera el SQL de tablas/totales/índices desde la config
                          # (su salida se integra en supabase/_migracion_completa.sql)
```

### Variables de entorno (`.env`)
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

> ⚠️ **Nota sobre la estructura de carpetas:** el proyecto real vive dentro de un
> subdirectorio anidado: `…/Reporte_Planillas/Reporte_Planillas/`. La carpeta interna
> es la que contiene `package.json`, `src/`, `supabase/`, etc. (la externa solo
> envuelve al proyecto).

---

## 3. Arquitectura: una sola fuente de verdad

El corazón del sistema es **`src/config/planillas.js`**. Allí se define **cada planilla**
como un objeto:

```js
{
  slug,            // identificador para la URL (ej. 'cas-general')
  tabla,           // nombre de la tabla en PostgreSQL
  label,           // nombre visible (ej. 'CAS General')
  grupo,           // Obreros | Empleados | CAS | Pensionistas | Autoridades
  columnas: [ { key, label, type, required? } ],
  sinAutoTotales?, // true → totales manuales (sin auto-cálculo)
  excluirCalculo?, // claves a ignorar en el auto-cálculo
}
```

Cada columna tiene un **tipo** que determina su comportamiento en toda la app:

| `type` | Tipo SQL | Coerción JS | Comportamiento |
|---|---|---|---|
| `dni` | `INTEGER UNIQUE NOT NULL` | `parseInt` | Clave única del trabajador |
| `int` | `INTEGER` | `parseInt` | Entero (faltas, días) |
| `money` | `NUMERIC(12,2)` | `parseFloat` | Importe en soles |
| `date` | `DATE` | string / serial Excel → `YYYY-MM-DD` | Fecha |
| `text` | `TEXT` | string | Texto libre |

**Ese mismo objeto de configuración alimenta a:**
- La **generación del SQL** de tablas (`scripts/genSql.mjs`).
- El renderizado, formato y alertas de la tabla (`PlanillaTable`).
- Los tipos de input, validación y auto-cálculo del formulario (`RecordForm`).
- El orden de cabeceras al exportar a Excel (`ExcelExport`).
- El mapeo cabecera→clave al importar Excel (`ExcelImport`).
- El diseño de la boleta PDF (`boletaPdf.js`).
- El cálculo de totales (`calculos.js`).

> **Para agregar o renombrar una columna:** editar `planillas.js` → ejecutar
> `node scripts/genSql.mjs` → correr el SQL generado en el editor SQL de Supabase.

### Conjuntos de columnas compartidos
- **`CAS_COLS`** — usado por las 7 planillas CAS (todas comparten columnas idénticas).
- **`EMPL_PI_COLS`** — compartido por `empleados-contrato-plazo-indet` y
  `empleados-contrato-provisional`.

Editar esas constantes actualiza todas las planillas afectadas a la vez.

### Helpers exportados de `planillas.js`
- `getPlanillaBySlug(slug)` — busca por slug de URL.
- `getPlanillaByTabla(tabla)` — busca por nombre de tabla.
- `getSeccionesCalculo(planilla)` — clasifica las columnas `money` en ingresos /
  descuentos / totales según su **posición**:
  - `money` **antes** de `t_ingreso` → **ingresos** (se suman → `t_ingreso`)
  - `money` **entre** `t_ingreso` y `t_dsctos` → **descuentos** (se suman → `t_dsctos`)
  - `t_liquido = t_ingreso − t_dsctos`
- `GRUPOS` — lista de grupos únicos.

---

## 4. Las 19 planillas

| Grupo | Planilla | slug | tabla |
|---|---|---|---|
| Obreros | Obreros Permanentes | `obreros-permanentes` | `obreros_permanentes` |
| Obreros | Obreros Plazo Indeterminado | `obreros-plazo-indeterminado` | `obreros_plazo_indeterminado` |
| Obreros | Obreros Mandato Judicial | `obreros-mandato-judicial` | `obreros_mandato_judicial` |
| Obreros | Obreros Concurso | `obreros-concurso` | `obreros_concurso` |
| Obreros | Obreros Necesidad de Mercado* | `obreros-necesidad-mercado` | `obreros_necesidad_mercado` |
| Empleados | Empleados Permanentes | `empleados-permanentes` | `empleados_permanentes` |
| Empleados | Empleados Contrato Plazo Indeterminado | `empleados-contrato-plazo-indet` | `empleados_contrato_plazo_indet` |
| Empleados | Empleados Contrato Provisional | `empleados-contrato-provisional` | `empleados_contrato_provisional` |
| Empleados | Empleados Mandato Judicial (24041) | `empleados-mandato-judicial` | `empleados_mandato_judicial_24041` |
| CAS | CAS General | `cas-general` | `cas_general` |
| CAS | CAS Choferes | `cas-choferes` | `cas_choferes` |
| CAS | CAS I 2025 | `cas-i-2025` | `cas_i_2025` |
| CAS | CAS II 2023 | `cas-ii-2023` | `cas_ii_2023` |
| CAS | CAS II 2024 | `cas-ii-2024` | `cas_ii_2024` |
| CAS | CAS III 2025 | `cas-iii-2025` | `cas_iii_2025` |
| CAS | CAS Funcional | `cas-funcional` | `cas_funcional` |
| Pensionistas | Cesantes y Pensionistas | `cesantes-pensionistas` | `cesantes_pensionistas` |
| Autoridades | Gerente Municipal | `gerente-municipal` | `gerente_municipal` |
| Autoridades | Alcalde** | `alcalde` | `alcalde` |

\* `obreros-necesidad-mercado` tiene `sinAutoTotales: true` → los totales se ingresan a mano.
\** `alcalde` usa `excluirCalculo: ['base']` porque la columna `base` no es un descuento.

---

## 5. Estructura de archivos

```
Reporte_Planillas/
├── index.html                 Punto de entrada HTML
├── package.json               Dependencias y scripts
├── vite.config.js             Configuración de Vite
├── tailwind.config.js         Tema (color primary #003366, surface, etc.)
├── postcss.config.js          Tailwind + autoprefixer
├── eslint.config.js           Reglas de lint
├── CLAUDE.md                  Guía de arquitectura para asistentes IA
├── .env                       Credenciales Supabase (no versionar)
│
├── scripts/
│   └── genSql.mjs             Genera el SQL de tablas/totales/índices desde planillas.js
│                              (su salida se integra a mano en _migracion_completa.sql)
│
├── public/                    favicon.svg, icons.svg
│
├── src/
│   ├── main.jsx               Bootstrap de React
│   ├── App.jsx                Define rutas + AuthProvider + Toaster
│   ├── index.css / App.css    Estilos globales
│   │
│   ├── config/
│   │   └── planillas.js       ★ FUENTE ÚNICA DE VERDAD (19 planillas)
│   │
│   ├── context/
│   │   └── AuthContext.jsx    Sesión, perfil y rol del usuario
│   │
│   ├── hooks/
│   │   ├── usePlanilla.js     Carga inicial + estado local de filas
│   │   └── useRealtime.js     Suscripción a cambios en tiempo real
│   │
│   ├── lib/
│   │   ├── supabaseClient.js  Inicializa el cliente Supabase
│   │   ├── calculos.js        Cálculo de totales (ingreso/dscto/líquido)
│   │   ├── alertas.js         Detección de alertas por fila
│   │   ├── boletaPdf.js       Boleta de pago individual en PDF
│   │   └── reporteConsolidado.js  Excel consolidado + plantilla vacía
│   │
│   ├── components/
│   │   ├── Layout.jsx         Shell: Sidebar + Header + contenido
│   │   ├── Header.jsx         Barra superior (usuario, rol, logout)
│   │   ├── Sidebar.jsx        Navegación agrupada por grupo
│   │   ├── ProtectedRoute.jsx Redirige a /login si no hay sesión
│   │   ├── PlanillaTable.jsx  Tabla de datos (orden/filtro/edición/PDF)
│   │   ├── RecordForm.jsx     Modal crear/editar con auto-cálculo
│   │   ├── ExcelImport.jsx    Importar Excel (preview + UPSERT) + plantilla
│   │   ├── ExcelExport.jsx    Exportar filas actuales a .xlsx
│   │   ├── ExcelDelete.jsx    Eliminar masivamente por DNI desde Excel
│   │   └── ConfirmDialog.jsx  Modal de confirmación reutilizable
│   │
│   └── pages/
│       ├── Login.jsx          Inicio de sesión (email/contraseña)
│       ├── Dashboard.jsx      KPIs, gráfico, resumen, tarjetas por grupo
│       ├── PlanillaPage.jsx   Página de una planilla (orquesta todo)
│       ├── BusquedaGlobal.jsx Búsqueda en las 19 planillas
│       ├── Auditoria.jsx      Historial de cambios (admin)
│       └── Usuarios.jsx       Gestión de roles (admin)
│
├── supabase/                  Esquema SQL — UN SOLO ARCHIVO
│   └── _migracion_completa.sql  Todo el esquema (tablas, RLS, realtime,
│                                auditoría, funciones, totales, índices,
│                                operaciones, 3 roles). Correr una vez en
│                                el SQL Editor de Supabase.
│
└── dist/                      Build de producción (generado)
```

---

## 6. Rutas y control de acceso

| Página | Ruta | Acceso |
|---|---|---|
| `Login` | `/login` | Público |
| `Dashboard` | `/dashboard` | Cualquier usuario autenticado |
| `PlanillaPage` | `/planilla/:slug` | Cualquier usuario autenticado |
| `BusquedaGlobal` | `/buscar` | Cualquier usuario autenticado |
| `Auditoria` | `/auditoria` | **Solo administrador** |
| `Usuarios` | `/usuarios` | **Solo administrador** |
| (cualquier otra) | `*` | Redirige a `/dashboard` |

Todas las rutas (salvo `/login`) están envueltas en `<ProtectedRoute>`, que muestra un
spinner mientras carga la sesión y redirige a `/login` si no hay sesión.

> **Acceso a la edición de datos** (botones de crear/editar/eliminar, Excel masivo,
> recálculo, edición en línea) está reservado a **administrador y editor** —
> se controla con el derivado `puedeEditar` de `AuthContext` (= `isAdmin || isEditor`).
> La página **Nuevo registro** (`/nuevo-registro`) también exige `puedeEditar`.

---

## 7. Flujo de datos de una planilla

```
PlanillaPage (lee :slug de la URL)
  → getPlanillaBySlug()          obtiene la config
  → usePlanilla(tabla)           carga inicial desde Supabase → { filas, applyChange, refetch }
  → useRealtime(tabla, applyChange)   se suscribe a cambios postgres y aplica al estado local
  → PlanillaTable                renderiza con @tanstack/react-table + alertas
  → RecordForm / ExcelImport / ExcelDelete / ExcelExport   mutan o leen Supabase
```

**Detalle importante de rendimiento:** los cambios en tiempo real mutan el estado local
(`applyChange`) **sin volver a consultar la BD**. Solo se hace un `refetch` completo
después de operaciones masivas de Excel o tras el recálculo global.

---

## 8. Funcionalidades clave (detalle)

### 8.1 Tabla de planilla (`PlanillaTable.jsx`)
- Orden por columna, búsqueda global y paginación (10/25/50/100 por página).
- **Edición en línea** con doble clic (admin/editor; campos `money`/`int`/`text`).
  Al guardar una celda se **recalculan los totales** de toda la fila y se actualiza.
- Las columnas de total (`t_ingreso`, `t_dsctos`, `t_liquido`) son de solo lectura.
- **Panel de alertas** y resaltado de filas con problemas.
- Acciones por fila: descargar **boleta PDF**, **Editar**, **Eliminar** (las dos
  últimas, admin/editor — se reciben vía el prop `puedeEditar`).

### 8.2 Formulario crear/editar (`RecordForm.jsx`)
- Modal con todos los campos según el tipo de columna.
- **Auto-cálculo en vivo:** al cambiar cualquier ingreso o descuento se recalculan
  `t_ingreso`, `t_dsctos` y `t_liquido` (campos de total en solo lectura).
- Maneja error de DNI duplicado (código `23505`).

### 8.3 Alertas (`alertas.js`)
Se detectan tres tipos por fila:
- **`LIQUIDO_NEGATIVO`** (rojo): `t_liquido < 0`.
- **`TOTAL_DESCUADRADO`** (ámbar): el `t_liquido` guardado difiere del recalculado en > S/ 0.05.
- **`FALTAS_EXCESIVAS`** (naranja): `faltas > 10` días.

### 8.4 Importar / Exportar Excel
- **Exportar** (`ExcelExport`): descarga las filas actuales como `.xlsx` con cabeceras = labels.
- **Importar** (`ExcelImport`): lee el archivo, mapea cabeceras→claves, **coacciona tipos**
  (incluye conversión de fechas serial de Excel), recalcula totales, muestra una
  **vista previa** (nuevos / actualizados / con error) y hace **UPSERT por DNI**
  en lotes de 100. Incluye botón para descargar una **plantilla vacía**.
- **Eliminar por Excel** (`ExcelDelete`): lee los DNIs de un archivo y los borra en masa
  tras confirmación.

### 8.5 Boleta PDF (`boletaPdf.js`)
Genera una boleta A4 por trabajador con encabezado institucional, datos del trabajador,
dos tablas (Ingresos / Descuentos, solo conceptos con monto ≠ 0), el **Total Líquido a
pagar** destacado y un pie. Se descarga como `Boleta_<tabla>_<nombre>.pdf`.

### 8.6 Dashboard (`Dashboard.jsx`)
- KPIs: nº de planillas, total de trabajadores, total a pagar.
- **Gráfico de barras** (Recharts) de líquido por grupo.
- **Tabla resumen** por planilla con fila de TOTAL GENERAL.
- **Tarjetas** por grupo enlazando a cada planilla.
- Botón para generar el **Reporte Consolidado** (un Excel con una hoja por planilla +
  hoja de resumen).
- Los datos provienen del RPC `resumen_planillas()` (un solo viaje a la BD).

### 8.7 Búsqueda global (`BusquedaGlobal.jsx`)
Busca por DNI (exacto) o nombre (ILIKE) en las 19 tablas vía el RPC
`buscar_trabajador(termino)`, agrupando resultados por planilla.

### 8.8 Recálculo global (`PlanillaPage.jsx`)
Botón "Recalcular totales" (admin/editor) que recalcula todas las filas de la planilla
mediante el RPC atómico `recalcular_totales` (un UPDATE que dispara el trigger de totales).

---

## 9. Backend Supabase

### Un solo archivo SQL
Todo el esquema vive en **`supabase/_migracion_completa.sql`**. Para instalar (o
reinstalar) la base de datos, pega ese archivo completo en el **SQL Editor de
Supabase** y ejecútalo una sola vez. Es la **única fuente de SQL** del proyecto; ya no
se mantienen archivos sueltos por número.

> El SQL de tablas, totales e índices se **genera** con `scripts/genSql.mjs` desde
> `planillas.js`; su salida se **integra a mano** dentro de `_migracion_completa.sql`
> (no se versiona como archivos separados).

El archivo contiene, en orden:

| Bloque | Contenido |
|---|---|
| Extensiones | `moddatetime` (auto `updated_at`) y `pg_trgm` (búsqueda). |
| `perfiles` | Tabla `perfiles` (`rol` con `CHECK IN ('consultor','editor','administrador')`) + trigger `handle_new_user` (crea el perfil al registrarse con rol por defecto `consultor`). |
| 19 planillas | Las 19 tablas (**generadas** — cada una con `id`, `dni INTEGER UNIQUE`, `created_at`, `updated_at` y trigger de `updated_at`). |
| RLS | Función `get_my_rol()` (SECURITY DEFINER) + políticas. SELECT → los 3 roles; INSERT/UPDATE/DELETE → `editor`/`administrador`. Envueltas en `(select …)` por rendimiento. |
| Realtime | `REPLICA IDENTITY FULL` y publicación Realtime en las 19 tablas. |
| `auditoria` | Tabla `auditoria` (FK `usuario_id` → `public.perfiles.id`) + trigger genérico en las 19 tablas. SELECT solo `administrador`. |
| Funciones | RPCs `resumen_planillas()` y `buscar_trabajador(termino)`. |
| Admin | Políticas extra para que un `administrador` gestione todos los `perfiles`. |
| Totales | Triggers `BEFORE INSERT/UPDATE` que calculan `t_ingreso/t_dsctos/t_liquido` (**generados**; 18 planillas — no `obreros_necesidad_mercado`). |
| Índices | GIN trigram sobre `apellidos_y_nombres` (**generados**). |
| Operaciones | RPCs atómicas `importar_planilla(p_tabla, p_filas)`, `recalcular_totales(p_tabla)` y `actualizar_columna_planilla(p_tabla, p_columna, p_valores)` (autorizan a `editor`/`administrador`, con whitelist de tablas). |
| DNI único global | `dni_registro` + vista `vw_dni_todos` (`security_invoker`) + trigger `sync_dni_registro` en las 19 tablas. |
| Recarga | `NOTIFY pgrst, 'reload schema';` final para refrescar la caché de PostgREST. |

> **Los totales se calculan en la base de datos.** Los triggers de totales son la
> fuente de verdad de `t_ingreso/t_dsctos/t_liquido`. El cálculo en `calculos.js`
> (cliente) es solo para la vista previa en vivo del formulario e importación; lo que
> envíe el cliente lo sobrescribe el trigger al guardar.

### Auditoría
La tabla `auditoria` guarda `tabla`, `registro_id`, `accion` (INSERT/UPDATE/DELETE),
`usuario_id`, `datos_ant` y `datos_nue` (JSONB) y `created_at`. Un trigger genérico
registra automáticamente cada cambio en las 19 tablas. Solo los administradores pueden
leerla (RLS).

---

## 10. Roles y seguridad

- **Tres roles**, almacenados en `public.perfiles.rol` (`CHECK IN
  ('consultor','editor','administrador')`):
  - **`consultor`** — SELECT (ver), exportar a Excel, descargar boleta PDF.
  - **`editor`** — todo lo del consultor **+ editar datos** de las planillas (crear/
    editar/eliminar, Excel masivo importar/actualizar/borrar, recálculo). **No** gestiona
    usuarios ni ve la auditoría.
  - **`administrador`** — control total: datos + **gestión de usuarios** + **auditoría**.
- `AuthContext` expone `isAdmin`, `isEditor`, `isConsultor` y el derivado
  **`puedeEditar`** (= `isAdmin || isEditor`). La UI usa `puedeEditar` para mostrar las
  acciones de edición y `isAdmin` para las de usuarios/auditoría.
- El **frontend solo oculta** controles; la seguridad real la impone **RLS** en Supabase
  vía `get_my_rol()` — nunca confiar solo en la UI. Las RPCs masivas también validan
  `get_my_rol() IN ('editor','administrador')` (defensa en profundidad).
- El perfil se crea automáticamente al registrarse (`consultor`). Para cambiar de rol:
  - Desde la página `/usuarios` (selector con los 3 roles; un admin no puede cambiar su
    propio rol, para evitar quedar bloqueado), o
  - `UPDATE perfiles SET rol = '<rol>' WHERE id = '<uuid>'`.
- Crear nuevos usuarios se hace desde **Supabase → Authentication → Invite user**; la
  cuenta aparece en `/usuarios` como `consultor` y el admin le asigna el rol deseado.
  (Crear cuentas desde el frontend requeriría una Edge Function con `service_role`.)

---

## 11. Cómo extender el sistema

| Quiero… | Hago… |
|---|---|
| Agregar/renombrar una columna | Editar `src/config/planillas.js` → `node scripts/genSql.mjs` → integrar la salida en `supabase/_migracion_completa.sql` → correr ese SQL en Supabase. |
| Agregar una planilla nueva | Añadir su objeto a `PLANILLAS`, regenerar el SQL, e integrar la tabla en `_migracion_completa.sql` (bloques de RLS, realtime, auditoría, listas de tablas de los RPCs y trigger de DNI único). |
| Cambiar reglas de alertas | Editar `src/lib/alertas.js`. |
| Cambiar diseño de la boleta | Editar `src/lib/boletaPdf.js`. |
| Cambiar el tema/colores | Editar `tailwind.config.js`. |
| Cambiar permisos de un rol | Editar las políticas RLS / RPCs en `_migracion_completa.sql` y el gating de la UI (`puedeEditar` / `isAdmin`). |

> Recordatorio: al añadir una planilla nueva no basta con `planillas.js` y el SQL de
> tablas; la tabla también debe aparecer en **todas** las listas de tablas dentro de
> `_migracion_completa.sql` (bloque RLS, publicación Realtime, trigger de auditoría, los
> arreglos de tablas de los RPCs y el trigger `sync_dni_registro`).
```
