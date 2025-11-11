# 🔴 DIAGNÓSTICO: Sessão Não Persiste

**Status**: Confirmado pelos logs - Sessão NÃO está sendo salva

## 📊 Evidências do Problema

Logs do servidor mostram:
```
[AuthHelpers] Attempting to get server session...
[AuthHelpers] No session or email found
⨯ Error: Authentication required. Please log in.
```

Isso significa: **Cookie de sessão não está sendo salvo no browser**

---

## 🎯 CAUSA RAIZ

O `NEXTAUTH_URL` no Easypanel está **incorreto** ou você **não fez rebuild** após corrigir.

---

## ✅ SOLUÇÃO PASSO-A-PASSO

### ETAPA 1: Verificar NEXTAUTH_URL no Easypanel

1. **Abrir** Easypanel no navegador
2. **Ir em**: Seu Projeto → **Environment** (ou **Settings** → **Environment Variables**)
3. **Procurar** a variável `NEXTAUTH_URL`
4. **Verificar** o valor atual

**✅ VALOR CORRETO:**
```
NEXTAUTH_URL=https://anchorpwa.easypanel.host
```

**❌ VALORES ERRADOS (causam o erro):**
```
NEXTAUTH_URL=http://localhost:9002              ❌ ERRADO
NEXTAUTH_URL=http://anchorpwa.easypanel.host    ❌ ERRADO (HTTP)
NEXTAUTH_URL=anchorpwa.easypanel.host           ❌ ERRADO (sem https://)
```

5. **Se estiver errado**: Mudar para `https://anchorpwa.easypanel.host`
6. **Clicar** em **Save** (Salvar)

---

### ETAPA 2: Rebuild do Container (OBRIGATÓRIO!)

**⚠️ IMPORTANTE**: Mudar variáveis **NÃO** aplica automaticamente!

1. No Easypanel, após salvar variáveis
2. **Clicar** no botão **Deploy** ou **Rebuild**
3. **Aguardar** build completar (5-10 minutos)
4. **Verificar logs** mostram:
   ```
   🚀 Starting Next.js application...
   Listening on port 9002
   ```

**Sem rebuild, a mudança NÃO tem efeito!**

---

### ETAPA 3: Limpar Cache e Cookies do Browser

**OPÇÃO 1: Janela Anônima (Mais Fácil)**
1. **Fechar** todas as abas de `anchorpwa.easypanel.host`
2. **Abrir** janela anônima (Ctrl+Shift+N no Chrome/Edge)
3. **Ir para**: `https://anchorpwa.easypanel.host/auth/login`

**OPÇÃO 2: Limpar Storage Manualmente**
1. **Abrir** `https://anchorpwa.easypanel.host`
2. **Pressionar** F12 (DevTools)
3. **Ir em** Application (ou Armazenamento)
4. **Clicar** em "Clear site data" (Limpar dados do site)
5. **Fechar** todas as abas
6. **Abrir** nova aba

---

### ETAPA 4: Fazer Login Novamente

1. **Ir para**: `https://anchorpwa.easypanel.host/auth/login`
2. **Fazer login** com `admin1@anchorview.com`
3. **Após login bem-sucedido**:
   - F12 → Console
   - Digitar: `document.cookie`
   - **Pressionar Enter**

**✅ DEVE MOSTRAR:**
```
"next-auth.session-token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**❌ SE NÃO MOSTRAR** cookie `next-auth.session-token`:
→ NEXTAUTH_URL ainda está errado ou rebuild não completou

---

### ETAPA 5: Testar Persistência da Sessão

1. **Após login**, ir para `/app`
2. **Recarregar** a página (F5)
3. **DEVE**: Continuar logado
4. **Tentar criar** um projeto
5. **DEVE**: Criar sem erro

**❌ SE DESLOGAR** após F5:
→ Cookie não está sendo salvo corretamente
→ Voltar para ETAPA 1

---

## 🔍 CHECKLIST DE VERIFICAÇÃO

Marque cada item conforme fizer:

### No Easypanel:
- [ ] Abri Easypanel → Projeto → Environment Variables
- [ ] Verifiquei que `NEXTAUTH_URL=https://anchorpwa.easypanel.host`
- [ ] Se estava errado, corrigi e salvei
- [ ] Cliquei em "Rebuild" ou "Deploy"
- [ ] Aguardei build completar (vi nos logs)
- [ ] Logs mostram "🚀 Starting Next.js application..."

### No Browser:
- [ ] Fechei TODAS as abas de anchorpwa.easypanel.host
- [ ] Abri janela anônima (Ctrl+Shift+N)
- [ ] Ou: Limpei storage (F12 → Application → Clear site data)
- [ ] Acessei /auth/login
- [ ] Fiz login com admin1@anchorview.com
- [ ] Verifiquei `document.cookie` mostra `next-auth.session-token`
- [ ] Recarreguei página (F5) e continuei logado
- [ ] Tentei criar projeto e funcionou

---

## 🆘 SE AINDA NÃO FUNCIONAR

Se após fazer TODOS os passos acima ainda não funcionar:

### 1. Verificar Variáveis no Easypanel Novamente

Envie **screenshot** ou **copie TODAS as variáveis** do Easypanel que começam com:
- `NEXTAUTH_`
- `NEXT_PUBLIC_`
- `DATABASE_`

### 2. Verificar Logs do Build

Easypanel → Logs → Procurar por:
- Erros durante build
- `NEXTAUTH_URL` sendo printado (se houver debug)
- Mensagens de erro relacionadas a NextAuth

### 3. Verificar Cookies no Browser

F12 → Application → Cookies → `https://anchorpwa.easypanel.host`

**Procurar por**: `next-auth.session-token`

**Se NÃO existir**: Cookie não está sendo salvo!
**Possíveis causas**:
- NEXTAUTH_URL ainda errado
- Problema de HTTPS/SSL
- Browser bloqueando cookies de terceiros

---

## 📞 Informações para Enviar se Precisar Ajuda

1. **Valor de NEXTAUTH_URL** (copie do Easypanel)
2. **Resultado de `document.cookie`** (copie do Console)
3. **Logs do servidor** (últimas 50 linhas após rebuild)
4. **Screenshot** da aba Application → Cookies

---

**Criado**: 2025-11-10
**Última atualização**: 2025-11-10 23:55
