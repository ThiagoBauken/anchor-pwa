/**
 * Authentication Helpers para Server Actions
 *
 * Fornece funções para verificar autenticação e autorização
 * em server actions (funções 'use server')
 */

import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import type { User } from '@/types';

// JWT Secret must be the same as in auth.ts
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required');
}

/**
 * Busca o usuário autenticado do cookie JWT
 * Retorna null se não houver sessão válida
 */
export async function getAuthenticatedUser(): Promise<User | null> {
  try {
    console.log('[AuthHelpers] Attempting to get auth token from cookies...');

    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token');

    if (!token) {
      console.log('[AuthHelpers] No auth-token cookie found');
      return null;
    }

    console.log('[AuthHelpers] Auth token found, verifying...');

    // Verify JWT token
    let decoded: any;
    try {
      decoded = jwt.verify(token.value, JWT_SECRET);
    } catch (jwtError) {
      console.error('[AuthHelpers] JWT verification failed:', jwtError);
      return null;
    }

    if (!decoded || !decoded.id) {
      console.log('[AuthHelpers] Invalid token payload');
      return null;
    }

    console.log('[AuthHelpers] Token verified for user ID:', decoded.id);

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        company: true
      }
    });

    if (!user || !user.active) {
      console.log('[AuthHelpers] User not found or inactive:', decoded.id);
      return null;
    }

    console.log('[AuthHelpers] User authenticated:', {
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name || '',
      role: user.role as any,
      companyId: user.companyId,
      company: user.company as any,
      active: user.active,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    } as User;
  } catch (error) {
    console.error('[AuthHelpers] Error in getAuthenticatedUser:', error);
    console.error('[AuthHelpers] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return null;
  }
}

/**
 * Requer que o usuário esteja autenticado
 * Lança erro se não estiver
 */
export async function requireAuthentication(): Promise<User> {
  const user = await getAuthenticatedUser();

  if (!user) {
    throw new Error('Authentication required. Please log in.');
  }

  return user;
}

/**
 * Verifica se o usuário tem acesso à empresa especificada
 * Lança erro se não tiver acesso
 */
export async function requireCompanyMatch(
  userId: string,
  resourceCompanyId: string
): Promise<void> {
  console.log('[AuthHelpers] Checking company match:', { userId, resourceCompanyId });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { companyId: true, role: true }
  });

  if (!user) {
    console.error('[AuthHelpers] User not found:', userId);
    throw new Error('User not found');
  }

  console.log('[AuthHelpers] User company check:', {
    userId,
    userCompanyId: user.companyId,
    resourceCompanyId,
    userRole: user.role,
    isSuperadmin: user.role === 'superadmin'
  });

  // Superadmin pode acessar qualquer empresa
  if (user.role === 'superadmin') {
    console.log('[AuthHelpers] Access granted: User is superadmin');
    return;
  }

  // Outros usuários só podem acessar sua própria empresa
  if (user.companyId !== resourceCompanyId) {
    console.error('[AuthHelpers] Company mismatch:', {
      userCompanyId: user.companyId,
      requestedCompanyId: resourceCompanyId
    });
    throw new Error('Access denied: Company mismatch');
  }

  console.log('[AuthHelpers] Access granted: Company match confirmed');
}

/**
 * Verifica se o usuário tem acesso a um projeto
 * Lança erro se não tiver acesso
 */
export async function requireProjectAccess(
  userId: string,
  projectId: string
): Promise<void> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { companyId: true }
  });

  if (!project) {
    throw new Error('Project not found');
  }

  await requireCompanyMatch(userId, project.companyId);
}

/**
 * Verifica se o usuário tem uma das roles permitidas
 * Lança erro se não tiver
 */
export async function requireRole(
  user: User,
  allowedRoles: string[]
): Promise<void> {
  if (!allowedRoles.includes(user.role)) {
    throw new Error(
      `Access denied: Requires one of these roles: ${allowedRoles.join(', ')}`
    );
  }
}

/**
 * Verifica se o recurso pertence ao usuário
 * Útil para operações de update/delete
 */
export async function requireOwnership(
  userId: string,
  resourceUserId: string | null | undefined
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  });

  // Superadmin pode editar/deletar qualquer coisa
  if (user?.role === 'superadmin') {
    return;
  }

  if (resourceUserId !== userId) {
    throw new Error('Access denied: You can only modify your own resources');
  }
}

/**
 * Helper para log de auditoria
 * Registra ações importantes no console (pode ser expandido para BD)
 */
export function logAction(
  action: string,
  userId: string,
  details?: Record<string, any>
): void {
  console.log(`[Audit] ${action}`, {
    userId,
    timestamp: new Date().toISOString(),
    ...details
  });
}
