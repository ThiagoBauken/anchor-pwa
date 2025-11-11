'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { registerUser, loginUser, logoutUser, getCurrentUser } from '@/app/actions/auth'
import logger from '@/lib/logger'
import type { User, Company } from '@/types'

/**
 * UnifiedAuthContext
 *
 * Provides centralized authentication functionality with server-side authentication.
 *
 * Features:
 * - Server-side authentication with JWT tokens (httpOnly cookies)
 * - User session management
 * - Trial management and subscription tracking
 * - Automatic session initialization
 */

interface UnifiedAuthContextType {
  // User state
  user: User | null
  company: Company | null
  loading: boolean
  isAuthenticated: boolean

  // Authentication methods
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>
  register: (data: RegisterData) => Promise<{ success: boolean; message: string }>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

interface RegisterData {
  companyName: string
  name: string
  email: string
  password: string
  phone?: string
  companyType?: 'administradora' | 'alpinista'
}

const UnifiedAuthContext = createContext<UnifiedAuthContextType | null>(null)

export function UnifiedAuthProvider({ children }: { children: ReactNode }) {
  // User state
  const [user, setUser] = useState<User | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)

  const router = useRouter()

  // Initialize on mount
  useEffect(() => {
    initializeAuth()
  }, [])

  /**
   * Initialize authentication on mount
   * Loads current user from server via JWT cookie
   */
  const initializeAuth = async () => {
    try {
      setLoading(true)

      // Get current user from server (via JWT cookie)
      const currentUser = await getCurrentUser()

      if (currentUser) {
        const userData: User = {
          id: currentUser.id,
          email: currentUser.email,
          name: currentUser.name,
          role: currentUser.role,
          companyId: currentUser.companyId,
          active: true
        }

        setUser(userData)
        setCompany(currentUser.company as Company)

        logger.system('✅ Authenticated from server:', currentUser.name)
      }
    } catch (error) {
      logger.error('Failed to initialize auth:', error)
      await clearSession()
    } finally {
      setLoading(false)
    }
  }

  /**
   * Login with email and password
   * Authenticates via server action
   */
  const login = async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
    try {
      setLoading(true)

      // Authenticate with server
      const result = await loginUser(email, password)

      if (result.success && result.user) {
        const userData: User = {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
          companyId: result.user.companyId,
          active: true
        }

        setUser(userData)
        setCompany(result.company || null)

        logger.system('✅ Server login successful:', result.user.name)

        router.push('/app')

        return result
      }

      return result

    } catch (error) {
      logger.error('Login error:', error)
      return { success: false, message: 'Erro ao fazer login' }
    } finally {
      setLoading(false)
    }
  }

  /**
   * Register new user and company
   * Creates account via server action
   */
  const register = async (data: RegisterData): Promise<{ success: boolean; message: string }> => {
    try {
      setLoading(true)

      // Register with server
      const result = await registerUser(data)

      if (result.success && result.user) {
        const userData: User = {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
          companyId: result.user.companyId,
          active: true
        }

        setUser(userData)
        setCompany(result.company || null)

        logger.system('✅ Registration successful:', result.user.name)

        router.push('/app')

        return result
      }

      return result

    } catch (error) {
      logger.error('Registration error:', error)
      return { success: false, message: 'Erro ao criar conta' }
    } finally {
      setLoading(false)
    }
  }

  /**
   * Logout user
   * Clears server session and local state
   */
  const logout = async (): Promise<void> => {
    try {
      // Logout from server
      await logoutUser()

      // Clear local state
      await clearSession()

      logger.system('✅ Logout successful')

      router.push('/auth/login')
    } catch (error) {
      logger.error('Logout error:', error)

      // Clear local state anyway
      await clearSession()
      router.push('/auth/login')
    }
  }

  /**
   * Clear local session data
   */
  const clearSession = async () => {
    setUser(null)
    setCompany(null)
  }

  /**
   * Refresh user data from server
   */
  const refreshUser = async (): Promise<void> => {
    try {
      const currentUser = await getCurrentUser()

      if (currentUser) {
        const userData: User = {
          id: currentUser.id,
          email: currentUser.email,
          name: currentUser.name,
          role: currentUser.role,
          companyId: currentUser.companyId,
          active: true
        }

        setUser(userData)
        setCompany(currentUser.company as Company)

        logger.log('✅ User refreshed:', currentUser.name)
      } else {
        // No valid session, logout
        await logout()
      }
    } catch (error) {
      logger.error('Failed to refresh user:', error)
    }
  }

  const contextValue: UnifiedAuthContextType = {
    // User state
    user,
    company,
    loading,
    isAuthenticated: !!user,

    // Authentication methods
    login,
    register,
    logout,
    refreshUser
  }

  return (
    <UnifiedAuthContext.Provider value={contextValue}>
      {children}
    </UnifiedAuthContext.Provider>
  )
}

/**
 * Hook to use UnifiedAuthContext
 * Throws error if used outside provider
 */
export function useUnifiedAuth() {
  const context = useContext(UnifiedAuthContext)
  if (!context) {
    throw new Error('useUnifiedAuth must be used within UnifiedAuthProvider')
  }
  return context
}

/**
 * Safe hook that doesn't throw if provider is not present
 * Useful during hydration or in components that may render before provider
 */
export function useUnifiedAuthSafe() {
  const context = useContext(UnifiedAuthContext)

  if (!context) {
    return {
      user: null,
      company: null,
      loading: false,
      isAuthenticated: false,
      login: async () => ({ success: false, message: 'Auth not initialized' }),
      register: async () => ({ success: false, message: 'Auth not initialized' }),
      logout: async () => {},
      refreshUser: async () => {}
    }
  }

  return context
}

export default UnifiedAuthContext
