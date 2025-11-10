import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * Middleware para Next.js 15
 *
 * Responsabilidades:
 * 1. Verificar autenticação em rotas protegidas
 * 2. Enforçar expiração de trial
 * 3. Verificar status de subscription
 * 4. Redirecionar usuários não autenticados
 */

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for public routes
  const publicPaths = [
    '/',
    '/auth/login',
    '/auth/register',
    '/auth/error',
    '/auth/setup',
    '/public',
    '/_next',
    '/api/auth',
    '/favicon.ico',
  ];

  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
  if (isPublicPath) {
    return NextResponse.next();
  }

  // Get user token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET
  });

  // Redirect to login if not authenticated
  if (!token) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const user = token.user as any;
  const company = user?.company;

  // ✅ CRITICAL FIX: Trial Expiration Enforcement
  if (company && company.subscriptionStatus === 'trialing') {
    const trialEnd = new Date(company.trialEndDate);
    const now = new Date();

    if (now > trialEnd) {
      // Trial expired - redirect to billing unless already there
      if (!pathname.startsWith('/billing')) {
        const billingUrl = new URL('/billing', request.url);
        billingUrl.searchParams.set('reason', 'trial_expired');
        billingUrl.searchParams.set('message', 'Seu período de teste expirou. Assine um plano para continuar.');

        console.warn(
          `[Middleware] Trial expired for company ${company.id} (${company.name}). ` +
          `Expired on: ${trialEnd.toISOString()}`
        );

        return NextResponse.redirect(billingUrl);
      }
    }
  }

  // ✅ CRITICAL FIX: Subscription Status Enforcement
  if (company && company.subscriptionStatus === 'canceled') {
    if (!pathname.startsWith('/billing')) {
      const billingUrl = new URL('/billing', request.url);
      billingUrl.searchParams.set('reason', 'subscription_canceled');
      billingUrl.searchParams.set('message', 'Sua assinatura foi cancelada. Reative para continuar usando o sistema.');

      console.warn(
        `[Middleware] Subscription canceled for company ${company.id} (${company.name})`
      );

      return NextResponse.redirect(billingUrl);
    }
  }

  // ✅ Additional check: Subscription past_due
  if (company && company.subscriptionStatus === 'past_due') {
    if (!pathname.startsWith('/billing')) {
      const billingUrl = new URL('/billing', request.url);
      billingUrl.searchParams.set('reason', 'payment_failed');
      billingUrl.searchParams.set('message', 'Seu pagamento falhou. Atualize suas informações de pagamento.');

      console.warn(
        `[Middleware] Payment past due for company ${company.id} (${company.name})`
      );

      return NextResponse.redirect(billingUrl);
    }
  }

  // ✅ Superadmin bypass - always allow access
  if (user?.role === 'superadmin') {
    return NextResponse.next();
  }

  // ✅ Warning: Trial expiring soon (3 days)
  if (company && company.subscriptionStatus === 'trialing') {
    const trialEnd = new Date(company.trialEndDate);
    const now = new Date();
    const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysRemaining <= 3 && daysRemaining > 0) {
      // Add header to show warning banner in UI
      const response = NextResponse.next();
      response.headers.set('X-Trial-Warning', 'true');
      response.headers.set('X-Trial-Days-Remaining', daysRemaining.toString());
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
