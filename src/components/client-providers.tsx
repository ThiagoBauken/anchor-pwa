'use client'

import { useEffect, useState } from 'react'
import { SessionProvider } from 'next-auth/react'
import { UnifiedAuthProvider } from '@/context/UnifiedAuthContext'
import { AnchorDataProvider } from '@/context/AnchorDataContext'

/**
 * ClientProviders
 *
 * Consolidated provider structure:
 * - SessionProvider: NextAuth session management
 * - UnifiedAuthProvider: Unified auth and JWT management
 * - AnchorDataProvider: Application state management
 */
export function ClientProviders({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Return a simpler placeholder during SSR to avoid hydration mismatches
  if (!isMounted) {
    return <>{children}</>
  }

  return (
    <SessionProvider>
      <UnifiedAuthProvider>
        <AnchorDataProvider>
          {children}
        </AnchorDataProvider>
      </UnifiedAuthProvider>
    </SessionProvider>
  )
}
