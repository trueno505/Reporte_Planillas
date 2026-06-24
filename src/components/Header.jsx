import { Menu, LogOut, User } from 'lucide-react'
import { useAuth } from '../context/auth-context'

const ROL_BADGE = {
  administrador: 'bg-primary text-white',
  editor: 'bg-amber-500 text-white',
  consultor: 'bg-gray-100 text-gray-600',
}

export default function Header({ onMenuClick }) {
  const { perfil, signOut } = useAuth()

  return (
    <header className="sticky top-0 z-10 bg-white border-b border-gray-200 flex items-center justify-between px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100"
          aria-label="Menú"
        >
          <Menu size={20} className="text-primary" />
        </button>
        <span className="text-primary font-semibold text-sm hidden sm:block">
          Municipalidad Provincial de Ica
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm text-gray-600">
          <User size={15} />
          <span>{perfil?.nombre ?? '—'}</span>
          <span
            className={`px-1.5 py-0.5 rounded text-xs font-medium ${
              ROL_BADGE[perfil?.rol] ?? 'bg-gray-100 text-gray-600'
            }`}
          >
            {perfil?.rol ?? ''}
          </span>
        </div>
        <button
          onClick={signOut}
          title="Cerrar sesión"
          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition"
        >
          <LogOut size={17} />
        </button>
      </div>
    </header>
  )
}
