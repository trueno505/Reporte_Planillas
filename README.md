# Muni Sheets — Municipalidad Provincial de Ica

Sistema web para centralizar, consultar y gestionar **13 planillas de pago**
(remuneraciones) de distintos regímenes laborales (Obreros, Empleados, CAS,
Pensionistas y Autoridades).

Permite ver cada planilla en tabla con **paginación de 50 en 50 (server-side) y refresco en
vivo** (Realtime), búsqueda/orden y edición en línea, editar/eliminar registros con
**cálculo automático de totales**, un **alta rápida** global (solo datos básicos + S.N.P. +
Área; las planillas no tienen alta propia), **exportar Excel estilizado** (agrupado por
área, con resumen de conceptos, ESSALUD 9%, comprobación y **cuadro presupuestal por área**
con Nº Siaf pedido al descargar) y **actualizar columnas** por **Excel**,
generar **boletas PDF** y un **reporte consolidado**, buscar a un trabajador por DNI o
nombre en las 13 planillas a la vez, un **dashboard** con KPIs y gráficos, **auditoría**
de cambios, **gestión de usuarios/roles**, **histórico mensual permanente** (cada mes se
conserva; ver abajo) y actualizaciones en **tiempo real** (Supabase Realtime).

## Stack

- **React 19** + **Vite 8** + **react-router-dom 7**
- **Tailwind CSS 3** (color institucional `primary #003366`)
- **@tanstack/react-table** · **xlsx-js-style** (exportes estilizados) · **xlsx** (lectura) · **jspdf** + **jspdf-autotable** · **recharts** · **lucide-react** · **react-hot-toast**
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

Tres roles, almacenados en `public.perfiles.rol` (la seguridad real la impone RLS):

| Rol | Permite |
|---|---|
| **consultor** | Consultar, exportar a Excel y descargar boletas PDF (solo lectura). |
| **editor** | Lo del consultor **+ editar datos** de las planillas (CRUD, alta rápida, actualizar columnas por Excel, recálculo). **No** gestiona usuarios ni ve la auditoría. |
| **administrador** | Control total: datos + **gestión de usuarios** + **auditoría**. |

Un **administrador** gestiona las cuentas que usan la app desde la página
**Usuarios** (`/usuarios`): puede **crear** cuentas (nombre, correo, rol y contraseña
inicial), **asignar el rol** de cada usuario, **cambiar la contraseña** de cualquier
persona y **desactivar/reactivar** cuentas (no puede cambiar su propio rol ni desactivarse
a sí mismo, para evitar quedar bloqueado). Las cuentas **no se eliminan**: desactivar
impide el inicio de sesión pero conserva el perfil y la auditoría, y se puede reactivar.
Las acciones que requieren la `service_role` (crear, cambiar contraseña, desactivar/activar,
listar correos y estado) corren en las Edge Functions `crear-usuario` y `admin-usuarios`,
que verifican en el servidor que quien llama sea administrador. Invitar desde **Supabase →
Authentication → Invite user** sigue funcionando como alternativa y deja la cuenta como `consultor`.

## Histórico mensual

Cada planilla guarda una fila por **(trabajador, mes)** mediante una columna `periodo`
(primer día del mes). Los datos **no se sobrescriben**: cada mes queda archivado.

- Las columnas **fijas** (DNI, Apellidos y Nombres, Fecha de Ingreso, S.N.P., Tipo de
  acto administrativo) se mantienen iguales todos los meses; las demás varían.
- El **mes actual** es editable; los **meses anteriores** quedan en **solo lectura**.
- En cada planilla, el botón **«Generar mes siguiente»** crea el mes nuevo copiando a los
  trabajadores (identidad) con los montos en blanco para llenarlos. Por seguridad solo puede
  generar el **mes inmediatamente siguiente** al último existente (no se pueden saltar meses).
- El selector de mes (en la planilla, el dashboard y la búsqueda global) permite consultar
  meses y años anteriores. Para corregir un dato fijo, **«Corregir datos fijos»** lo cambia
  en todos los meses del trabajador.
- El histórico arranca en **junio 2026** con los datos ya cargados.

## Documentación

- **`CLAUDE.md`** — guía de arquitectura (fuente única `planillas.js`, flujo de datos, roles, BD).
- **`MAPEO_GENERAL.md`** — referencia completa de todo lo implementado.
- **`TECNOLOGIAS.md`** — listado detallado de tecnologías y versiones.

> ⚠️ El proyecto vive en el subdirectorio anidado `…/Reporte_Planillas/Reporte_Planillas/`
> (la carpeta interna contiene `package.json`, `src/`, `supabase/`, etc.).
