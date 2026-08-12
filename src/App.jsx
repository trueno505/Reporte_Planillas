import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { lazy, Suspense } from 'react'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'

// Login se importa de forma estática: es la primera pantalla que ve un usuario
// sin sesión, así que no tiene sentido diferirla. El resto de páginas se cargan
// bajo demanda, de modo que el bundle inicial no arrastra el código (ni las
// librerías) de pantallas a las que quizá nunca se entre.
const Restablecer = lazy(() => import('./pages/Restablecer'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const PlanillaPage = lazy(() => import('./pages/PlanillaPage'))
const NuevoRegistro = lazy(() => import('./pages/NuevoRegistro'))
const BusquedaGlobal = lazy(() => import('./pages/BusquedaGlobal'))
const Auditoria = lazy(() => import('./pages/Auditoria'))
const Usuarios = lazy(() => import('./pages/Usuarios'))
const MiPerfil = lazy(() => import('./pages/MiPerfil'))

// Mismo spinner que usa ProtectedRoute mientras resuelve la sesión, para que la
// transición entre "cargando sesión" y "cargando página" se vea continua.
function CargandoPagina() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        <Suspense fallback={<CargandoPagina />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/restablecer" element={<Restablecer />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/nuevo-registro" element={<ProtectedRoute><NuevoRegistro /></ProtectedRoute>} />
            <Route path="/planilla/:slug" element={<ProtectedRoute><PlanillaPage /></ProtectedRoute>} />
            <Route path="/buscar" element={<ProtectedRoute><BusquedaGlobal /></ProtectedRoute>} />
            <Route path="/perfil" element={<ProtectedRoute><MiPerfil /></ProtectedRoute>} />
            <Route path="/auditoria" element={<ProtectedRoute><Auditoria /></ProtectedRoute>} />
            <Route path="/usuarios" element={<ProtectedRoute><Usuarios /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}
