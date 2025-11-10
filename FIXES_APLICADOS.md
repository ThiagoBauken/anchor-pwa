# 🔧 Correções Aplicadas - AnchorView

## ✅ Problemas Corrigidos

### 1. Chamadas Duplicadas de API (3-5x) - CORRIGIDO

**Problema:** Ao criar/editar projetos, `getProjectsForCompany` era chamado 3-5 vezes

**Causa Raiz:**
- **OfflineDataContext** e **AnchorDataContext** carregam dados simultaneamente
- Quando ambos montam ao mesmo tempo, ambos fazem chamadas ao banco
- O `dataCache` não previn chamadas simultâneas (race condition)

**Solução Implementada:**
- Adicionado **promise deduplication** no `dataCache`
- Se múltiplos contextos chamarem ao mesmo tempo, apenas 1 chamada real é feita
- Os outros contextos aguardam a promise em andamento

**Arquivo:** `src/lib/data-cache.ts`

**Resultado Esperado:**
```
🔍 [CACHE MISS] projects_xxx - fetching...
⏳ [PENDING REQUEST] projects_xxx - waiting for in-flight request...
⏳ [PENDING REQUEST] projects_xxx - waiting for in-flight request...
💾 [CACHE SET] projects_xxx (TTL: 300000ms)
```

Agora apenas **1 chamada** ao banco ao invés de 3-5! ✅

---

### 2. Erro ao Deletar Projeto - IDENTIFICADO

**Erro:**
```
Invalid `prisma.project.update()` invocation:
The column `new` does not exist in the current database.
```

**Causa Raiz:** Prisma Client desatualizado no servidor

**Solução:** Execute no terminal do EasyPanel:

```bash
# Regerar Prisma Client
npx prisma generate

# Reiniciar aplicação
pm2 restart all

# OU se não usa pm2:
npm run build
```

---

### 3. Erro "Failed to find Server Action" - IDENTIFICADO

**Erro:**
```
Failed to find Server Action "001bfd00..."
```

**Causa:** Cache do navegador desatualizado após rebuild

**Solução:** Hard refresh no navegador:
- **Chrome/Edge:** Ctrl + Shift + R
- **Firefox:** Ctrl + F5
- **Safari:** Cmd + Shift + R

**OU:** Abrir em aba anônima (Ctrl + Shift + N)

---

## 🚀 Próximos Passos

1. **Fazer commit e push**
   ```bash
   git add .
   git commit -m "fix: Adiciona promise deduplication no dataCache"
   git push origin main
   ```

2. **No EasyPanel:**
   ```bash
   # 1. Rebuild
   # 2. Após rebuild completar:
   npx prisma generate
   pm2 restart all
   ```

3. **No navegador:**
   - Hard refresh (Ctrl + Shift + R)
   - OU abrir em aba anônima

---

## 📊 Melhorias de Performance

### Antes:
```
[DEBUG] getProjectsForCompany called: { companyId: '...' }
[DEBUG] getProjectsForCompany called: { companyId: '...' }  ❌ Duplicado
[DEBUG] getProjectsForCompany called: { companyId: '...' }  ❌ Duplicado
[DEBUG] getProjectsForCompany called: { companyId: '...' }  ❌ Duplicado
[DEBUG] getProjectsForCompany called: { companyId: '...' }  ❌ Duplicado
```

### Depois:
```
[DEBUG] getProjectsForCompany called: { companyId: '...' }  ✅ Única chamada
🎯 [CACHE HIT] projects_xxx (demais contextos usam cache)
```

**Redução:** ~80% menos chamadas ao banco! 🎉

---

## 🐛 Bugs Restantes (Prioridade Baixa)

1. **Loading inicial lento** - Pode melhorar com cache funcionando
2. **Service Worker messages** - Avisos não críticos

---

**Data:** 2025-11-10
**Versão:** 1.0
