import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)        // { token, user_id, name, email }
  const [cartCount, setCartCount] = useState(0)
  const [loading, setLoading] = useState(true)  // checking localStorage on mount

  // Restore session from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('auth_user')
    if (stored) {
      try {
        setUser(JSON.parse(stored))
      } catch {
        localStorage.removeItem('auth_user')
      }
    }
    setLoading(false)
  }, [])

  const login = useCallback((authData) => {
    // authData = { token, user_id, name, email }
    setUser(authData)
    localStorage.setItem('auth_user', JSON.stringify(authData))
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    setCartCount(0)
    localStorage.removeItem('auth_user')
  }, [])

  const updateCartCount = useCallback((count) => {
    setCartCount(count)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout, cartCount, updateCartCount, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
