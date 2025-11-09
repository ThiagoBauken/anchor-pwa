import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireProjectAccess } from '@/middleware/auth-middleware'

interface SyncOperation {
  id: string
  operation: 'create' | 'update' | 'delete'
  table: 'companies' | 'users' | 'projects' | 'locations' | 'anchor_points' | 'anchor_tests'
  data: any
  timestamp: number
  retries: number
  status: 'pending' | 'syncing' | 'synced' | 'failed'
}

interface SyncResponse {
  success: boolean
  results: { success: boolean; error?: string; id: string }[]
  serverData: {
    projects: any[]
    locations: any[]
    users: any[]
    anchorPoints: any[]
    anchorTests: any[]
  }
  syncTimestamp: string
  message: string
}

/**
 * POST /api/sync
 *
 * Endpoint genérico de sincronização usado pelo sync-manager
 * Processa operações pendentes da fila do IndexedDB
 */
export async function POST(request: NextRequest): Promise<NextResponse<SyncResponse>> {
  try {
    // 1. VERIFICAR AUTENTICAÇÃO
    const authResult = await requireAuth(request)
    if (authResult.error) {
      return NextResponse.json({
        success: false,
        results: [],
        serverData: { projects: [], locations: [], users: [], anchorPoints: [], anchorTests: [] },
        syncTimestamp: new Date().toISOString(),
        message: authResult.error
      } as SyncResponse, { status: authResult.status || 401 })
    }

    const { user } = authResult
    console.log(`[Sync] Authenticated user: ${user!.email}`)

    const body = await request.json()
    const { operations, lastSync, companyId, userId } = body

    const results: { success: boolean; error?: string; id: string }[] = []

    // 2. PROCESSAR OPERAÇÕES
    if (operations && Array.isArray(operations)) {
      for (const operation of operations) {
        try {
          const result = await processOperation(operation, user!.id)
          results.push({
            success: result.success,
            error: result.error,
            id: operation.id
          })
        } catch (error) {
          results.push({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            id: operation.id
          })
        }
      }
    }

    // 3. BUSCAR DADOS ATUALIZADOS DO SERVIDOR
    const serverData = await fetchServerUpdates(companyId, lastSync, user!.id)

    const syncTimestamp = new Date().toISOString()

    console.log(`[Sync] Completed: ${results.filter(r => r.success).length}/${results.length} successful`)

    return NextResponse.json({
      success: true,
      results,
      serverData,
      syncTimestamp,
      message: `Sync completed: ${results.filter(r => r.success).length}/${results.length} operations successful`
    } as SyncResponse)

  } catch (error) {
    console.error('[Sync] Error:', error)
    return NextResponse.json({
      success: false,
      results: [],
      serverData: { projects: [], locations: [], users: [], anchorPoints: [], anchorTests: [] },
      syncTimestamp: new Date().toISOString(),
      message: error instanceof Error ? error.message : 'Unknown error'
    } as SyncResponse, { status: 500 })
  }
}

async function processOperation(operation: SyncOperation, userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { table, operation: op, data } = operation

    switch (table) {
      case 'anchor_points':
        return await processAnchorPoint(op, data, userId)

      case 'anchor_tests':
        return await processAnchorTest(op, data)

      case 'projects':
        return await processProject(op, data, userId)

      default:
        return { success: false, error: `Unsupported table: ${table}` }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function processAnchorPoint(op: string, data: any, userId: string) {
  try {
    switch (op) {
      case 'create':
        await prisma.anchorPoint.create({
          data: {
            ...data,
            createdByUserId: userId,
            lastModifiedByUserId: userId
          }
        })
        break

      case 'update':
        await prisma.anchorPoint.update({
          where: { id: data.id },
          data: {
            ...data,
            lastModifiedByUserId: userId
          }
        })
        break

      case 'delete':
        await prisma.anchorPoint.update({
          where: { id: data.id },
          data: { archived: true }
        })
        break
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function processAnchorTest(op: string, data: any) {
  try {
    switch (op) {
      case 'create':
        await prisma.anchorTest.create({ data })
        break

      case 'update':
        await prisma.anchorTest.update({
          where: { id: data.id },
          data
        })
        break

      case 'delete':
        await prisma.anchorTest.delete({
          where: { id: data.id }
        })
        break
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function processProject(op: string, data: any, userId: string) {
  try {
    switch (op) {
      case 'create':
        await prisma.project.create({ data })
        break

      case 'update':
        await prisma.project.update({
          where: { id: data.id },
          data
        })
        break

      case 'delete':
        await prisma.project.update({
          where: { id: data.id },
          data: { deleted: true }
        })
        break
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function fetchServerUpdates(companyId: string, lastSync: string | null, userId: string) {
  const lastSyncDate = lastSync ? new Date(lastSync) : new Date(0)

  try {
    const [projects, locations, users, anchorPoints, anchorTests] = await Promise.all([
      prisma.project.findMany({
        where: {
          companyId,
          deleted: false, // CRITICAL: Filter out deleted projects
          updatedAt: { gte: lastSyncDate }
        }
      }),

      prisma.location.findMany({
        where: {
          companyId,
          project: { updatedAt: { gte: lastSyncDate } }
        }
      }),

      prisma.user.findMany({
        where: {
          companyId,
          updatedAt: { gte: lastSyncDate }
        }
      }),

      prisma.anchorPoint.findMany({
        where: {
          project: { companyId },
          archived: false,
          dataHora: { gte: lastSyncDate }
        }
      }),

      prisma.anchorTest.findMany({
        where: {
          anchorPoint: { project: { companyId } },
          dataHora: { gte: lastSyncDate }
        }
      })
    ])

    return {
      projects,
      locations,
      users,
      anchorPoints,
      anchorTests
    }
  } catch (error) {
    console.error('[Sync] Error fetching server updates:', error)
    return {
      projects: [],
      locations: [],
      users: [],
      anchorPoints: [],
      anchorTests: []
    }
  }
}
