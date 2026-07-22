# Mapeo General — Muni Sheets (MPI)

> Documento de referencia que explica **todo lo que está creado e implementado** en el
> proyecto. Generado a partir de una revisión completa del código fuente.
> **Última revisión:** 2026-07-22

---

## 1. ¿Qué es este proyecto?

Sistema web para la **Municipalidad Provincial de Ica (MPI)** que centraliza, consulta
y gestiona **13 planillas de pago** (remuneraciones) de distintos regímenes laborales
(Obreros, Empleados, CAS, Pensionistas y Autoridades), con **histórico mensual** por
`periodo`.

Permite:
- Ver cada planilla en una tabla con **paginación de 50 en 50 del lado del servidor**,
  búsqueda y orden (también server-side) y edición en línea, con **actualización en vivo**
  (Realtime) de la lista y la paginación.
- Editar / eliminar registros con **cálculo automático de totales**. El **alta** se hace
  únicamente desde *Nuevo registro* (global); las planillas ya no tienen botón de alta propio.
- **Alta rápida** desde *Nuevo registro* (solo DNI, Apellidos y Nombres, Fecha de Ingreso,
  S.N.P., Área — en planillas con `areas` — y Tipo de acto administrativo).
- Exportar datos en **Excel estilizado** (agrupado por área, con resumen de conceptos,
  aporte a ESSALUD al 9%, comprobación y **cuadro presupuestal por área** con Nº Siaf
  pedido al descargar) y **actualizar una columna** masivamente por Excel.
- Generar **boletas de pago en PDF** por trabajador y un **reporte consolidado** en Excel.
- Buscar a un trabajador por DNI o nombre en **las 13 planillas a la vez**.
- Un **dashboard** con KPIs y gráficos.
- **Edición de datos** disponible para administradores, **superadmin** y **editores**; los **consultores** solo leen/exportan.
- **Auditoría** de cambios y **gestión de usuarios/roles** (administrador y superadmin; el log de cambios de rol es exclusivo de superadmin).
- Actualizaciones en **tiempo real** (Supabase Realtime) entre usuarios conectados.

---

## 2. Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | **React 19** + **Vite 8** |
| Ruteo | **react-router-dom 7** |
| Estilos | **Tailwind CSS 3** (color institucional `primary #003366`) |
| Tablas | **@tanstack/react-table 8** |
| Excel | **xlsx-js-style** (exportes estilizados) + **xlsx (SheetJS)** (lectura de archivos) |
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
  titulo,          // título oficial largo (cabecera de los Excel exportados)
  grupo,           // Obreros | Empleados | CAS | Pensionistas | Autoridades
  columnas: [ { key, label, type, required? } ],
  areas?,          // lista de áreas/actividades que dividen la planilla
  sinAutoTotales?, // true → totales manuales (sin auto-cálculo)
  excluirCalculo?, // claves a ignorar en el auto-cálculo
}
```

Junto a `planillas.js` vive **`src/config/cuadrosPresupuestales.js`**: los datos fijos
del **cuadro presupuestal** de cada área (Sec. Func., Programa, Función, Meta,
Finalidad, Fte. Financ., Rubros y Clasificadores) por planilla, usados en la
exportación Excel. El helper `getCuadroArea(slug, area)` los resuelve tolerando
diferencias de tildes/mayúsculas; el Nº Siaf no es fijo: se pide al usuario al
descargar — uno por planilla, solo dígitos, aplicado automáticamente a todas sus
áreas — y los montos/fecha del cuadro quedan para llenar a mano (la fecha se
autocompleta con el día de la descarga).

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
- El selector de columnas y la plantilla de actualización por Excel (`ExcelActualizarColumna`).
- El diseño de la boleta PDF (`boletaPdf.js`).
- El cálculo de totales (`calculos.js`).

> **Para agregar o renombrar una columna:** editar `planillas.js` → ejecutar
> `node scripts/genSql.mjs` → correr el SQL generado en el editor SQL de Supabase.
> Si la base de datos **ya tiene datos**, no recrear la tabla: aplicar un
> `ALTER TABLE … RENAME COLUMN` (renombrar) o `ADD COLUMN` (agregar) para preservar los
> registros. Ejemplo real: el rename `observaciones → tipo_acto_administrativo` se aplicó
> con el parche idempotente `supabase/migracion_rename_observaciones.sql`.

### Conjuntos de columnas compartidos
- **`CAS_COLS`** — usado por `cas-general` (quedó de cuando existían 7 subplanillas CAS).
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

## 4. Las 13 planillas

| Grupo | Planilla | slug | tabla |
|---|---|---|---|
| Obreros | Obreros Permanentes | `obreros-permanentes` | `obreros_permanentes` |
| Obreros | Obreros Plazo Indeterminado | `obreros-plazo-indeterminado` | `obreros_plazo_indeterminado` |
| Obreros | Obreros Mandato Judicial | `obreros-mandato-judicial` | `obreros_mandato_judicial` |
| Obreros | Obreros Concurso | `obreros-concurso` | `obreros_concurso` |
| Obreros | Obreros Necesidad de Mercado | `obreros-necesidad-mercado` | `obreros_necesidad_mercado` |
| Empleados | Empleados Permanentes* | `empleados-permanentes` | `empleados_permanentes` |
| Empleados | Empleados Contrato Plazo Indeterminado | `empleados-contrato-plazo-indet` | `empleados_contrato_plazo_indet` |
| Empleados | Empleados Contrato Provisional | `empleados-contrato-provisional` | `empleados_contrato_provisional` |
| Empleados | Empleados Mandato Judicial (24041) | `empleados-mandato-judicial` | `empleados_mandato_judicial_24041` |
| CAS | CAS General | `cas-general` | `cas_general` |
| Pensionistas | Cesantes y Pensionistas | `cesantes-pensionistas` | `cesantes_pensionistas` |
| Autoridades | Gerente Municipal | `gerente-municipal` | `gerente_municipal` |
| Autoridades | Alcalde** | `alcalde` | `alcalde` |

\* `empleados-permanentes` usa `excluirCalculo: ['vacaciones']` (columna informativa).
\** `alcalde` usa `excluirCalculo: ['base']` porque la columna `base` no es un descuento.

> **CAS:** originalmente había 7 subplanillas CAS; se eliminaron 6 (`cas-choferes`,
> `cas-i-2025`, `cas-ii-2023`, `cas-ii-2024`, `cas-iii-2025`, `cas-funcional`) dejando
> solo `cas-general` (ver `supabase/migracion_eliminar_cas_subplanillas.sql`).
>
> **Áreas:** 12 planillas tienen `areas` (las 5 de obreros, 4 de empleados,
> `cas-general`, `gerente-municipal` y `alcalde`); dividen la planilla en la
> exportación Excel y alimentan el selector de Área del alta/corrección.

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
│   │   ├── planillas.js       ★ FUENTE ÚNICA DE VERDAD (13 planillas)
│   │   └── cuadrosPresupuestales.js  Datos fijos del cuadro presupuestal por planilla/área
│   │
│   ├── context/
│   │   ├── AuthContext.jsx    Proveedor (AuthProvider): sesión, perfil y rol del usuario
│   │   └── auth-context.js    Contexto + hook useAuth() (separado por Fast Refresh)
│   │
│   ├── hooks/
│   │   ├── usePlanillaPaginada.js  ★ Paginación server-side (50/pág) + búsqueda/orden + conteo real
│   │   ├── usePlanilla.js     Carga TODAS las filas (heredado; reemplazado por usePlanillaPaginada en la planilla)
│   │   └── useRealtime.js     Suscripción a cambios en tiempo real (filtra por tabla = planilla)
│   │
│   ├── lib/
│   │   ├── supabaseClient.js  Inicializa el cliente Supabase
│   │   ├── calculos.js        Cálculo de totales (ingreso/dscto/líquido)
│   │   ├── alertas.js         Detección de alertas por fila
│   │   ├── boletaPdf.js       Boleta de pago individual en PDF
│   │   ├── periodo.js         Helpers de periodo (formatear, mes actual/siguiente, primer día)
│   │   ├── db.js              Consultas paginadas/masivas (filtran por periodo)
│   │   ├── excelEncabezado.js Hojas Excel estilizadas: encabezado institucional, filas por
│   │   │                      área con subtotal, RESÚMEN + ESSALUD 9% + COMPROBACIÓN,
│   │   │                      cuadro presupuestal (Siaf + fecha) y hoja "Resumen por áreas"
│   │   └── reporteConsolidado.js  Excel consolidado (cargar datos → pedir Siaf → generar)
│   │
│   ├── components/
│   │   ├── Layout.jsx         Shell: Sidebar + Header + contenido
│   │   ├── Header.jsx         Barra superior (usuario, rol, logout)
│   │   ├── Sidebar.jsx        Navegación agrupada por grupo
│   │   ├── ProtectedRoute.jsx Redirige a /login si no hay sesión
│   │   ├── PlanillaTable.jsx  Tabla de la página actual (orden/búsqueda server-side, edición, PDF)
│   │   ├── Paginacion.jsx           ★ Control de paginación reutilizable (« Anterior 1 … 4 5 6 … 20 Siguiente »)
│   │   ├── RecordForm.jsx           Modal editar (todos obligatorios) / alta rápida, con auto-cálculo
│   │   ├── ExcelActualizarColumna.jsx  Actualizar una columna por DNI desde Excel + plantilla (trae todas las filas)
│   │   ├── ExcelExport.jsx          Exportar TODAS las filas a .xlsx estilizado (pide Nº Siaf por área)
│   │   ├── SiafModal.jsx            Modal reutilizable que pide un Nº Siaf por planilla (solo números; se aplica a todas sus áreas)
│   │   ├── ConfirmDialog.jsx        Modal de confirmación reutilizable
│   │   ├── PeriodoSelector.jsx      Selector de mes/periodo (para históricos mensuales)
│   │   └── CorregirIdentidad.jsx    Modal para corregir datos fijos en todos los meses
│   │
│   └── pages/
│       ├── Login.jsx          Inicio de sesión (email/contraseña) + solicitar recuperación de contraseña
│       ├── Restablecer.jsx    Definir nueva contraseña desde el enlace del correo de recuperación
│       ├── Dashboard.jsx      KPIs, gráfico, resumen, tarjetas por grupo
│       ├── PlanillaPage.jsx   Página de una planilla (orquesta todo)
│       ├── NuevoRegistro.jsx  Alta rápida: elegir grupo → planilla → datos básicos
│       ├── BusquedaGlobal.jsx Búsqueda en las 13 planillas + imprimir boleta
│       ├── MiPerfil.jsx       Perfil propio: nombre/celular + cambiar contraseña
│       ├── Auditoria.jsx      Historial de cambios (admin/superadmin)
│       └── Usuarios.jsx       Gestión de usuarios: crear, rol, contraseña, desactivar/activar (admin/superadmin)
│
├── supabase/                  Esquema SQL + Edge Functions
│   ├── _migracion_completa.sql  Todo el esquema (tablas, RLS, realtime,
│   │                            auditoría, funciones, totales, índices,
│   │                            operaciones, 4 roles). Correr una vez en
│   │                            el SQL Editor de Supabase.
│   ├── migracion_rename_observaciones.sql  Parche idempotente: renombra
│   │                            observaciones → tipo_acto_administrativo en una BD ya instalada.
│   ├── migracion_historico_periodo.sql  Parche idempotente: añade el histórico
│   │                            mensual (columna periodo, bloqueo de meses cerrados, RPCs por mes).
│   ├── migracion_rol_superadmin.sql  Parche idempotente: añade el rol superadmin
│   │                            y sus protecciones (cuenta/rol permanentes).
│   └── functions/             Edge Functions (corren con service_role; solo admin/superadmin)
│       ├── crear-usuario/index.ts    Crear cuentas desde la app
│       └── admin-usuarios/index.ts   Listar correos/estado, cambiar contraseña y desactivar/activar usuarios
│
├── e2e/                       Pruebas end-to-end (Playwright, herméticas con mock de Supabase)
│   ├── paginacion.spec.js     Paginación, estado vacío, sin botón "Nuevo registro", obligatorios al editar
│   ├── actualizar-columna.spec.js  Flujo de actualizar columna por Excel
│   └── support/supabaseMock.js     Intercepta auth/REST/RPC/realtime (sin backend real)
│
└── dist/                      Build de producción (generado)
```

---

## 6. Rutas y control de acceso

| Página | Ruta | Acceso |
|---|---|---|
| `Login` | `/login` | Público |
| `Restablecer` | `/restablecer` | Público (requiere la sesión temporal del enlace de recuperación) |
| `Dashboard` | `/dashboard` | Cualquier usuario autenticado |
| `PlanillaPage` | `/planilla/:slug` | Cualquier usuario autenticado |
| `BusquedaGlobal` | `/buscar` | Cualquier usuario autenticado |
| `MiPerfil` | `/perfil` | Cualquier usuario autenticado |
| `Auditoria` | `/auditoria` | **Administrador o superadmin** |
| `Usuarios` | `/usuarios` | **Administrador o superadmin** |
| (cualquier otra) | `*` | Redirige a `/dashboard` |

Todas las rutas (salvo `/login` y `/restablecer`) están envueltas en `<ProtectedRoute>`, que muestra un
spinner mientras carga la sesión y redirige a `/login` si no hay sesión. El estado
`loading` de `AuthContext` permanece activo **hasta que el perfil (rol) del usuario se
resuelve**, de modo que las páginas que dependen del rol (p. ej. `/nuevo-registro`) no
redirigen por error al cargarse por URL directa o al refrescar.

**Recuperación de contraseña**: `Login` ofrece «¿Olvidaste tu contraseña?», que llama a
`supabase.auth.resetPasswordForEmail(email, { redirectTo: origin + '/restablecer' })`. El
enlace del correo abre `/restablecer` con una sesión temporal y la página guarda la nueva
contraseña con `supabase.auth.updateUser({ password })`. `AuthContext` escucha el evento
`PASSWORD_RECOVERY` y redirige a `/restablecer` aunque el enlace aterrice en otra página.
Cada dominio de la app debe estar en **Supabase → Authentication → URL Configuration →
Redirect URLs** (localhost y producción, con la ruta `/restablecer`).

> **Acceso a la edición de datos** (botones de editar/eliminar, alta rápida en
> `/nuevo-registro`, actualizar columna por Excel, recálculo, edición en línea) está
> reservado a **administrador, superadmin y editor** — (el alta de registros es solo
> global; las planillas ya no tienen botón "Nuevo registro" propio) —
> se controla con el derivado `puedeEditar` de `AuthContext` (= `isAdmin || isEditor`,
> donde `isAdmin` ya es `true` para `administrador` **o** `superadmin`).
> La página **Nuevo registro** (`/nuevo-registro`) también exige `puedeEditar`.

---

## 7. Flujo de datos de una planilla

```
PlanillaPage (lee :slug de la URL)
  → getPlanillaBySlug()               obtiene la config
  → usePlanillaPaginada(tabla)        paginación server-side: trae SOLO 50 filas con
                                      .range() y el total real con { count: 'exact' };
                                      maneja página/búsqueda/orden → { filas, total, page,
                                      setPage, pageCount, search, setSearch, sort, setSort, refetch }
  → useRealtime(tabla, onCambio)      se suscribe a los cambios postgres de ESA tabla y,
                                      ante cualquier evento, hace un refetch (con debounce)
  → PlanillaTable + Paginacion        renderiza la página actual + el control de paginación
  → RecordForm / ExcelActualizarColumna / ExcelExport   mutan o leen Supabase
```

**Tiempo real con paginación:** como insertar/borrar cambia qué 50 filas tocan a la página
y el total de páginas, Realtime **vuelve a consultar la página actual** (con un pequeño
debounce para agrupar ráfagas) en lugar de mutar el estado local. El canal escucha solo la
tabla de la planilla abierta y se limpia al desmontar o cambiar de planilla; se pausa durante
operaciones masivas de Excel / recálculo.

> **Recordatorio:** la suscripción Realtime solo funciona si la tabla está habilitada en
> Supabase (Database → Replication / publicación `supabase_realtime`). El
> `_migracion_completa.sql` ya agrega las 13 tablas con `REPLICA IDENTITY FULL`.

> **Exportar Excel** y **Actualizar columna** necesitan TODOS los registros (no solo los 50
> visibles), así que los traen **bajo demanda** al usarlos.

---

## 8. Funcionalidades clave (detalle)

### 8.1 Tabla de planilla (`PlanillaTable.jsx` + `Paginacion.jsx`)
- **Paginación del lado del servidor: 50 trabajadores por página.** Solo se traen las 50
  filas de la página actual con `.range(desde, hasta)` y el total real con
  `{ count: 'exact' }` → `pageCount = Math.ceil(total / 50)`. La tabla empieza vacía y se va
  llenando conforme se guardan trabajadores (con refresco en vivo por Realtime).
- **Búsqueda y orden server-side:** el buscador filtra **toda** la planilla por nombre
  (ILIKE) o DNI; ordenar por columna también consulta a Supabase. Ambos vuelven a la página 1.
- **Control de paginación reutilizable** (`Paginacion.jsx`): `« Anterior | 1 … 4 5 6 … 20 |
  Siguiente »`, página actual resaltada, elipsis cuando hay muchas páginas, "Anterior"
  deshabilitado en la primera y "Siguiente" en la última. Con 0 trabajadores se muestra un
  **estado vacío** y el control **se oculta** (solo aparece con más de 1 página).
- **Edición en línea** con doble clic (admin/editor; campos `money`/`int`/`text`).
  Al guardar una celda se **recalculan los totales** de toda la fila (trigger de la BD).
- Las columnas de total (`t_ingreso`, `t_dsctos`, `t_liquido`) son de solo lectura.
- **Panel de alertas** y resaltado de filas con problemas.
- Acciones por fila: descargar **boleta PDF**, **Editar**, **Eliminar** (las dos
  últimas, admin/editor — se reciben vía el prop `puedeEditar`). **No hay botón de alta** en
  la planilla; los registros se crean solo desde *Nuevo registro* (global).

### 8.2 Formulario editar / alta rápida (`RecordForm.jsx`)
- Modal con todos los campos según el tipo de columna.
- **Obligatoriedad por contexto** (`esRequerido`): al **editar**, **todos** los campos son
  obligatorios (obliga a completar los que quedaron vacíos en el alta rápida); en el alta
  rápida, los 4 básicos; los totales automáticos nunca (son de solo lectura). La validación
  se hace en JS al guardar (el botón está fuera del `<form>`, el `required` nativo no basta)
  y muestra un toast *"Completa todos los campos: …"* sin enviar nada si falta algo.
- **Auto-cálculo en vivo:** al cambiar cualquier ingreso o descuento se recalculan
  `t_ingreso`, `t_dsctos` y `t_liquido` (campos de total en solo lectura).
- Maneja error de DNI duplicado (código `23505`).
- **Modo alta rápida (`soloBasicos`):** lo usa *Nuevo registro* (`NuevoRegistro.jsx`).
  Muestra solo **DNI**, **Apellidos y Nombres**, **Fecha de Ingreso**, **S.N.P.**,
  **Área** (selector, solo en planillas con `areas`) y **Tipo de acto administrativo**, todos
  **obligatorios** (validados al guardar). El campo **S.N.P.** es un selector
  **ONP / AFP**; si se elige *AFP* aparece un segundo selector con las cuatro AFP
  (*AFP Integra, Prima AFP, AFP Habitat, Profuturo AFP*) y se guarda el **nombre completo**
  de la AFP en la columna `snp` (o `"ONP"`). El selector de **Área** ordena sus opciones
  **alfabéticamente** al renderizar (`localeCompare`, es) y ocupa **todo el ancho de la fila**
  para leer completo el nombre de la actividad. El resto de columnas quedan en blanco y los
  totales los calcula el trigger.

### 8.2.1 Alta rápida (`NuevoRegistro.jsx`, ruta `/nuevo-registro`)
Asistente en 3 pasos (grupo → planilla → datos) que reutiliza `RecordForm` con
`soloBasicos`. Solo accesible a `editor`/`administrador`.

### 8.3 Alertas (`alertas.js`)
Se detectan tres tipos por fila:
- **`LIQUIDO_NEGATIVO`** (rojo): `t_liquido < 0`.
- **`TOTAL_DESCUADRADO`** (ámbar): el `t_liquido` guardado difiere del recalculado en > S/ 0.05.
- **`FALTAS_EXCESIVAS`** (naranja): `faltas > 10` días.

### 8.4 Exportar / Actualizar por Excel
> Como la tabla está paginada (50 filas en memoria), ambas funciones traen **todos** los
> registros bajo demanda (`fetchAllRows`) al usarlas, para no exportar/validar solo la página visible.
- **Exportar** (`ExcelExport` + `lib/excelEncabezado.js`): descarga **todas** las filas como
  `.xlsx` estilizado con encabezado institucional (membrete, título oficial, mes, RUC). En
  planillas con `areas`, las filas van **agrupadas por área** (la columna `area` por
  trabajador se excluye de la hoja: la banda de área ya la indica), cada una con:
  - fila `ÁREA: <nombre>` + trabajadores + `SUBTOTAL` (suma de cada columna de monto);
  - bloque **RESÚMEN** (cada concepto de ingreso con su suma + TOTAL INGRESOS) y, un poco
    separado, **"A ESSALUD (IPSS) (CAJA DE ENFERM. Y MATERNIDAD)"** = total de ingresos ×
    0.09 (2 decimales) + TOTAL;
  - bloque **COMPROBACIÓN** (TOTAL LÍQUIDO + RETENCIONES por concepto + CUOTA PATRONAL =
    mismo 9%), que cuadra con el total del RESÚMEN;
  - **cuadro presupuestal** del área (datos fijos de `config/cuadrosPresupuestales.js`,
    Nº Siaf pedido en un modal antes de descargar — `SiafModal`, uno por planilla, solo
    números, replicado en todas sus áreas —, montos en blanco y FECHA autocompletada
    con el día de la descarga).

  Además agrega la hoja **"Resumen por áreas"**: una fila por área con **todas** las
  columnas de montos de la planilla y una fila TOTAL GENERAL que suma cada columna.
  Las planillas sin áreas (Cesantes) llevan una fila TOTAL GENERAL + un bloque único
  al final de la hoja.
- **Actualizar columna** (`ExcelActualizarColumna`): se elige **una** columna, se sube un
  Excel con `DNI + valor`, muestra una **vista previa** (emparejados / no encontrados /
  inválidos) y hace un **UPDATE atómico por DNI** vía el RPC `actualizar_columna_planilla`.
  Incluye botón para descargar una **plantilla** para rellenar.

### 8.5 Boleta PDF (`boletaPdf.js`)
Genera una boleta A4 por trabajador con encabezado institucional, datos del trabajador,
dos tablas (Ingresos / Descuentos, solo conceptos con monto ≠ 0), el **Total Líquido a
pagar** destacado y un pie. Se descarga como `Boleta_<tabla>_<nombre>.pdf`.
Se invoca desde el botón de la columna **Acciones** de `PlanillaTable.jsx` y
desde el botón **Imprimir** de cada resultado de `BusquedaGlobal.jsx` (ver 8.7).

### 8.6 Dashboard (`Dashboard.jsx`)
- KPIs: nº de planillas, total de trabajadores, total a pagar.
- **Gráfico de barras** (Recharts) de líquido por grupo.
- **Tabla resumen** por planilla con fila de TOTAL GENERAL.
- **Tarjetas** por grupo enlazando a cada planilla.
- Botón para generar el **Reporte Consolidado** (un Excel con una hoja por planilla +
  hoja de resumen). Al pulsarlo, primero descarga los datos de todas las planillas
  (`cargarDatosConsolidado`) y abre `SiafModal` para pedir **un Nº Siaf por planilla**
  (aplicado a todas sus áreas con cuadro presupuestal); cada hoja sale con el mismo
  formato que la exportación individual (áreas, resúmenes, ESSALUD, cuadros, fecha).
- Los datos provienen del RPC `resumen_planillas()` (un solo viaje a la BD).

### 8.7 Búsqueda global (`BusquedaGlobal.jsx`)
Busca por DNI (exacto) o nombre (ILIKE) en las 13 tablas vía el RPC
`buscar_trabajador(termino, p_periodo)` para el mes/año elegido en el
`<input type="month">`, agrupando resultados por planilla.

Cada fila de resultado incluye un botón **Imprimir** que descarga la boleta PDF
del trabajador **sin ir a la planilla**. Como el RPC solo devuelve DNI, nombre y
`t_liquido`, el botón primero trae la **fila completa** desde la tabla del
trabajador (`getPlanillaByTabla(tabla)` →
`supabase.from(tabla).select('*').eq('dni', …).eq('periodo', …).single()`) y luego
llama a `generarBoletaPdf(planilla, fila)`. Un spinner por fila
(`boletaCargando`, con clave `tabla-dni`) deshabilita el botón mientras carga;
los errores se muestran con `react-hot-toast`.

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

> **Parches sobre una BD ya instalada:** cuando un cambio de esquema afecta a una base con
> datos, se aplica un parche puntual en vez de reinstalar. Hoy existe
> `supabase/migracion_rename_observaciones.sql` (renombra `observaciones →
> tipo_acto_administrativo` en las 13 tablas, idempotente, conservando los datos). El
> `_migracion_completa.sql` ya refleja el nombre nuevo para instalaciones desde cero.

El archivo contiene, en orden:

| Bloque | Contenido |
|---|---|
| Extensiones | `moddatetime` (auto `updated_at`) y `pg_trgm` (búsqueda). |
| `perfiles` | Tabla `perfiles` (`id`, `nombre`, `celular`, `rol` con `CHECK IN ('consultor','editor','administrador','superadmin')`, `created_at`) + trigger `handle_new_user` (crea el perfil al registrarse con rol por defecto `consultor`) + trigger `proteger_rol_perfil` (impide que un no-admin cambie su propio `rol`, y revierte cualquier intento de cambiar el `rol` de una fila que ya es `superadmin`). |
| 13 planillas | Las 13 tablas (**generadas** — cada una con `id`, `dni INTEGER UNIQUE`, `created_at`, `updated_at` y trigger de `updated_at`). |
| RLS | Función `get_my_rol()` (SECURITY DEFINER) + políticas. SELECT → los 4 roles; INSERT/UPDATE/DELETE → `editor`/`administrador`/`superadmin`. Envueltas en `(select …)` por rendimiento. |
| Realtime | `REPLICA IDENTITY FULL` y publicación Realtime en las 13 tablas. |
| `auditoria` | Tabla `auditoria` (FK `usuario_id` → `public.perfiles.id`) + trigger genérico en las 13 tablas + trigger `registrar_cambio_rol` en `perfiles` (registra cada cambio de `rol` con `tabla='perfiles'`). SELECT: `administrador` ve todo salvo `tabla='perfiles'`; `superadmin` ve todo, incluido el log de cambios de rol. |
| Funciones | RPCs `resumen_planillas()` y `buscar_trabajador(termino)`. |
| Admin | Políticas extra para que `administrador`/`superadmin` gestionen todos los `perfiles`. |
| Totales | Triggers `BEFORE INSERT/UPDATE` que calculan `t_ingreso/t_dsctos/t_liquido` (**generados**; 18 planillas — no `obreros_necesidad_mercado`). |
| Índices | GIN trigram sobre `apellidos_y_nombres` (**generados**). |
| Operaciones | RPCs atómicas `recalcular_totales(p_tabla)`, `actualizar_columna_planilla(p_tabla, p_columna, p_valores)`, `abrir_periodo(p_tabla, p_periodo)` y `corregir_identidad(p_tabla, p_dni, p_datos)` (autorizan a `editor`/`administrador`/`superadmin`, con whitelist de tablas). |
| DNI único global | `dni_registro` + vista `vw_dni_todos` (`security_invoker`) + trigger `sync_dni_registro` en las 13 tablas. |
| Superadmin | Triggers `proteger_superadmin_ban` (`BEFORE UPDATE` en `auth.users`, revierte cambios a `banned_until` de una cuenta `superadmin`) y `proteger_superadmin_delete` (`BEFORE DELETE` en `perfiles`, bloquea eliminar una fila `superadmin`, abortando también el `DELETE` en cascada desde `auth.users`). Ver `supabase/migracion_rol_superadmin.sql`. |
| Recarga | `NOTIFY pgrst, 'reload schema';` final para refrescar la caché de PostgREST. |

> **Los totales se calculan en la base de datos.** Los triggers de totales son la
> fuente de verdad de `t_ingreso/t_dsctos/t_liquido`. El cálculo en `calculos.js`
> (cliente) es solo para la vista previa en vivo del formulario; lo que envíe el
> cliente lo sobrescribe el trigger al guardar.

### Auditoría
La tabla `auditoria` guarda `tabla`, `registro_id`, `accion`
(INSERT/UPDATE/DELETE/GENERACION), `usuario_id`, `datos_ant` y `datos_nue` (JSONB) y
`created_at`. Un trigger genérico registra automáticamente cada cambio en las 13 tablas.
Solo administrador y superadmin pueden leerla (RLS); las filas con `tabla='perfiles'`
(cambios de rol, ver más abajo) las ve **solo** superadmin.

**GENERACION** distingue las filas clonadas por "Generar mes siguiente" de las altas
manuales (INSERT): `abrir_periodo` marca la transacción con el GUC
`app.generando_mes = '1'` y el trigger `registrar_auditoria` registra esos INSERT con
`accion = 'GENERACION'` (parche `migracion_auditoria_generacion.sql`).

---

## 10. Roles y seguridad

- **Cuatro roles**, almacenados en `public.perfiles.rol` (`CHECK IN
  ('consultor','editor','administrador','superadmin')`):
  - **`consultor`** — SELECT (ver), exportar a Excel, descargar boleta PDF.
  - **`editor`** — todo lo del consultor **+ editar datos** de las planillas (crear/
    editar/eliminar, alta rápida, actualizar columnas por Excel, recálculo). **No** gestiona
    usuarios ni ve la auditoría.
  - **`administrador`** — control total: datos + **gestión de usuarios** + **auditoría**.
  - **`superadmin`** — **exactamente los mismos privilegios que `administrador`** en toda
    la RLS y los RPCs, más tres diferencias (añadido el 2026-07-22, ver
    `supabase/migracion_rol_superadmin.sql`):
    1. **Cuenta y rol permanentes**: el trigger `proteger_rol_perfil` revierte cualquier
       intento de cambiar el `rol` de una fila que ya es `superadmin` (lo intente quien lo
       intente, incluso otro superadmin); `proteger_superadmin_ban` (`BEFORE UPDATE` en
       `auth.users`) revierte cualquier cambio a `banned_until` de esa cuenta;
       `proteger_superadmin_delete` (`BEFORE DELETE` en `perfiles`) bloquea su eliminación
       (y por tanto también el `DELETE` en cascada desde `auth.users`). Los tres corren
       **a nivel de base de datos**, así que protegen sin importar la vía (Edge Function,
       panel de Supabase o SQL directo).
    2. Solo un **superadmin** puede (des)activar la cuenta de un **administrador** — esto
       se impone en la Edge Function `admin-usuarios`, porque es la única pieza que conoce
       quién está llamando (la Admin API corre con la `service_role`, no con el JWT de quien
       llama, así que un trigger de BD no podría distinguirlo).
    3. Cada cambio de `rol` se registra en `auditoria` (`tabla='perfiles'`, trigger
       `registrar_cambio_rol`), y esas filas son visibles **solo** para superadmin — un
       administrador normal sigue viendo el resto de la auditoría, pero no el historial de
       cambios de rol.
    - **Decisión de diseño deliberada**: ascender a alguien a `administrador` o
      `superadmin` **no** está restringido — cualquier admin o superadmin actual puede
      hacerlo desde `/usuarios`. Solo se restringió la parte de (des)activar cuentas de
      administrador, no la de otorgar el rol.
- `AuthContext` expone `isAdmin` (= `true` para `administrador` **o** `superadmin` — úsalo
  para todo lo que deba comportarse igual entre ambos), `isSuperadmin` (= `true` solo para
  `superadmin`, para las tres diferencias de arriba), `isEditor`, `isConsultor` y el
  derivado **`puedeEditar`** (= `isAdmin || isEditor`). La UI usa `puedeEditar` para
  mostrar las acciones de edición y `isAdmin` para las de usuarios/auditoría.
- El **frontend solo oculta** controles; la seguridad real la impone **RLS** en Supabase
  vía `get_my_rol()` — nunca confiar solo en la UI. Las RPCs masivas también validan
  `get_my_rol() IN ('editor','administrador','superadmin')` (defensa en profundidad).
- El perfil se crea automáticamente al registrarse (`consultor`). Para cambiar de rol:
  - Desde la página `/usuarios` (selector con los 4 roles; un admin no puede cambiar su
    propio rol, para evitar quedar bloqueado; el rol `superadmin` no se puede cambiar desde
    nadie), o
  - `UPDATE perfiles SET rol = '<rol>' WHERE id = '<uuid>'` (bloqueado por el trigger si la
    fila destino ya es `superadmin`).
- **Autogestión de perfil (`/perfil`):** cualquier usuario puede editar su `nombre` y
  `celular` y cambiar su contraseña (`supabase.auth.updateUser`). La política RLS
  `perfiles_update` permite editar la propia fila, pero el trigger `proteger_rol_perfil`
  revierte cualquier intento de un no-admin de cambiarse el `rol` (anti-escalada de
  privilegios), y también revierte cualquier cambio de rol sobre una fila `superadmin`.
- **Gestión de usuarios desde `/usuarios` (admin o superadmin):** puede **crear** cuentas
  (nombre, correo, rol y contraseña inicial), **cambiar la contraseña** de cualquier
  persona y **desactivar/reactivar** cuentas (no puede desactivarse a sí mismo; nadie puede
  desactivar a un `superadmin`; solo un `superadmin` puede (des)activar a un
  `administrador` — la UI deshabilita esos controles con un tooltip explicativo).
  Las cuentas **no se eliminan**: desactivar impide el login pero conserva perfil y
  auditoría. La página muestra el **correo** y el **estado** (Activa/Desactivada) de cada
  usuario. Estas operaciones usan la `service_role` (Admin API `auth.admin.*`), que
  **nunca** puede vivir en el frontend, por lo que corren en dos Edge Functions que
  verifican en el servidor que quien llama sea `administrador` o `superadmin`:
  - **`crear-usuario`** — `auth.admin.createUser` (`email_confirm: true`) + fija `nombre`
    y `rol` en `perfiles`.
  - **`admin-usuarios`** — despacha por `accion`: `listar` (correo + `banned_until` vía
    `auth.admin.listUsers`), `cambiar_password` (`auth.admin.updateUserById`), `desactivar`
    (`ban_duration: '876000h'`; rechaza el objetivo `superadmin` y el objetivo
    `administrador` si quien llama no es `superadmin`) y `activar` (`ban_duration: 'none'`,
    mismas restricciones).
  Despliegue: `npx supabase functions deploy <nombre> --project-ref <ref>`. Invitar desde
  **Supabase → Authentication → Invite user** sigue funcionando como alternativa y deja la
  cuenta como `consultor`.

---

## 11. Cómo extender el sistema

| Quiero… | Hago… |
|---|---|
| Agregar/renombrar una columna | Editar `src/config/planillas.js` → `node scripts/genSql.mjs` → integrar la salida en `supabase/_migracion_completa.sql`. En una BD **con datos**, no reinstalar: aplicar `ALTER TABLE … ADD/RENAME COLUMN` (ver `migracion_rename_observaciones.sql` como ejemplo). Actualizar también referencias hardcodeadas (p. ej. `boletaPdf.js`). |
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
