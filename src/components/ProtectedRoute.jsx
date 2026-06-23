import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/auth-context'

export default function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />
  return children
}
