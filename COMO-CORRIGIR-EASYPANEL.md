# 🔴 COMO CORRIGIR NO EASYPANEL - PASSO A PASSO

## ⚠️ LEIA ISTO PRIMEIRO

**SEM FAZER ISSO, NADA VAI FUNCIONAR!**

Os erros que você está vendo:
```
[AuthHelpers] No session or email found
Error: Authentication required. Please log in.
```

São causados porque **`NEXTAUTH_URL` está errado** no Easypanel.

---

## 📍 PASSO 1: Abrir Configuração de Variáveis

1. Abrir **Easypanel** no navegador
2. Fazer login
3. Clicar no **seu projeto** (anchorpwa ou similar)
4. No menu lateral, procurar e clicar em:
   - **"Environment"** ou
   - **"Settings"** → **"Environment Variables"** ou
   - **"Configuration"** → **"Environment"**

---

## 📍 PASSO 2: Procurar NEXTAUTH_URL

Na lista de variáveis de ambiente, **ROLAR ATÉ ENCONTRAR**:

```
NEXTAUTH_URL
```

**Olhar o valor atual.** Provavelmente está:
```
http://localhost:9002
```
ou
```
http://anchorpwa.easypanel.host
```

**AMBOS ESTÃO ERRADOS!**

---

## 📍 PASSO 3: Mudar para HTTPS

**Clicar** na linha de `NEXTAUTH_URL` para editar.

**Mudar o valor para EXATAMENTE isto:**
```
https://anchorpwa.easypanel.host
```

**ATENÇÃO aos detalhes:**
- Começa com `https://` (não `http://`)
- Sem `:9002` no final
- Sem espaços antes ou depois
- Sem barra `/` no final

---

## 📍 PASSO 4: Salvar Variáveis

**Clicar no botão** (pode estar escrito):
- "Save" ou
- "Salvar" ou
- "Update" ou
- "Apply"

**Aguardar** mensagem de confirmação.

---

## 📍 PASSO 5: REBUILD (CRUCIAL!)

**⚠️ MUITO IMPORTANTE**: Apenas salvar NÃO aplica a mudança!

**Você DEVE fazer rebuild:**

1. No menu do projeto, procurar e **clicar em**:
   - **"Deploy"** ou
   - **"Rebuild"** ou
   - **"Redeploy"** ou
   - Botão com ícone de 🔄 (reload)

2. **Confirmar** rebuild se perguntar

3. **AGUARDAR** build completar (5-10 minutos)
   - Pode ver progresso em "Logs" ou "Build Logs"
   - Esperar até ver: "🚀 Starting Next.js application..."

**SEM REBUILD, A MUDANÇA NÃO TEM EFEITO!**

---

## 📍 PASSO 6: Limpar Browser e Testar

Após rebuild completar:

1. **Fechar TODAS as abas** de anchorpwa.easypanel.host
2. **Abrir janela anônima**: Ctrl+Shift+N (Chrome/Edge) ou Ctrl+Shift+P (Firefox)
3. **Ir para**: `https://anchorpwa.easypanel.host/auth/login`
4. **Fazer login**: admin1@anchorview.com
5. **Após login**: Pressionar F5 (recarregar)
6. **DEVE**: Continuar logado (não voltar para tela de login)

---

## ✅ COMO SABER SE DEU CERTO

Após login, abrir Console (F12) e digitar:
```javascript
document.cookie
```

**✅ DEVE MOSTRAR** algo como:
```
"next-auth.session-token=eyJhbGciOiJIUzI1NiJ9..."
```

**❌ SE NÃO MOSTRAR** `next-auth.session-token`:
→ Você pulou algum passo ou NEXTAUTH_URL ainda está errado

---

## 🆘 AINDA NÃO FUNCIONA?

Se fez TUDO acima e ainda dá erro:

### Verificar se Rebuild Completou

Easypanel → Logs → Procurar por:
```
🚀 Starting Next.js application...
Listening on port 9002
```

Se **NÃO** aparecer essas linhas:
→ Build falhou ou ainda está rodando
→ Aguardar mais tempo ou verificar erros de build

### Verificar Valor de NEXTAUTH_URL

Easypanel → Environment Variables

**Copiar e enviar** o valor EXATO de `NEXTAUTH_URL` para eu verificar.

### Verificar Cookies

F12 → Application → Cookies → https://anchorpwa.easypanel.host

Verificar se `next-auth.session-token` existe.

Se **NÃO** existir → Cookie não está sendo salvo.

---

## 📋 CHECKLIST FINAL

Marque conforme fizer:

- [ ] Abri Easypanel → Projeto → Environment Variables
- [ ] Mudei `NEXTAUTH_URL` para `https://anchorpwa.easypanel.host`
- [ ] Salvei (cliquei em Save/Salvar)
- [ ] Cliquei em Deploy/Rebuild
- [ ] Aguardei 5-10 minutos para build completar
- [ ] Vi nos logs: "🚀 Starting Next.js application..."
- [ ] Fechei todas as abas do site
- [ ] Abri janela anônima
- [ ] Fiz login novamente
- [ ] Verifiquei `document.cookie` tem `next-auth.session-token`
- [ ] Recarreguei (F5) e continuei logado
- [ ] Consegui criar projeto sem erro

---

**SE TODOS OS PASSOS ACIMA ESTIVEREM ✅**: Sistema funcionará!

**SE ALGUM ESTIVER ❌**: Sistema continuará com erro!

---

**Criado**: 2025-11-10
