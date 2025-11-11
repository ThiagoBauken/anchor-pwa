"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUnifiedAuthSafe } from '@/context/UnifiedAuthContext'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user: currentUser, isAuthenticated, loading: isLoading } = useUnifiedAuthSafe()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && isAuthenticated && currentUser?.role !== 'superadmin') {
      // Redirect non-superadmin users
      router.push('/')
    }
  }, [isAuthenticated, currentUser, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Verificando permissões...</div>
      </div>
    )
  }

  if (!isAuthenticated || currentUser?.role !== 'superadmin') {
    return null // Will redirect via useEffect
  }

  return <>{children}</>
}