# Variáveis de Ambiente para Easypanel (Produção)

## ⚠️ IMPORTANTE: Configure estas variáveis no Easypanel

### 🔐 DATABASE

```env
DATABASE_URL=postgres://privado:privado12!@private_alpdb:5432/privado?sslmode=disable
```
**Nota:** Em produção use o hostname INTERNO do Docker (`private_alpdb`), não o IP externo!

---

### 🔑 NEXTAUTH (CRÍTICO!)

```env
NEXTAUTH_URL=https://anchorpwa.easypanel.host
NEXTAUTH_SECRET=57be0e68ee112d72ca3f1ee5b69f9937ce79ae11c48b44768cda3c15fd5016e9
```

**⚠️ CRITICAL:** `NEXTAUTH_URL` DEVE ser HTTPS e exato (com https://)
- ❌ Errado: `http://anchorpwa.easypanel.host`
- ❌ Errado: `anchorpwa.easypanel.host`
- ✅ Correto: `https://anchorpwa.easypanel.host`

Se errado, **cookies não funcionam** e usuários não conseguem fazer login!

---

### 🔒 JWT & SESSION

```env
JWT_SECRET=anchorview-super-secret-jwt-key-change-in-production-2025
SESSION_SECRET=anchorview-super-secret-session-key-2025-change-this
```

---

### 🤖 GOOGLE AI (Opcional)

```env
GEMINI_API_KEY=
```
Deixe vazio se não usar funcionalidades de IA.

---

### 💳 MERCADO PAGO (Opcional)

```env
MERCADO_PAGO_ACCESS_TOKEN=TEST-123456789-123456-abc123def456-abc123def456
MERCADO_PAGO_PUBLIC_KEY=TEST-abc123def456-123456-abc123def456
MERCADO_PAGO_WEBHOOK_SECRET=your-webhook-secret
MERCADO_PAGO_NOTIFICATION_URL=https://anchorpwa.easypanel.host/api/webhooks/mercadopago
```

---

### 📧 EMAIL (Opcional)

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM="AnchorView <noreply@anchorview.com>"
```

---

### ⚙️ CONFIGURAÇÕES GERAIS

```env
NEXT_PUBLIC_APP_URL=https://anchorpwa.easypanel.host
NEXT_TELEMETRY_DISABLED=1
NODE_ENV=production
```

---

### 📱 PWA

```env
NEXT_PUBLIC_PWA_ENABLED=true
MAX_FILE_SIZE_MB=50
```

---

## 🚀 Como Configurar no Easypanel

1. Acesse seu projeto no Easypanel
2. Vá em **Environment Variables**
3. Cole TODAS as variáveis acima
4. Salve e **rebuild** o container

---

## ✅ Testar Após Deploy

1. Acesse `https://anchorpwa.easypanel.host/auth/login`
2. Faça login com: `admin1@anchorview.com`
3. Teste criar um projeto
4. **Recarregue a página** (F5)
5. ✅ Se continuar logado e projeto aparecer = FUNCIONANDO!

---

## 🐛 Solução de Problemas

### Problema: "Authentication required" após login

**Causa:** `NEXTAUTH_URL` incorreto ou faltando

**Solução:**
```env
NEXTAUTH_URL=https://anchorpwa.easypanel.host  # DEVE ser HTTPS!
```

### Problema: Projetos somem após reload

**Causa:** Session não persiste (cookies não salvando)

**Solução:** Verificar se `NEXTAUTH_URL` está correto com HTTPS

### Problema: "Company mismatch"

**Causa:** Usuário sem permissões

**Solução:** Executar no banco:
```sql
UPDATE "User"
SET role = 'superadmin', active = true, "emailVerified" = NOW()
WHERE email = 'admin1@anchorview.com';
```

---

## 📝 Comandos Úteis

### Dar permissões de superadmin a um usuário:

```bash
# Local (executar na sua máquina)
DATABASE_URL="postgres://privado:privado12!@185.215.165.19:8002/privado?sslmode=disable" node make-superadmin.js usuario@email.com
```

### Verificar usuário no banco:

```sql
SELECT id, name, email, role, "companyId", active
FROM "User"
WHERE email = 'admin1@anchorview.com';
```

### Verificar companies no banco:

```sql
SELECT id, name, "subscriptionStatus", "trialEndDate"
FROM "Company";
```

---

**Última atualização:** 2025-11-10
**Status:** admin1@anchorview.com já é superadmin ✅
