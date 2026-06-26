# Reporte de Planillas — Municipalidad Provincial de Ica

Sistema web para centralizar, consultar y gestionar **19 planillas de pago**
(remuneraciones) de distintos regímenes laborales (Obreros, Empleados, CAS,
Pensionistas y Autoridades).

Permite ver cada planilla en tabla con **paginación de 50 en 50 (server-side) y refresco en
vivo** (Realtime), búsqueda/orden y edición en línea, editar/eliminar registros con
**cálculo automático de totales**, un **alta rápida** global (solo datos básicos + S.N.P.;
las planillas no tienen alta propia), **exportar** y **actualizar columnas** por **Excel**,
generar **boletas PDF** y un **reporte consolidado**, buscar a un trabajador por DNI o
nombre en las 19 planillas a la vez, un **dashboard** con KPIs y gráficos, **auditoría**
de cambios, **gestión de usuarios/roles** y actualizaciones en **tiempo real**
(Supabase Realtime).

## Stack

- **React 19** + **Vite 8** + **react-router-dom 7**
- **Tailwind CSS 3** (color institucional `primary #003366`)
- **@tanstack/react-table** · **xlsx** · **jspdf** + **jspdf-autotable** · **recharts** · **lucide-react** · **react-hot-toast**
- **Supabase** (PostgreSQL + Auth + Realtime + RLS + RPC) como backend

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
`observaciones → tipo_acto_administrativo` en las 19 tablas conservando los registros.

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

Los usuarios se dan de alta invitándolos desde **Supabase → Authentication → Invite
user**; aparecen como `consultor` y un administrador les asigna el rol desde la página
**Usuarios** de la app.

## Documentación

- **`CLAUDE.md`** — guía de arquitectura (fuente única `planillas.js`, flujo de datos, roles, BD).
- **`MAPEO_GENERAL.md`** — referencia completa de todo lo implementado.
- **`TECNOLOGIAS.md`** — listado detallado de tecnologías y versiones.

> ⚠️ El proyecto vive en el subdirectorio anidado `…/Reporte_Planillas/Reporte_Planillas/`
> (la carpeta interna contiene `package.json`, `src/`, `supabase/`, etc.).
