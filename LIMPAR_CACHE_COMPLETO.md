# 🧹 Script de Limpeza Completa - AnchorView

## 🚨 Use Quando Tiver Estes Erros:

1. ❌ "Failed to find Server Action"
2. ❌ "A listener indicated an asynchronous response by returning true, but the message channel closed"
3. ❌ Service Worker errors
4. ❌ Projetos deletados voltando

---

## 🔧 SOLUÇÃO COMPLETA

### 1️⃣ Limpar TUDO no Navegador

Abra o DevTools Console (`F12` → Console) e cole este script:

```javascript
// 🧹 LIMPEZA COMPLETA DO NAVEGADOR

console.log('🧹 Iniciando limpeza completa...')

// 1. Desregistrar TODOS os Service Workers
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log(`📍 Encontrados ${registrations.length} Service Workers`)
  registrations.forEach(registration => {
    registration.unregister()
    console.log('✅ Service Worker desregistrado:', registration.scope)
  })
})

// 2. Limpar TODOS os caches
caches.keys().then(cacheNames => {
  console.log(`📍 Encontrados ${cacheNames.length} caches`)
  cacheNames.forEach(name => {
    caches.delete(name)
    console.log('✅ Cache deletado:', name)
  })
})

// 3. Limpar localStorage
localStorage.clear()
console.log('✅ localStorage limpo')

// 4. Limpar sessionStorage
sessionStorage.clear()
console.log('✅ sessionStorage limpo')

// 5. Limpar TODOS os IndexedDB
indexedDB.databases().then(dbs => {
  console.log(`📍 Encontrados ${dbs.length} bancos IndexedDB`)
  dbs.forEach(db => {
    if (db.name) {
      indexedDB.deleteDatabase(db.name)
      console.log('✅ IndexedDB deletado:', db.name)
    }
  })
})

// 6. Limpar cookies (se necessário)
// Nota: Isso vai fazer logout!
// document.cookie.split(";").forEach(c => {
//   document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
// })

// 7. Recarregar página após 2 segundos
setTimeout(() => {
  console.log('🔄 Recarregando página...')
  window.location.reload(true) // Hard reload
}, 2000)
```

**O que esse script faz:**
- ✅ Remove TODOS os Service Workers
- ✅ Deleta TODOS os caches (Cache API)
- ✅ Limpa localStorage completamente
- ✅ Limpa sessionStorage
- ✅ Remove TODOS os bancos IndexedDB
- ✅ Faz hard reload automático

---

### 2️⃣ Alternativa: Limpeza Manual via DevTools

Se preferir fazer manualmente:

#### A. Limpar Service Workers
1. DevTools (`F12`) → **Application** tab
2. Lado esquerdo: **Service Workers**
3. Clique em **Unregister** em todos os Service Workers
4. Clique em **Clear site data**

#### B. Limpar Caches
1. DevTools → **Application** tab
2. Lado esquerdo: **Cache Storage**
3. Clique direito → **Delete**
4. Repita para todos os caches

#### C. Limpar localStorage
1. DevTools → **Application** tab
2. Lado esquerdo: **Local Storage** → selecione seu site
3. Clique direito → **Clear**

#### D. Limpar IndexedDB
1. DevTools → **Application** tab
2. Lado esquerdo: **IndexedDB**
3. Clique direito em cada banco → **Delete database**

#### E. Hard Refresh
- Windows: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

---

### 3️⃣ Limpar Cache no Servidor (EasyPanel)

Você TAMBÉM precisa executar no servidor:

```bash
# No terminal do EasyPanel
npx prisma generate
pm2 restart all

# OU se não usar PM2:
npx prisma generate
npm run build
# Depois reiniciar o container
```

**Por quê:** Isso corrige os erros:
- ❌ "column 'new' does not exist"
- ❌ Prisma schema desatualizado

---

## ✅ Checklist Completo

Execute nesta ordem:

- [ ] 1. **No navegador:** Execute o script de limpeza completa (opção 1) OU limpeza manual (opção 2)
- [ ] 2. **No servidor:** Execute `npx prisma generate && pm2 restart all`
- [ ] 3. **Teste:** Acesse a aplicação em aba anônima
- [ ] 4. **Verifique:** Console sem erros de "Failed to find Server Action"
- [ ] 5. **Teste:** Delete um projeto e atualize - projeto NÃO deve voltar

---

## 🐛 Se Ainda Tiver Problemas

### Erro: "Service Worker message channel closed"
**Solução:** Isso é Service Worker antigo em cache. O script de limpeza completa resolve.

### Erro: "Failed to find Server Action"
**Solução:** Hard refresh (`Ctrl + Shift + R`) após limpar caches.

### Erro: "column 'new' does not exist"
**Solução:** `npx prisma generate` no servidor.

### Erro: Projetos deletados voltam
**Solução:** Após `npx prisma generate`, os erros param e o código correto funciona.

---

## 📊 Resultado Esperado

Após executar TODOS os passos:

✅ Console limpo (sem erros)
✅ Service Worker registrado corretamente
✅ Login funciona sem crashes
✅ Deletar projeto funciona
✅ Projeto deletado NÃO volta após F5
✅ Loading rápido (1-2s)
✅ Zero erros no console

---

**Data:** 2025-11-10
**Versão:** 1.0

🎉 Depois dessa limpeza, aplicação vai funcionar 100%!
