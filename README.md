# Muni Sheets — Municipalidad Provincial de Ica

Sistema web para centralizar, consultar y gestionar **13 planillas de pago**
(remuneraciones) de distintos regímenes laborales (Obreros, Empleados, CAS,
Pensionistas y Autoridades).

Permite ver cada planilla en tabla con **paginación de 50 en 50 (server-side) y refresco en
vivo** (Realtime), búsqueda/orden y edición en línea, editar/eliminar registros con
**cálculo automático de totales y de los aportes previsionales ONP/AFP**, un **alta
rápida** global (solo datos básicos + afiliación + Área; las planillas no tienen alta propia), **exportar Excel estilizado** (agrupado por
área, con recuadro por trabajador, resumen de conceptos, ESSALUD 9%, comprobación,
**cuadro presupuestal por área** con Nº Siaf —solo números— pedido al descargar, un
**cierre TOTAL GENERAL** con la suma de todas las columnas + su resumen global y las
**tres firmas** al pie, y una
**hoja aparte por cada concepto de descuento** con al menos un afectado ese mes),
**importar trabajadores nuevos de forma masiva** y **actualizar columnas** por **Excel**,
generar **boletas PDF** (de un mes, o comparativas de 2 o 4 meses en una sola hoja) y un **reporte consolidado**, buscar a un trabajador por DNI o
nombre en las 13 planillas a la vez, un **dashboard** con KPIs y gráficos, **auditoría**
de cambios, **gestión de usuarios/roles**, **histórico mensual permanente** (cada mes se
conserva; ver abajo) y actualizaciones en **tiempo real** (Supabase Realtime).

## Stack

- **React 19** + **Vite 8** + **react-router-dom 7**
- **Tailwind CSS 3** (color institucional `primary #003366`)
- **@tanstack/react-table** · **xlsx-js-style** (lectura y exportes estilizados) · **jspdf** + **jspdf-autotable** · **recharts** · **lucide-react** · **react-hot-toast**
- **Supabase** (PostgreSQL + Auth + Realtime + RLS + RPC + Edge Functions) como backend

## Puesta en marcha

```bash
npm install
npm run dev        # Servidor de desarrollo → http://localhost:5173
```

Crea un archivo `.env` (ver `.env.example`) con:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

### Base de datos

Todo el esquema vive en **un solo archivo**: `supabase/_migracion_completa.sql`.
Para instalar (o reinstalar) la base de datos, pega ese archivo completo en el
**SQL Editor de Supabase** y ejecútalo una vez.

Para cambios sobre una base **con datos** se usan parches puntuales (no se reinstala).
Ejemplo: `supabase/migracion_rename_observaciones.sql` renombra la columna
`observaciones → tipo_acto_administrativo` en las 13 tablas conservando los registros.

> **Realtime:** las suscripciones en vivo requieren que las tablas estén en la publicación
> `supabase_realtime` (Database → Replication). El `_migracion_completa.sql` ya las agrega.

## Scripts

```bash
npm run dev        # Servidor de desarrollo (localhost:5173)
npm run build      # Build de producción → dist/
npm run lint       # ESLint
npm run preview    # Sirve el build de producción
npm run test       # Pruebas unitarias (Vitest)
npm run test:e2e   # Pruebas end-to-end en navegador (Playwright, herméticas)

node scripts/genSql.mjs   # Regenera el SQL de tablas/totales/índices desde
                          # src/config/planillas.js (su salida se integra a mano
                          # en supabase/_migracion_completa.sql)
```

## Roles

Cuatro roles, almacenados en `public.perfiles.rol` (la seguridad real la impone RLS):

| Rol | Permite |
|---|---|
| **consultor** | Consultar, exportar a Excel y descargar boletas PDF —de uno o varios meses— (solo lectura). |
| **editor** | Lo del consultor **+ editar datos** de las planillas (CRUD, alta rápida, importar registros y actualizar columnas por Excel, recálculo). **No** gestiona usuarios ni ve la auditoría. |
| **administrador** | Control total: datos + **gestión de usuarios** + **auditoría**. |
| **superadmin** | Igual que administrador en todo, **más**: su cuenta y su rol son **permanentes** (nadie puede desactivarla, eliminarla ni reasignarle otro rol — ni siquiera otro superadmin), solo un superadmin puede (des)activar la cuenta de un administrador, ve un registro de auditoría de **cambios de rol** que un administrador normal no ve, **nadie puede ascender a alguien a superadmin desde la app** (solo se crea a mano en la BD) y **un administrador no puede saber quién es el superadmin** (su fila queda oculta en `/usuarios` y `/auditoria`). |

Un **administrador** (o **superadmin**) gestiona las cuentas que usan la app desde la
página **Usuarios** (`/usuarios`): puede **crear** cuentas (nombre, correo, rol y
contraseña inicial) y **asignar el rol** de cada usuario, entre **consultor / editor /
administrador** — `superadmin` no es un rol asignable desde la app, es una cuenta única
que solo se crea a mano en la base de datos —, **cambiar la contraseña** de
cualquier persona y **desactivar/reactivar** cuentas (no puede cambiar su propio rol ni
desactivarse a sí mismo, para evitar quedar bloqueado). Las cuentas **no se eliminan**:
desactivar impide el inicio de sesión pero conserva el perfil y la auditoría, y se puede
reactivar. Las acciones que requieren la `service_role` (crear, cambiar contraseña,
desactivar/activar, listar correos y estado) corren en las Edge Functions `crear-usuario`
y `admin-usuarios`, que verifican en el servidor que quien llama sea administrador o
superadmin (y que solo un superadmin pueda (des)activar a un administrador). Invitar
desde **Supabase → Authentication → Invite user** sigue funcionando como alternativa y
deja la cuenta como `consultor`.

Además, cada usuario puede **recuperar su contraseña por sí mismo**: el enlace
«¿Olvidaste tu contraseña?» del login envía un correo de recuperación que abre
`/restablecer` para definir una nueva. Requiere: (1) que el correo de cada cuenta sea una
bandeja real que su dueño controle, y (2) registrar las URLs de la app (localhost y
producción, con la ruta `/restablecer`) en **Supabase → Authentication → URL
Configuration → Redirect URLs**. Para producción conviene configurar un SMTP propio en
**Authentication → Emails → SMTP Settings** (el servicio por defecto tiene un límite de
~2 correos/hora).

## Histórico mensual

Cada planilla guarda una fila por **(trabajador, mes)** mediante una columna `periodo`
(primer día del mes). Los datos **no se sobrescriben**: cada mes queda archivado.

- Las columnas **fijas** (DNI, Apellidos y Nombres, Fecha de Ingreso, **AFIL. A :**, Área,
  Tipo de acto administrativo) se mantienen iguales todos los meses; las demás varían.
- El **mes actual** es editable; los **meses anteriores** quedan en **solo lectura**.
- En cada planilla, el botón **«Generar mes siguiente»** crea el mes nuevo copiando **todos**
  los datos del mes anterior (montos, cargo, identidad, etc.), salvo las columnas de
  asistencia (`faltas`/`faltas_tarda`), que quedan en blanco para registrarse de nuevo. Por
  seguridad solo puede generar el **mes inmediatamente siguiente** al último existente (no se
  pueden saltar meses).
- Para cargar muchos trabajadores nuevos de una vez (p. ej. al abrir una planilla por primera
  vez), cada planilla tiene un botón **«Importar Excel»**: descarga una plantilla en blanco con
  las columnas en el orden correcto y, al subirla llena, previsualiza qué filas se crearán antes
  de confirmar (ver `ExcelImportarMasivo` en `CLAUDE.md`).
- El selector de mes (en la planilla, el dashboard y la búsqueda global) permite consultar
  meses y años anteriores. Para corregir un dato fijo, **«Corregir datos fijos»** lo cambia
  en todos los meses del trabajador.
- El histórico arrancó en **junio 2026**, pero las planillas se **vaciaron por completo el
  19-08-2026** (borrado solicitado de todos los trabajadores). El histórico se reinicia con el
  primer registro que se cree: entra en el mes en curso y desde ahí se encadenan los siguientes.

## Aportes previsionales automáticos

Los descuentos de pensiones **los calcula la base de datos**, sobre el **Total de
Ingresos** de cada trabajador, cada vez que se guarda un registro:

| Afiliación | Descuentos aplicados |
|---|---|
| **ONP** | Descuento S.N.P. = 13 % |
| **AFP**, comisión sobre el **flujo** | F. Pens. 10 % · P. Seg. 1,37 % · C. Var. según la AFP (Integra 1,55 · Profuturo 1,69 · Habitat 1,47 · Prima 1,60) |
| **AFP**, comisión sobre el **saldo** | F. Pens. 10 % · P. Seg. 1,37 % (sin comisión variable) |

Esas cuatro columnas quedan de **solo lectura** en el formulario. Si la afiliación no
es reconocible, no se toca ningún monto.

Los porcentajes **no están en el código**: viven en la tabla `parametros_aportes` y se
editan desde **`/parametros-aportes`**, visible solo para el **superadmin**.

**Tope de la Prima de Seguro** (Remuneración Máxima Asegurable): cada AFP puede tener un
tope, editable en la columna *Tope Pri. Seg.* de esa misma página. Si el trabajador gana
más, la **P. Seg.** se calcula solo sobre el tope (Integra: 12 672.65 → quien gana 20 000
paga 1,37 % de 12 672.65). F. Pens. y C. Var. no tienen tope. Vacío = sin tope.

## Impresión de los Excel

Los Excel descargados ya vienen listos para imprimir: **A4, ajustados a 1 página de ancho,
centrados y con el encabezado repetido en cada hoja** (horizontal la planilla y el resumen
por áreas; vertical las hojas por descuento). Los datos van en letra 10, el nombre en
negrita y cada columna con el ancho justo de su contenido, para que en papel se lean igual
que la planilla oficial de referencia.

Al **generar el mes siguiente**, quien ya cumplió **65 años** al primer día de ese mes
pasa automáticamente a *Comisión sobre el saldo* (cumplir el 20 de agosto surte efecto
en setiembre).

## Rendimiento

- **Una sola librería de Excel** (`xlsx-js-style`, que lee y escribe): se eliminó la
  dependencia `xlsx` duplicada → **−161 kB gzip** de bundle.
- **Carga diferida** de las pantallas y de las librerías pesadas (Excel, PDF, gráficos):
  el arranque descarga ~138 kB gzip.
- **Conteo bajo demanda** en la paginación: cambiar de página o de orden ya no ejecuta un
  `COUNT` exacto sobre toda la planilla; solo se recuenta al cambiar los filtros o cuando
  Realtime avisa de altas/bajas.
- **Caché en memoria** (`src/lib/cache.js`) para catálogos y parámetros (lista de meses,
  porcentajes de aportes), con TTL, invalidación explícita y deduplicación de peticiones
  simultáneas. Los **importes nunca se cachean**: se leen siempre frescos.

## Documentación

- **`CLAUDE.md`** — guía de arquitectura (fuente única `planillas.js`, flujo de datos, roles, BD).
- **`MAPEO_GENERAL.md`** — referencia completa de todo lo implementado.
- **`TECNOLOGIAS.md`** — listado detallado de tecnologías y versiones.

> ⚠️ El proyecto vive en el subdirectorio anidado `…/Reporte_Planillas/Reporte_Planillas/`
> (la carpeta interna contiene `package.json`, `src/`, `supabase/`, etc.).
