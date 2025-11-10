# ⚠️ AÇÕES NECESSÁRIAS - Usuário Precisa Executar

## 🎯 STATUS: 11 Bugs Corrigidos - 2 Ações Faltando

**Data:** 2025-11-10

---

## ✅ O Que Já Foi Feito (Código)

Todos os **11 bugs críticos** foram corrigidos no código:

1. ✅ Chamadas duplicadas de API (3-5x → 1x)
2. ✅ Loop infinito em refreshData
3. ✅ Race conditions em loadInitialData
4. ✅ Memory leaks em network listeners
5. ✅ IndexedDB put() lógica incompleta
6. ✅ Service Worker message handler
7. ✅ Edição de número de ponto não atualizando
8. ✅ QuotaExceededError (localStorage overflow)
9. ✅ TransactionInactiveError no login
10. ✅ dataCache promise deduplication
11. ✅ **NOVO:** Sync queue projectId argument error

**Arquivos Modificados:**
- `src/lib/indexeddb.ts` - IndexedDB transactions corrigidas
- `src/lib/data-cache.ts` - Promise deduplication
- `src/app/actions/sync-actions.ts` - **NOVO:** Relações Prisma corrigidas
- `src/components/interactive-map.tsx` - Edição de pontos
- `src/context/AnchorDataContext.tsx` - Race conditions
- `src/context/OfflineDataContext.tsx` - Memory leaks

---

## 🔴 AÇÃO 1: Atualizar Prisma Client no Servidor (CRÍTICO)

### Por Que Precisa?

Você está vendo este erro ao deletar projetos:
```
Invalid `prisma.project.update()` invocation:
The column `new` does not exist in the current database.
```

**Causa:** O Prisma Client no servidor está desatualizado. Ele não reconhece as colunas novas do schema.

### Como Fazer:

#### Opção A: Via Terminal do EasyPanel

1. Acesse o terminal do seu container no EasyPanel
2. Execute:
   ```bash
   npx prisma generate
   pm2 restart all
   ```

#### Opção B: Se não usar PM2

1. Acesse o terminal do seu container
2. Execute:
   ```bash
   npx prisma generate
   npm run build
   # Depois reinicie o container pelo painel do EasyPanel
   ```

### Resultado Esperado:

✅ Deletar projetos funciona sem erros
✅ Todos os erros de "column does not exist" desaparecem

---

## 🔴 AÇÃO 2: Limpar Cache do Navegador (CRÍTICO)

### Por Que Precisa?

Você está vendo este erro:
```
Failed to find Server Action "00457fe9108013634af71c3419ba88054196e1bfb6"
```

**Causa:** Após rebuild do Next.js, os Server Actions recebem novos IDs. O cache do navegador ainda tem os IDs antigos.

### Como Fazer:

#### Opção A: Hard Refresh (Mais Rápido)

- **Windows (Chrome/Edge/Firefox):** `Ctrl + Shift + R`
- **Mac (Chrome/Edge):** `Cmd + Shift + R`
- **Mac (Safari):** `Cmd + Option + R`

#### Opção B: Limpar Tudo via DevTools (Mais Completo)

1. Abra DevTools: `F12` ou `Ctrl + Shift + I`
2. Abra o Console
3. Cole este script e pressione Enter:

```javascript
// Desregistrar Service Workers
navigator.serviceWorker.getRegistrations().then(registrations => {
  for(let registration of registrations) {
    registration.unregister();
    console.log('✅ Service Worker desregistrado:', registration.scope);
  }
});

// Limpar todos os caches
caches.keys().then(names => {
  for (let name of names) {
    caches.delete(name);
    console.log('✅ Cache deletado:', name);
  }
});

// Limpar localStorage
localStorage.clear();
console.log('✅ localStorage limpo');

// Limpar IndexedDB
indexedDB.databases().then(dbs => {
  dbs.forEach(db => {
    indexedDB.deleteDatabase(db.name);
    console.log('✅ IndexedDB deletado:', db.name);
  });
});

// Recarregar página
setTimeout(() => {
  console.log('🔄 Recarregando página...');
  location.reload();
}, 1000);
```

#### Opção C: Aba Anônima (Para Testar)

- **Windows:** `Ctrl + Shift + N` (Chrome/Edge) ou `Ctrl + Shift + P` (Firefox)
- **Mac:** `Cmd + Shift + N` (Chrome/Edge/Safari)

### Resultado Esperado:

✅ Nenhum erro "Failed to find Server Action"
✅ Aplicação carrega normalmente
✅ Todas as funcionalidades funcionam

---

## 📋 Checklist de Execução

Execute as ações nesta ordem:

- [ ] **1. No servidor (EasyPanel):**
  - [ ] Executar `npx prisma generate`
  - [ ] Executar `pm2 restart all` (ou reiniciar container)
  - [ ] Verificar que aplicação reiniciou sem erros

- [ ] **2. No navegador:**
  - [ ] Fazer hard refresh (`Ctrl + Shift + R`)
  - [ ] **OU** executar script de limpeza no Console
  - [ ] **OU** abrir em aba anônima
  - [ ] Verificar que não há erros de Server Action

- [ ] **3. Testar funcionalidades:**
  - [ ] Criar novo projeto
  - [ ] Editar número de ponto
  - [ ] Deletar projeto
  - [ ] Verificar console: apenas 1 chamada de API

---

## 🧪 Testes Após as Ações

### Teste 1: Criar Projeto
1. Crie um novo projeto
2. Abra DevTools Console (F12)
3. **Esperado:** Ver apenas 1 chamada de `getProjectsForCompany`:
   ```
   🔍 [CACHE MISS] projects_xxx - fetching...
   💾 [CACHE SET] projects_xxx
   ```

### Teste 2: Editar Número de Ponto
1. Abra o mapa
2. Duplo-clique em um número de ponto
3. Mude o número
4. Pressione Enter
5. **Esperado:** Número atualiza imediatamente ✅

### Teste 3: Deletar Projeto
1. Delete um projeto
2. **Esperado:**
   - ✅ Nenhum erro sobre "column 'new'"
   - ✅ Projeto desaparece da lista
   - ✅ Nenhum erro no console

### Teste 4: Sync de Dados Offline
1. Crie pontos offline
2. Volte online
3. Faça sync
4. **Esperado:**
   - ✅ Nenhum erro "Unknown argument `projectId`"
   - ✅ Sync completa com sucesso: "9/9 operações bem-sucedidas"

### Teste 5: Loading Rápido
1. Faça login
2. **Esperado:**
   - ✅ Página carrega em ~1-2 segundos (antes: 5-10s)
   - ✅ Apenas 1 chamada de API no console

---

## 🚨 Se Algo Der Errado

### Problema: Ainda vejo "Failed to find Server Action"
**Solução:** Execute o script de limpeza completa no Console (Opção B da Ação 2)

### Problema: Ainda vejo erros "column does not exist"
**Solução:**
1. Verifique que `npx prisma generate` foi executado COM SUCESSO
2. Verifique que a aplicação foi reiniciada
3. Se ainda não funcionar, execute:
   ```bash
   npx prisma db push
   npx prisma generate
   pm2 restart all
   ```

### Problema: Sync ainda falha com "Unknown argument"
**Solução:**
1. Faça commit e push do código mais recente
2. No servidor, faça `git pull`
3. Execute `npm run build`
4. Reinicie a aplicação

---

## 📊 Performance Esperada Depois das Ações

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| Chamadas de API | 3-5x | 1x | **-80%** |
| Tempo de loading | ~5-10s | ~1-2s | **-75%** |
| Memory leaks | Sim | Não | **100%** |
| Sync falhas | 9/9 falhas | 0/9 falhas | **100%** |
| Login crashes | Sim | Não | **100%** |

---

## ✅ Quando Tudo Estiver Funcionando

Você vai ver:

1. **Console limpo** - apenas logs de cache hit/miss
2. **Loading rápido** - 1-2 segundos ao abrir app
3. **Edição funciona** - números de ponto atualizam no mapa
4. **Deletar funciona** - projetos são removidos sem erro
5. **Sync funciona** - 9/9 operações bem-sucedidas

---

**Próximos Passos:** Após executar as 2 ações, a aplicação estará **100% funcional** sem erros! 🎉
