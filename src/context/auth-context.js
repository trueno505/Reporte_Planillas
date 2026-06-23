import { createContext, useContext } from 'react'

// Contexto y hook separados del componente AuthProvider para que AuthContext.jsx
// solo exporte componentes (requisito de React Fast Refresh / HMR).
export const AuthContext = createContext(null)

export function useAuth() {
  return useContext(AuthContext)
}
