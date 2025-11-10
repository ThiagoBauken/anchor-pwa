# 🚀 Próximos Passos - Deploy no Easypanel

## ✅ O Que Já Está Pronto

1. ✅ Código corrigido (middleware, auth, permissions)
2. ✅ Database sincronizado (48 tabelas criadas)
3. ✅ Docker otimizado (build rápido)
4. ✅ Logs de debug adicionados
5. ✅ Usuário admin1@anchorview.com é superadmin
6. ✅ Documentação completa criada

## 🎯 O Que Falta Fazer (VOCÊ)

### PASSO 1: Configurar Variáveis de Ambiente no Easypanel

**📂 Arquivo**: `EASYPANEL-ENV-CORRECTED.txt`

**Como fazer:**

1. Abrir Easypanel → Seu Projeto → **Environment Variables**
2. **Copiar TODO o conteúdo** de `EASYPANEL-ENV-CORRECTED.txt`
3. **Colar** no campo de variáveis (substituir tudo)
4. **Salvar** (botão Save/Salvar)

**⚠️ CRÍTICO - Verifique estas 3 variáveis:**

```env
NEXTAUTH_URL=https://anchorpwa.easypanel.host
NEXT_PUBLIC_APP_URL=https://anchorpwa.easypanel.host
DATABASE_URL=postgres://privado:privado12!@private_alpdb:5432/privado?sslmode=disable
```

**❌ Valores ERRADOS que causam erro:**
- `NEXTAUTH_URL=http://localhost:9002` ❌
- `NEXTAUTH_URL=http://anchorpwa.easypanel.host` ❌ (HTTP ao invés de HTTPS)
- `DATABASE_URL=postgres://...@185.215.165.19:8002/...` ❌ (IP externo ao invés de hostname interno)

---

### PASSO 2: Configurar Porta do Container

**Onde**: Easypanel → Projeto → **Settings → Ports**

**Configuração:**
```
Container Port: 9002
Protocol:       HTTP
```

Se houver opção de "External Port", pode deixar vazio ou colocar `80`.

**📖 Leia**: `EASYPANEL-PORT-CONFIG.md` para entender como funciona.

---

### PASSO 3: Rebuild do Container

**Como fazer:**

1. Easypanel → Projeto → **Rebuild** (botão)
2. Aguardar build completar (~5-10 minutos)
3. Verificar logs durante build
4. Aguardar mensagem: "🚀 Starting Next.js application..."

**⚠️ Se build falhar:**
- Ver logs completos
- Procurar por linhas com `Error:` ou `Failed:`
- Enviar erro completo se precisar de ajuda

---

### PASSO 4: Limpar Cache do Browser

**MUITO IMPORTANTE!** Sem isso, vai continuar dando erro!

**Como fazer:**

1. Fechar **TODAS** as abas de `https://anchorpwa.easypanel.host`
2. Abrir **nova janela anônima** (Ctrl+Shift+N)
3. Ou: F12 → Application → Storage → **Clear site data**

---

### PASSO 5: Testar Login

**URL**: `https://anchorpwa.easypanel.host/auth/login`

**Credenciais de teste:**
```
Email:    admin1@anchorview.com
Password: adminpass123
```

**Checklist de teste:**

- [ ] Login funciona sem erro
- [ ] Após login, redireciona para `/app`
- [ ] F12 → Console → digitar: `document.cookie`
- [ ] **Deve ver**: `next-auth.session-token=eyJ...`
- [ ] Recarregar página (F5) → **deve continuar logado**
- [ ] Criar projeto → **não deve sumir após F5**
- [ ] Acessar `/admin` → **deve abrir sem erro 500**

---

### PASSO 6: Verificar Logs do Servidor

**Onde**: Easypanel → Projeto → **Logs**

**Procurar por:**

✅ **Mensagens BOM SINAL:**
```
🚀 Starting Next.js application...
Listening on port 9002
[AuthHelpers] User authenticated: { id: '...', role: 'superadmin' }
```

❌ **Mensagens ERRO:**
```
[AuthHelpers] No session or email found
Can't reach database server
Error: Authentication required
```

---

## 🆘 Se Ainda Não Funcionar

### Erro: "No session or email found"

**Causa**: NEXTAUTH_URL ainda está errado no Easypanel

**Solução**:
1. Verificar novamente variáveis de ambiente
2. **Deve ser exatamente**: `NEXTAUTH_URL=https://anchorpwa.easypanel.host`
3. Rebuild após corrigir
4. Limpar cache do browser

---

### Erro: "Company mismatch"

**Causa**: Browser tem dados antigos de múltiplas companies

**Solução**:
1. F12 → Application → Storage → **Clear site data**
2. Fazer logout completo
3. Fechar todas as abas
4. Login em janela anônima

---

### Erro: "Database not available"

**Causa**: DATABASE_URL aponta para lugar errado

**Solução**:
```env
# ❌ ERRADO (IP externo):
DATABASE_URL=postgres://privado:privado12!@185.215.165.19:8002/privado

# ✅ CORRETO (hostname interno Docker):
DATABASE_URL=postgres://privado:privado12!@private_alpdb:5432/privado?sslmode=disable
```

---

## 📚 Documentos de Referência

1. **EASYPANEL-ENV-CORRECTED.txt** - Variáveis prontas para copiar/colar
2. **EASYPANEL-PORT-CONFIG.md** - Explicação detalhada sobre portas
3. **TROUBLESHOOTING-ERROS-500.md** - Guia completo de troubleshooting
4. **EASYPANEL-ENV-VARS.md** - Explicação de cada variável

---

## ✅ Checklist Final

- [ ] Copiei variáveis de `EASYPANEL-ENV-CORRECTED.txt` para Easypanel
- [ ] Verifiquei que `NEXTAUTH_URL` é HTTPS (não HTTP)
- [ ] Verifiquei que `DATABASE_URL` usa `private_alpdb:5432`
- [ ] Configurei porta 9002 no Easypanel
- [ ] Fiz Rebuild do container
- [ ] Aguardei build completar
- [ ] Limpei cache do browser
- [ ] Testei login em janela anônima
- [ ] Verifiquei que sessão persiste após F5
- [ ] Testei criar projeto e verificar que não some

---

## 🎉 Quando Tudo Funcionar

Se seguir todos os passos e ainda assim não funcionar:

1. **Copiar logs completos** do Easypanel (últimas 100 linhas)
2. **Tirar screenshot** do erro no browser (F12 → Console)
3. **Copiar resultado** de `document.cookie` no Console
4. **Enviar** essas 3 informações para análise

---

**Criado**: 2025-11-10
**Versão**: 1.0
