"use client";

import { useState, useEffect } from 'react'
import { useTrial } from '@/hooks/use-trial'
import { useUnifiedAuthSafe } from '@/context/UnifiedAuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, CreditCard, LogOut } from 'lucide-react'
import Link from 'next/link'

function TrialExpiredContent() {
  const { company: currentCompany, user: currentUser, logout } = useUnifiedAuthSafe()
  const { isExpired, canUseApp } = useTrial()

  // 🔧 FIX: Superadmin NEVER sees trial expired overlay
  if (currentUser?.role === 'superadmin') {
    return null
  }

  // Don't show overlay if user can use app or has paid subscription
  if (!currentCompany || canUseApp || (currentCompany.subscriptionPlan !== 'trial' && currentCompany.subscriptionStatus === 'active')) {
    return null
  }

  // Only show when trial is expired
  if (!isExpired) {
    return null
  }

  // 🔧 FIX: Diferentes mensagens baseadas no role
  // - company_admin: pode assinar plano (mostra botão de pagamento)
  // - team_admin/technician: deve contactar o admin da empresa
  const isCompanyAdmin = currentUser?.role === 'company_admin'

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-xl">
            {isCompanyAdmin ? 'Teste Gratuito Expirado' : 'Acesso Bloqueado'}
          </CardTitle>
          <CardDescription>
            {isCompanyAdmin
              ? 'O período de teste gratuito de 14 dias da sua empresa chegou ao fim.'
              : 'A assinatura da sua empresa expirou.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isCompanyAdmin ? (
            // 👨‍💼 Mensagem para COMPANY ADMIN (pode pagar)
            <>
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Para continuar usando o AnchorView com todos os recursos, escolha um plano que melhor atende suas necessidades.
                </p>
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-sm font-medium">
                    ✅ Pontos de ancoragem ilimitados<br/>
                    ✅ Projetos ilimitados<br/>
                    ✅ Relatórios personalizados<br/>
                    ✅ Suporte técnico<br/>
                    ✅ Backup automático
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button asChild className="w-full" size="lg">
                  <Link href="/billing">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Ver Planos e Preços
                  </Link>
                </Button>

                <Button
                  variant="outline"
                  onClick={logout}
                  className="w-full"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair da Conta
                </Button>
              </div>
            </>
          ) : (
            // 👷 Mensagem para USUÁRIOS CONVIDADOS (team_admin, technician)
            <>
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Você foi convidado para fazer parte desta empresa. A assinatura é de responsabilidade do administrador da empresa.
                </p>
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-lg">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                    ⚠️ Entre em contato com o administrador da empresa <strong>{currentCompany?.name}</strong> para renovar a assinatura.
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Você não pode assinar individualmente pois faz parte de uma organização.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  variant="outline"
                  onClick={logout}
                  className="w-full"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair da Conta
                </Button>
              </div>
            </>
          )}

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Dúvidas? Entre em contato conosco pelo email:
              <a href="mailto:suporte@anchorview.com" className="text-primary hover:underline ml-1">
                suporte@anchorview.com
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function TrialExpiredOverlay() {
  // Use a state to track if providers are available
  const [providersReady, setProvidersReady] = useState(false)

  useEffect(() => {
    // Small delay to ensure providers are mounted
    const timer = setTimeout(() => {
      setProvidersReady(true)
    }, 100)
    
    return () => clearTimeout(timer)
  }, [])

  if (!providersReady) {
    return null
  }

  return <TrialExpiredContent />
}