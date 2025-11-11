"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUnifiedAuthSafe } from '@/context/UnifiedAuthContext';
import { AnchorView } from "@/components/anchor-view";
import { Skeleton } from '@/components/ui/skeleton';

export default function AppPage() {
  const { isAuthenticated, loading: isLoading, user } = useUnifiedAuthSafe();
  const router = useRouter();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    // Only redirect after hydration is complete
    if (isHydrated && !isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isHydrated, isAuthenticated, isLoading, router]);

  // Show loading state while initializing or before hydration
  if (!isHydrated || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-lg" />
          <Skeleton className="h-8 w-64" />
          <div className="text-sm text-gray-500">
            Carregando...
          </div>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!isAuthenticated || !user) {
    return null; // Will redirect via useEffect
  }

  return (
    <main className="flex min-h-screen flex-col">
      <AnchorView />
    </main>
  );
}