# Troubleshooting - Erros 500 no Sistema

**Data:** 2025-11-10
**Status:** Em investigação

---

## 🔴 **Sintomas:**

1. ❌ Erro 500 ao criar equipes
2. ❌ Erro 401 em `/api/sync`
3. ❌ Erro 500 em `/admin`
4. ❌ Erro 500 em `/app` (intermitente)
5. ⚠️ "Error loading teams: An error occurred in the Server Components render"
6. ⚠️ "Error creating team: An error occurred in the Server Components render"

---

## 🔍 **Possíveis Causas:**

### **1. NEXTAUTH_URL Incorreto (MAIS PROVÁVEL)**

**Problema:** Cookie de sessão não está sendo salvo porque NEXTAUTH_URL está errado

**Verificar no Easypanel:**
```env
NEXTAUTH_URL=https://anchorpwa.easypanel.host
```

**❌ Valores ERRADOS que causam erro:**
- `http://anchorpwa.easypanel.host` (HTTP ao invés de HTTPS)
- `anchorpwa.easypanel.host` (sem protocolo)
- `localhost:9002` (esqueceu de mudar para produção)
- Vazio ou não configurado

**Como testar:**
1. Abrir DevTools (F12) no browser
2. Console → digitar: `document.cookie`
3. **SE NÃO** houver `next-auth.session-token=...` → NEXTAUTH_URL está errado!

---

### **2. Sessão Não Persiste (Relacionado ao #1)**

**Problema:** User faz login mas ao fazer requisições, sessão é null

**Sintomas:**
- Login funciona
- Após qualquer ação → "Authentication required"
- Server Actions retornam 401/500

**Causa:** Middleware ou Server Actions não conseguem ler sessão

**Como verificar nos logs do Easypanel:**
```
[AuthHelpers] Error in getAuthenticatedUser: <erro aqui>
```

---

### **3. Company Mismatch (Cache Antigo)**

**Problema:** Browser tem dados antigos de múltiplas companies

**Sintomas:**
```
Error: Access denied: Company mismatch
Tentando acessar: cmhkslsov0001oxnzr2rhzgd6
Sua company: cmhtqai2p0000mu01sldc6x37
```

**Solução:**
1. F12 → Application → Storage → Clear site data
2. Fechar TODAS as abas do site
3. Abrir janela anônima
4. Fazer login novamente

---

### **4. Prisma Client Não Inicializado**

**Problema:** Em produção, Prisma pode não estar inicializando corretamente

**Como verificar nos logs:**
```
❌ Prisma client is null - database not available
Database not available for teams
```

**Solução:** Verificar se `prisma generate` foi executado no build

---

### **5. Database Connection Issues**

**Problema:** Aplicação não consegue conectar no banco de dados

**Como verificar nos logs:**
```
Error: Can't reach database server at 'private_alpdb:5432'
```

**Solução:** Verificar se `DATABASE_URL` no Easypanel aponta para hostname correto:
```env
DATABASE_URL=postgres://privado:privado12!@private_alpdb:5432/privado?sslmode=disable
```

---

## 🛠️ **Checklist de Diagnóstico:**

### **No Easypanel:**
- [ ] Verificar `NEXTAUTH_URL=https://anchorpwa.easypanel.host`
- [ ] Verificar `NEXTAUTH_SECRET` está configurado
- [ ] Verificar `DATABASE_URL` aponta para `private_alpdb:5432`
- [ ] Ver logs do container (últimas 100 linhas)
- [ ] Verificar se build completou com sucesso

### **No Browser:**
- [ ] Limpar storage (F12 → Application → Clear site data)
- [ ] Verificar cookies (`document.cookie` no console)
- [ ] Testar em janela anônima
- [ ] Verificar se há erros no Console (F12)

### **No Banco de Dados:**
- [ ] Confirmar que usuário existe e é superadmin
- [ ] Verificar company_id do usuário
- [ ] Verificar se há múltiplas companies

---

## 📋 **Como Obter Logs Úteis:**

### **1. Logs do Easypanel:**
```
Easypanel → Seu Projeto → Logs → Ver últimas 100 linhas
```

Procurar por:
- Linhas com `Error:`
- Linhas com `[AuthHelpers]`
- Linhas com `[DEBUG]`
- Stack traces (linhas começando com `at`)

### **2. Logs do Browser:**
```
F12 → Console → Filtrar por "Error" ou "500"
```

Copiar:
- Mensagens de erro completas
- Stack traces
- Network tab → Requisições que falharam (500/401)

---

## ✅ **Solução Passo a Passo:**

### **PASSO 1: Verificar NEXTAUTH_URL**

1. Acessar Easypanel → Projeto → Environment Variables
2. Procurar `NEXTAUTH_URL`
3. Verificar se é **exatamente**:
   ```
   NEXTAUTH_URL=https://anchorpwa.easypanel.host
   ```
4. Se estiver errado, corrigir e **rebuild** o container

### **PASSO 2: Limpar Cache do Browser**

1. F12 → Application → Storage
2. Clicar "Clear site data"
3. Fechar TODAS as abas do site
4. Abrir janela anônima (Ctrl+Shift+N)

### **PASSO 3: Testar Login em Janela Anônima**

1. `https://anchorpwa.easypanel.host/auth/login`
2. Login com `admin1@anchorview.com`
3. Após login → F12 → Console → `document.cookie`
4. **Deve ver:** `next-auth.session-token=eyJ...`

### **PASSO 4: Testar Funcionalidade**

1. Ir em `/app`
2. Tentar criar projeto
3. Recarregar página (F5)
4. **Deve:** Continuar logado e projeto aparecer

### **PASSO 5: Verificar Logs do Servidor**

Se ainda não funcionar, enviar logs do Easypanel com:
- Tentativa de criar equipe
- Erro completo com stack trace
- Linhas antes e depois do erro

---

## 🎯 **Status Atual:**

| Item | Status | Ação Necessária |
|------|--------|-----------------|
| Middleware corrigido | ✅ | Código commitado |
| Usuário é superadmin | ✅ | Confirmado no banco |
| NEXTAUTH_URL produção | ❓ | **VERIFICAR NO EASYPANEL** |
| Cookies salvando | ❓ | Testar com `document.cookie` |
| Logs do servidor | ❓ | **ENVIAR LOGS** |

---

## 📞 **Informações para Debug:**

Quando reportar o problema, incluir:

1. **Logs do Easypanel** (últimas 50-100 linhas)
2. **Valor de `NEXTAUTH_URL`** no Easypanel
3. **Resultado de `document.cookie`** no Console
4. **Erro exato do Network tab** (Request/Response completos)

---

**Última atualização:** 2025-11-10 23:30
