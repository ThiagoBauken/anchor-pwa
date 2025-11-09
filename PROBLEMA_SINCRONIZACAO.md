# ❌ PROBLEMA CRÍTICO DE SINCRONIZAÇÃO OFFLINE

## 🔴 BUG ENCONTRADO

**Anchor Points e Tests criados offline NUNCA sincronizam com PostgreSQL!**

---

## 📋 DIAGNÓSTICO

### **Como Deveria Funcionar**
```typescript
// 1. Criar ponto offline
createPoint(data)
  → Salvar em localStorage ✅
  → Adicionar à sync queue (IndexedDB) ✅

// 2. Conexão volta
syncManager.syncNow()
  → Busca sync queue
  → Envia para /api/sync
  → PostgreSQL recebe os dados ✅
```

### **Como Está Funcionando (ERRADO)**
```typescript
// 1. Criar ponto offline
createPoint(data)
  → Salvar em localStorage ✅
  → NÃO adiciona à sync queue ❌

// 2. Conexão volta
syncManager.syncNow()
  → offlineDB.getSyncQueue()
  → Retorna VAZIO! (pontos não estão na fila) ❌
  → Nada enviado para PostgreSQL ❌
```

---

## 🔍 ANÁLISE DO CÓDIGO

### **OfflineDataContext.tsx**
```typescript
// Linha ~800 - Criar ponto
const createPoint = async (pointData) => {
  // Salva em localStorage
  localStorage.setItem('anchorViewPoints', JSON.stringify([...points, newPoint]))

  // ❌ PROBLEMA: Não chama offlineDB.addToSyncQueue()!
}

// Linha ~900 - Criar teste
const createTest = async (testData) => {
  // Salva em localStorage
  localStorage.setItem('anchorViewTests', JSON.stringify([...tests, newTest]))

  // ❌ PROBLEMA: Não chama offlineDB.addToSyncQueue()!
}
```

### **IndexedDB.ts (FUNCIONA CORRETAMENTE)**
```typescript
// Linha 199 - Método disponível mas não usado!
async addToSyncQueue(
  operation: 'create' | 'update' | 'delete',
  table: string,
  data: any
) {
  const syncOperation = {
    id: `${table}_${operation}_${data.id || Date.now()}`,
    operation,
    table,
    data,
    timestamp: Date.now(),
    retries: 0,
    status: 'pending'
  }

  await this.put('sync_queue', syncOperation)
}
```

### **Sync-Manager.ts (FUNCIONA CORRETAMENTE)**
```typescript
// Linha 123 - Busca operações pendentes
const operations = await offlineDB.getSyncQueue()
// ❌ Retorna vazio porque pontos/testes nunca foram adicionados!

// Linha 146 - Envia para API
await fetch('/api/sync', {
  body: JSON.stringify({ operations })
})
// ❌ Envia array vazio!
```

### **API /api/sync/route.ts (FUNCIONA CORRETAMENTE)**
```typescript
// Linha 104-127 - Processa operações
async function processOperation(operation) {
  switch (operation.table) {
    case 'anchor_points':
      return await processAnchorPoint(operation.op, operation.data)
    case 'anchor_tests':
      return await processAnchorTest(operation.op, operation.data)
  }
}

// ❌ Nunca é chamado porque operations[] está vazio!
```

---

## ✅ SOLUÇÃO

### **Opção 1: Adicionar à Sync Queue ao Criar/Atualizar**

Modificar `OfflineDataContext.tsx`:

```typescript
import { offlineDB } from '@/lib/indexeddb'

const createPoint = async (pointData: AnchorPoint) => {
  // 1. Salvar em localStorage (imediato)
  const newPoint = { ...pointData, id: generateId() }
  localStorage.setItem('anchorViewPoints', JSON.stringify([...points, newPoint]))

  // 2. ADICIONAR À SYNC QUEUE (para sincronizar depois)
  await offlineDB.addToSyncQueue('create', 'anchor_points', newPoint)

  setPoints(prev => [...prev, newPoint])
}

const updatePoint = async (pointId: string, updates: Partial<AnchorPoint>) => {
  // 1. Atualizar localStorage
  const updated = points.map(p => p.id === pointId ? { ...p, ...updates } : p)
  localStorage.setItem('anchorViewPoints', JSON.stringify(updated))

  // 2. ADICIONAR À SYNC QUEUE
  const updatedPoint = updated.find(p => p.id === pointId)
  if (updatedPoint) {
    await offlineDB.addToSyncQueue('update', 'anchor_points', updatedPoint)
  }

  setPoints(updated)
}

const createTest = async (testData: AnchorTest) => {
  // 1. Salvar em localStorage
  const newTest = { ...testData, id: generateId() }
  localStorage.setItem('anchorViewTests', JSON.stringify([...tests, newTest]))

  // 2. ADICIONAR À SYNC QUEUE
  await offlineDB.addToSyncQueue('create', 'anchor_tests', newTest)

  setTests(prev => [...prev, newTest])
}
```

### **Opção 2: Migrar Points/Tests para IndexedDB**

Usar IndexedDB como storage principal (em vez de localStorage):

```typescript
// Em vez de localStorage
const createPoint = async (pointData: AnchorPoint) => {
  // Salva em IndexedDB (já adiciona à sync queue automaticamente)
  await offlineDB.put('anchor_points', pointData, true) // addToSyncQueue=true

  // Atualiza state local
  const points = await offlineDB.getAll('anchor_points')
  setPoints(points)
}
```

**Vantagem**: Sincronização automática (IndexedDB.put já adiciona à queue)
**Desvantagem**: Mudança maior de arquitetura

---

## 📊 IMPACTO

### **Dados Afetados**
- ❌ Anchor Points criados offline
- ❌ Anchor Tests criados offline
- ❌ Atualizações de pontos offline
- ❌ Deleções de pontos offline

### **Dados NÃO Afetados (Funcionando)**
- ✅ Projects (já usa IndexedDB corretamente)
- ✅ Locations (já usa IndexedDB corretamente)
- ✅ Users (já usa IndexedDB corretamente)
- ✅ Companies (já usa IndexedDB corretamente)

---

## 🎯 RECOMENDAÇÃO

**Implementar Opção 1** (adicionar à sync queue):
- ✅ Mudança mínima
- ✅ Mantém localStorage para acesso rápido
- ✅ Adiciona sincronização correta
- ✅ Pode ser feito incrementalmente

**Passos**:
1. Adicionar `offlineDB.addToSyncQueue()` em `createPoint()`
2. Adicionar `offlineDB.addToSyncQueue()` em `updatePoint()`
3. Adicionar `offlineDB.addToSyncQueue()` em `deletePoint()`
4. Adicionar `offlineDB.addToSyncQueue()` em `createTest()`
5. Testar sincronização offline → online → PostgreSQL

---

## 🧪 COMO TESTAR

### **Cenário de Teste**

1. **Offline - Criar dados**
   ```
   📴 Desconectar internet
   📍 Criar 3 pontos
   🔬 Criar 2 testes
   ```

2. **Verificar sync queue**
   ```javascript
   // DevTools Console
   const queue = await offlineDB.getSyncQueue()
   console.log(queue)
   // Deveria mostrar 5 operações pendentes
   ```

3. **Online - Sincronizar**
   ```
   📶 Conectar internet
   🔄 Aguardar auto-sync (ou clicar "Sincronizar")
   ```

4. **Verificar PostgreSQL**
   ```sql
   -- No banco de dados
   SELECT * FROM "AnchorPoint" ORDER BY "createdAt" DESC LIMIT 10;
   SELECT * FROM "AnchorTest" ORDER BY "createdAt" DESC LIMIT 10;

   -- Deveria mostrar os 3 pontos e 2 testes!
   ```

---

## ⚠️ URGÊNCIA

**CRÍTICO** - Dados de usuários sendo perdidos!

Todos os pontos e testes criados offline atualmente estão:
- ✅ Salvos localmente (localStorage)
- ❌ NUNCA enviados ao servidor
- ❌ Perdem dados ao limpar cache/trocar dispositivo

---

**Data**: 2025-01-08
**Status**: 🔴 CRÍTICO - CORREÇÃO NECESSÁRIA URGENTE
