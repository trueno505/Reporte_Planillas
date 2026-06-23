import { NavLink } from 'react-router-dom'
import { LayoutDashboard, ChevronDown, ChevronRight, Search, Clock, UserCog, FilePlus } from 'lucide-react'
import { useState } from 'react'
import { PLANILLAS, GRUPOS } from '../config/planillas'
import { useAuth } from '../context/auth-context'

const navLinkClass = ({ isActive }) =>
  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition ${
    isActive ? 'bg-white/20 text-white' : 'text-blue-100 hover:bg-white/10'
  }`

export default function Sidebar({ open, onClose }) {
  const [expanded, setExpanded] = useState({})
  const { isAdmin } = useAuth()

  const toggle = (g) => setExpanded((prev) => ({ ...prev, [g]: !prev[g] }))

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/30 z-20 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-primary z-30 flex flex-col transition-transform duration-200
          ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto`}
      >
        <div className="px-5 py-5 border-b border-white/10">
          <p className="text-white font-bold text-sm leading-tight">Municipalidad Provincial de Ica</p>
          <p className="text-blue-200 text-xs mt-0.5">Reporte de Planillas</p>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 space-y-0.5 px-2">
          {/* Rutas fijas */}
          <NavLink to="/dashboard" onClick={onClose} className={navLinkClass}>
            <LayoutDashboard size={16} />
            Inicio
          </NavLink>
          <NavLink to="/buscar" onClick={onClose} className={navLinkClass}>
            <Search size={16} />
            Búsqueda global
          </NavLink>

          {/* Admin-only */}
          {isAdmin && (
            <>
              <NavLink to="/nuevo-registro" onClick={onClose} className={navLinkClass}>
                <FilePlus size={16} />
                Nuevo registro
              </NavLink>
              <NavLink to="/auditoria" onClick={onClose} className={navLinkClass}>
                <Clock size={16} />
                Historial
              </NavLink>
              <NavLink to="/usuarios" onClick={onClose} className={navLinkClass}>
                <UserCog size={16} />
                Usuarios
              </NavLink>
            </>
          )}

          {/* Separador */}
          <div className="border-t border-white/10 my-2" />

          {/* Planillas agrupadas */}
          {GRUPOS.map((grupo) => {
            const items = PLANILLAS.filter((p) => p.grupo === grupo)
            const isOpen = expanded[grupo] !== false
            return (
              <div key={grupo}>
                <button
                  onClick={() => toggle(grupo)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider text-blue-300 hover:bg-white/10 transition"
                >
                  {grupo}
                  {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </button>
                {isOpen && (
                  <div className="ml-2 space-y-0.5">
                    {items.map((p) => (
                      <NavLink
                        key={p.slug}
                        to={`/planilla/${p.slug}`}
                        onClick={onClose}
                        className={({ isActive }) =>
                          `block px-3 py-1.5 rounded-lg text-xs transition ${
                            isActive ? 'bg-white/20 text-white' : 'text-blue-100 hover:bg-white/10'
                          }`
                        }
                      >
                        {p.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
