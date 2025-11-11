# 🗄️ MIGRAÇÃO PARA POSTGRESQL - GUIA COMPLETO

## 📋 Status Atual

### ✅ O QUE JÁ ESTÁ PRONTO
- **Schema Prisma**: Tabelas AnchorPoint, AnchorTest, FloorPlan já existem
- **Server Actions**: `anchor-actions.ts` e `floorplan-actions.ts` completamente implementados
- **Build**: Projeto compila sem erros

### ❌ O QUE PRECISA SER FEITO
- **AnchorDataContext**: Ainda usa localStorage para Points, Tests e FloorPlans
- **Migração de Dados**: Dados existentes no localStorage precisam ser migrados para PostgreSQL

---

## 🔧 MODIFICAÇÕES NECESSÁRIAS NO `AnchorDataContext.tsx`

### 1. CARREGAR POINTS E TESTS DO BANCO (linha 292-332)

**SUBSTITUIR ESTA SEÇÃO:**
```typescript
// Load points and tests from localStorage (MIGRATION: will be moved to IndexedDB only)
try {
    const pointsStr = localStorage.getItem('anchorViewPoints');
    const testsStr = localStorage.getItem('anchorViewTests');

    if (pointsStr && pointsStr.length < 5 * 1024 * 1024) {
        savedPoints = JSON.parse(pointsStr);
    }

    if (testsStr && testsStr.length < 5 * 1024 * 1024) {
        savedTests = JSON.parse(testsStr);
    }
}

if (!isCancelled) setAllPoints(savedPoints);
if (!isCancelled) setAllTests(savedTests);
```

**POR:**
```typescript
// ✅ MIGRATED: Load points and tests from PostgreSQL
if (savedProject?.id) {
    try {
        const { getAnchorPointsForProject, getArchivedAnchorPointsForProject } = await import('@/app/actions/anchor-actions');
        const { getAnchorTestsForProject } = await import('@/app/actions/anchor-actions');

        // Load points (both active and archived if showArchived is true)
        const [activePoints, archivedPoints, tests] = await Promise.all([
            getAnchorPointsForProject(savedProject.id),
            showArchived ? getArchivedAnchorPointsForProject(savedProject.id) : Promise.resolve([]),
            getAnchorTestsForProject(savedProject.id)
        ]);

        savedPoints = [...activePoints, ...archivedPoints];
        savedTests = tests;

        console.log(`✅ [DB] Loaded: ${savedPoints.length} points, ${savedTests.length} tests from PostgreSQL`);
    } catch (error) {
        logger.error('❌ Failed to load points/tests from database, using localStorage fallback:', error);
        // Fallback to localStorage only if DB fails
        try {
            const pointsStr = localStorage.getItem('anchorViewPoints');
            const testsStr = localStorage.getItem('anchorViewTests');

            if (pointsStr) savedPoints = JSON.parse(pointsStr);
            if (testsStr) savedTests = JSON.parse(testsStr);

            logger.warn(`⚠️ Using localStorage fallback: ${savedPoints.length} points, ${savedTests.length} tests`);
        } catch (fallbackError) {
            logger.error('❌ Fallback to localStorage also failed:', fallbackError);
        }
    }
}

if (!isCancelled) setAllPoints(savedPoints);
if (!isCancelled) setAllTests(savedTests);
```

---

### 2. ADD POINT - Usar Server Action (linha 619-637)

**SUBSTITUIR:**
```typescript
const addPoint = useCallback((pointData: Omit<AnchorPoint, 'id' | 'dataHora' | 'status' | 'createdByUserId' | 'lastModifiedByUserId' | 'archived'>) => {
    logger.log('[DEBUG] addPoint called:', { pointData, currentUser: currentUser?.id });
    if (!currentUser) {
      logger.error('[ERROR] addPoint: No user selected');
      alert("Por favor, selecione um usuário primeiro.");
      return;
    }
    const newPoint: AnchorPoint = {
      ...pointData,
      id: Date.now().toString(),
      dataHora: new Date().toISOString(),
      status: 'Não Testado',
      createdByUserId: currentUser.id,
      lastModifiedByUserId: currentUser.id,
      archived: false,
    };
    setAllPoints(prevPoints => [...prevPoints, newPoint]);
    logger.log('[DEBUG] Point added successfully:', newPoint);
  }, [currentUser]);
```

**POR:**
```typescript
const addPoint = useCallback(async (pointData: Omit<AnchorPoint, 'id' | 'dataHora' | 'status' | 'createdByUserId' | 'lastModifiedByUserId' | 'archived'>) => {
    logger.log('[DEBUG] addPoint called:', { pointData, currentUser: currentUser?.id });
    if (!currentUser) {
      logger.error('[ERROR] addPoint: No user selected');
      alert("Por favor, selecione um usuário primeiro.");
      return;
    }

    try {
      // ✅ MIGRATED: Call server action
      const { addAnchorPoint } = await import('@/app/actions/anchor-actions');
      const newPoint = await addAnchorPoint(pointData);

      // Update local state
      setAllPoints(prevPoints => [...prevPoints, newPoint as any]);
      logger.log('[DEBUG] Point added successfully to PostgreSQL:', newPoint);
    } catch (error) {
      logger.error('[ERROR] addPoint failed:', error);
      alert('Erro ao adicionar ponto. Tente novamente.');
    }
  }, [currentUser]);
```

---

### 3. EDIT POINT - Usar Server Action (linha 639-657)

**SUBSTITUIR:**
```typescript
const editPoint = useCallback((pointId: string, updates: Partial<Omit<AnchorPoint, 'id' | 'projectId'>>) => {
      logger.log('[DEBUG] editPoint called:', { pointId, updates, currentUser: currentUser?.id });
      if (!currentUser) {
        logger.error('[ERROR] editPoint: No user selected');
        alert("Por favor, selecione um usuário primeiro.");
        return;
      }
      setAllPoints(prevPoints => prevPoints.map(p => {
          if (p.id === pointId) {
              const updatedPoint = { ...p, ...updates, lastModifiedByUserId: currentUser.id };
              if(updates.localizacao) {
                  setLastUsedLocation(updates.localizacao);
              }
              logger.log('[DEBUG] Point edited successfully:', updatedPoint);
              return updatedPoint;
          }
          return p;
      }));
  }, [currentUser]);
```

**POR:**
```typescript
const editPoint = useCallback(async (pointId: string, updates: Partial<Omit<AnchorPoint, 'id' | 'projectId'>>) => {
      logger.log('[DEBUG] editPoint called:', { pointId, updates, currentUser: currentUser?.id });
      if (!currentUser) {
        logger.error('[ERROR] editPoint: No user selected');
        alert("Por favor, selecione um usuário primeiro.");
        return;
      }

      try {
        // ✅ MIGRATED: Call server action
        const { updateAnchorPoint } = await import('@/app/actions/anchor-actions');
        const updatedPoint = await updateAnchorPoint(pointId, updates);

        // Update local state
        setAllPoints(prevPoints => prevPoints.map(p =>
          p.id === pointId ? updatedPoint as any : p
        ));

        if(updates.localizacao) {
            setLastUsedLocation(updates.localizacao);
        }

        logger.log('[DEBUG] Point edited successfully in PostgreSQL:', updatedPoint);
      } catch (error) {
        logger.error('[ERROR] editPoint failed:', error);
        alert('Erro ao editar ponto. Tente novamente.');
      }
  }, [currentUser]);
```

---

### 4. DELETE POINT (ARCHIVE) - Usar Server Action (linha 748-756)

**SUBSTITUIR:**
```typescript
const deletePoint = useCallback((id: string) => {
    logger.log('[DEBUG] deletePoint called:', { id, currentUser: currentUser?.id });
    if (!currentUser) {
      logger.error('[ERROR] deletePoint: No user selected');
      return;
    }
    setAllPoints(prev => prev.map(p => p.id === id ? { ...p, archived: true, archivedAt: new Date().toISOString(), lastModifiedByUserId: currentUser.id } : p));
    logger.log('[DEBUG] Point archived successfully');
  }, [currentUser]);
```

**POR:**
```typescript
const deletePoint = useCallback(async (id: string) => {
    logger.log('[DEBUG] deletePoint called:', { id, currentUser: currentUser?.id });
    if (!currentUser) {
      logger.error('[ERROR] deletePoint: No user selected');
      return;
    }

    try {
      // ✅ MIGRATED: Call server action
      const { archiveAnchorPoint } = await import('@/app/actions/anchor-actions');
      const archivedPoint = await archiveAnchorPoint(id);

      // Update local state
      setAllPoints(prev => prev.map(p => p.id === id ? archivedPoint as any : p));
      logger.log('[DEBUG] Point archived successfully in PostgreSQL');
    } catch (error) {
      logger.error('[ERROR] deletePoint failed:', error);
      alert('Erro ao arquivar ponto. Tente novamente.');
    }
  }, [currentUser]);
```

---

### 5. ADD TEST - Usar Server Action (linha 682-700)

**SUBSTITUIR:**
```typescript
const updatePointsAndAddTest = useCallback((pontoId: string, testData: Omit<AnchorTestResult, 'id' | 'dataHora' | 'pontoId' | 'createdByUserId'>, pointUpdates: Partial<AnchorPoint>) => {
     logger.log('[DEBUG] updatePointsAndAddTest called:', { pontoId, testData, pointUpdates });
     if (!currentUser) {
       logger.error('[ERROR] updatePointsAndAddTest: No user selected');
       alert("Por favor, selecione um usuário primeiro.");
       return;
     }
    const newTest: AnchorTest = { ...testData, id: Date.now().toString(), pontoId: pontoId, dataHora: new Date().toISOString(), createdByUserId: currentUser.id };
    setAllTests(prevTests => [...prevTests, newTest]);
    setAllPoints(prevPoints => prevPoints.map(p => {
        if (p.id === newTest.pontoId) {
          const hasUpdates = Object.keys(pointUpdates).length > 0;
          return { ...p, ...(hasUpdates ? pointUpdates : {}), status: newTest.resultado, lastModifiedByUserId: currentUser.id };
        }
        return p;
      })
    );
    logger.log('[DEBUG] Point updated and test added successfully');
  }, [currentUser]);
```

**POR:**
```typescript
const updatePointsAndAddTest = useCallback(async (pontoId: string, testData: Omit<AnchorTestResult, 'id' | 'dataHora' | 'pontoId' | 'createdByUserId'>, pointUpdates: Partial<AnchorPoint>) => {
     logger.log('[DEBUG] updatePointsAndAddTest called:', { pontoId, testData, pointUpdates });
     if (!currentUser) {
       logger.error('[ERROR] updatePointsAndAddTest: No user selected');
       alert("Por favor, selecione um usuário primeiro.");
       return;
     }

     try {
       // ✅ MIGRATED: Call server action
       const { addAnchorTest } = await import('@/app/actions/anchor-actions');

       const newTest = await addAnchorTest({
         ...testData,
         pontoId: pontoId
       } as any);

       // Update local state
       setAllTests(prevTests => [...prevTests, newTest as any]);

       // Point status is automatically updated by the server action
       // Just update the point in local state with the new status
       setAllPoints(prevPoints => prevPoints.map(p => {
           if (p.id === pontoId) {
             return {
               ...p,
               ...pointUpdates,
               status: testData.resultado,
               lastModifiedByUserId: currentUser.id
             };
           }
           return p;
         })
       );

       logger.log('[DEBUG] Test added successfully to PostgreSQL:', newTest);
     } catch (error) {
       logger.error('[ERROR] updatePointsAndAddTest failed:', error);
       alert('Erro ao adicionar teste. Tente novamente.');
     }
  }, [currentUser]);
```

---

### 6. FLOOR PLANS - Carregar do Banco (linha 263-290)

**SUBSTITUIR:**
```typescript
// Load floor plans from localStorage
let savedFloorPlans: FloorPlan[] = [];
try {
    const floorPlansStr = localStorage.getItem('anchorViewFloorPlans');
    if (floorPlansStr) {
        savedFloorPlans = JSON.parse(floorPlansStr);
        // Filter by current project
        if (savedProject?.id) {
            savedFloorPlans = savedFloorPlans.filter((fp: FloorPlan) => fp.projectId === savedProject.id);
        }
        console.log(`✅ [localStorage] Loaded: ${savedFloorPlans.length} floor plans`);
    }
} catch (error) {
    logger.error('❌ Failed to load floor plans from localStorage:', error);
}

if (!isCancelled) setFloorPlans(savedFloorPlans);

// Set current floor plan (first active or first available)
const activeFloorPlan = savedFloorPlans.find(fp => fp.active) || savedFloorPlans[0] || null;
if (!isCancelled && activeFloorPlan) {
    setCurrentFloorPlanState(activeFloorPlan);
}
```

**POR:**
```typescript
// ✅ MIGRATED: Load floor plans from PostgreSQL
let savedFloorPlans: FloorPlan[] = [];
if (savedProject?.id) {
    try {
        const { getFloorPlansForProject } = await import('@/app/actions/floorplan-actions');
        savedFloorPlans = await getFloorPlansForProject(savedProject.id) as any;
        console.log(`✅ [DB] Loaded: ${savedFloorPlans.length} floor plans from PostgreSQL`);
    } catch (error) {
        logger.error('❌ Failed to load floor plans from database, using localStorage fallback:', error);
        // Fallback to localStorage only if DB fails
        try {
            const floorPlansStr = localStorage.getItem('anchorViewFloorPlans');
            if (floorPlansStr) {
                savedFloorPlans = JSON.parse(floorPlansStr);
                if (savedProject?.id) {
                    savedFloorPlans = savedFloorPlans.filter((fp: FloorPlan) => fp.projectId === savedProject.id);
                }
                logger.warn(`⚠️ Using localStorage fallback: ${savedFloorPlans.length} floor plans`);
            }
        } catch (fallbackError) {
            logger.error('❌ Fallback to localStorage also failed:', fallbackError);
        }
    }
}

if (!isCancelled) setFloorPlans(savedFloorPlans);

// Set current floor plan (first active or first available)
const activeFloorPlan = savedFloorPlans.find(fp => fp.active) || savedFloorPlans[0] || null;
if (!isCancelled && activeFloorPlan) {
    setCurrentFloorPlanState(activeFloorPlan);
}
```

---

### 7. CREATE FLOOR PLAN - Usar Server Action (linha 848-885)

**SUBSTITUIR:**
```typescript
const createFloorPlan = useCallback(async (name: string, image: string, order: number) => {
    if (!currentProject || !currentUser) {
      logger.error('[ERROR] createFloorPlan: No project or user selected');
      return;
    }

    const newFloorPlan: FloorPlan = {
      id: `fp-${Date.now()}`,
      projectId: currentProject.id,
      name,
      image,
      order,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setFloorPlans(prev => {
      const updated = [...prev, newFloorPlan];
      return updated.sort((a, b) => a.order - b.order);
    });

    logger.log('[DEBUG] Floor plan created successfully:', newFloorPlan);
  }, [currentProject, currentUser, floorPlans]);
```

**POR:**
```typescript
const createFloorPlan = useCallback(async (name: string, image: string, order: number) => {
    if (!currentProject || !currentUser) {
      logger.error('[ERROR] createFloorPlan: No project or user selected');
      return;
    }

    try {
      // ✅ MIGRATED: Call server action
      const { createFloorPlan: createFloorPlanAction } = await import('@/app/actions/floorplan-actions');
      const newFloorPlan = await createFloorPlanAction(currentProject.id, name, image, order);

      if (newFloorPlan) {
        setFloorPlans(prev => {
          const updated = [...prev, newFloorPlan as any];
          return updated.sort((a, b) => a.order - b.order);
        });

        logger.log('[DEBUG] Floor plan created successfully in PostgreSQL:', newFloorPlan);
      }
    } catch (error) {
      logger.error('[ERROR] createFloorPlan failed:', error);
      alert('Erro ao criar planta baixa. Tente novamente.');
    }
  }, [currentProject, currentUser]);
```

---

### 8. UPDATE FLOOR PLAN - Usar Server Action (linha 890-922)

**SUBSTITUIR:**
```typescript
const updateFloorPlan = useCallback(async (floorPlanId: string, name: string, order: number) => {
    // ... existing code ...
    setFloorPlans(prev => prev.map(fp =>
      fp.id === floorPlanId ? { ...fp, name, order, updatedAt: new Date().toISOString() } : fp
    ).sort((a, b) => a.order - b.order));
  }, [currentUser]);
```

**POR:**
```typescript
const updateFloorPlan = useCallback(async (floorPlanId: string, name: string, order: number) => {
    if (!currentUser) {
      logger.error('[ERROR] updateFloorPlan: No user selected');
      return;
    }

    try {
      // ✅ MIGRATED: Call server action
      const { updateFloorPlan: updateFloorPlanAction } = await import('@/app/actions/floorplan-actions');
      const updatedFloorPlan = await updateFloorPlanAction(floorPlanId, name, order);

      if (updatedFloorPlan) {
        setFloorPlans(prev => prev.map(fp =>
          fp.id === floorPlanId ? updatedFloorPlan as any : fp
        ).sort((a, b) => a.order - b.order));

        logger.log('[DEBUG] Floor plan updated successfully in PostgreSQL');
      }
    } catch (error) {
      logger.error('[ERROR] updateFloorPlan failed:', error);
      alert('Erro ao atualizar planta baixa. Tente novamente.');
    }
  }, [currentUser]);
```

---

### 9. DELETE FLOOR PLAN - Usar Server Action (linha 927-963)

**SUBSTITUIR:**
```typescript
const deleteFloorPlan = useCallback(async (floorPlanId: string) => {
    // ... existing code ...
    setFloorPlans(prev => prev.filter(fp => fp.id !== floorPlanId));
    // ... cascade delete points ...
  }, [currentUser, floorPlans, allPoints]);
```

**POR:**
```typescript
const deleteFloorPlan = useCallback(async (floorPlanId: string) => {
    if (!currentUser) {
      logger.error('[ERROR] deleteFloorPlan: No user selected');
      return;
    }

    try {
      // ✅ MIGRATED: Call server action (already handles cascade)
      const { deleteFloorPlan: deleteFloorPlanAction } = await import('@/app/actions/floorplan-actions');
      const success = await deleteFloorPlanAction(floorPlanId);

      if (success) {
        // Remove from local state
        setFloorPlans(prev => prev.filter(fp => fp.id !== floorPlanId));

        // Update points to remove floorPlanId reference (already done by server action)
        setAllPoints(prev => prev.map(p =>
          p.floorPlanId === floorPlanId ? { ...p, floorPlanId: null } : p
        ));

        logger.log('[DEBUG] Floor plan deleted successfully from PostgreSQL');
      }
    } catch (error) {
      logger.error('[ERROR] deleteFloorPlan failed:', error);
      alert('Erro ao deletar planta baixa. Tente novamente.');
    }
  }, [currentUser]);
```

---

## 🔄 SCRIPT DE MIGRAÇÃO DE DADOS

Crie um novo arquivo `src/app/actions/migration-actions.ts`:

```typescript
'use server';

import { syncPointsFromLocalStorage, syncTestsFromLocalStorage } from './anchor-actions';
import { AnchorPoint, AnchorTest } from '@/types';

export async function migrateLocalStorageToDatabase() {
  try {
    // Get data from localStorage (will be called from client)
    const pointsStr = typeof window !== 'undefined' ? localStorage.getItem('anchorViewPoints') : null;
    const testsStr = typeof window !== 'undefined' ? localStorage.getItem('anchorViewTests') : null;

    if (!pointsStr && !testsStr) {
      return {
        success: true,
        message: 'No data to migrate',
        pointsSynced: 0,
        testsSynced: 0
      };
    }

    const points: AnchorPoint[] = pointsStr ? JSON.parse(pointsStr) : [];
    const tests: AnchorTest[] = testsStr ? JSON.parse(testsStr) : [];

    console.log(`Starting migration: ${points.length} points, ${tests.length} tests`);

    // Sync points
    const pointsResult = await syncPointsFromLocalStorage(points);

    // Sync tests
    const testsResult = await syncTestsFromLocalStorage(tests);

    console.log('Migration complete:', {
      points: pointsResult,
      tests: testsResult
    });

    return {
      success: true,
      message: 'Migration completed successfully',
      pointsSynced: pointsResult.synced,
      pointsFailed: pointsResult.failed,
      testsSynced: testsResult.synced,
      testsFailed: testsResult.failed,
      errors: [...pointsResult.errors, ...testsResult.errors]
    };
  } catch (error) {
    console.error('Migration failed:', error);
    return {
      success: false,
      message: `Migration failed: ${error}`,
      pointsSynced: 0,
      testsSynced: 0
    };
  }
}
```

---

## 🚀 COMO APLICAR AS MUDANÇAS

### Opção 1: Manual (Recomendado)
1. Abra `src/context/AnchorDataContext.tsx`
2. Encontre cada seção listada acima
3. Substitua pelo código fornecido
4. Salve e teste

### Opção 2: Ferramentas AI
Use o Claude Code para aplicar as mudanças:
```bash
# Na pasta do projeto
claude apply MIGRATION-TO-POSTGRESQL.md
```

---

## ✅ CHECKLIST PÓS-MIGRAÇÃO

- [ ] Código compilado sem erros (`npm run build`)
- [ ] Testar criação de ponto
- [ ] Testar edição de ponto
- [ ] Testar arquivamento de ponto
- [ ] Testar criação de teste
- [ ] Testar criação de floor plan
- [ ] Testar edição de floor plan
- [ ] Testar deleção de floor plan
- [ ] Verificar dados no banco: `npx prisma studio`

---

## 🔧 COMANDOS ÚTEIS

```bash
# Ver dados no banco
npx prisma studio

# Rodar migração de dados (se necessário)
npm run migrate-data

# Limpar localStorage (após migração bem-sucedida)
# No console do navegador:
localStorage.removeItem('anchorViewPoints');
localStorage.removeItem('anchorViewTests');
localStorage.removeItem('anchorViewFloorPlans');
```

---

## 📊 BENEFÍCIOS DA MIGRAÇÃO

✅ **Dados persistentes**: Não perde dados ao limpar o navegador
✅ **Sincronização**: Dados acessíveis de qualquer dispositivo
✅ **Escalabilidade**: Sem limite de 5-10MB do localStorage
✅ **Backup automático**: PostgreSQL tem backup nativo
✅ **Performance**: Queries otimizadas vs parsing JSON
✅ **Segurança**: Dados no servidor protegido vs localStorage exposto

---

**Última atualização**: 2025-11-11
**Autor**: Claude Code AI Assistant
