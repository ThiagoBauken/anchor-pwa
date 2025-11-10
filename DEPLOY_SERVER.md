# 🚀 DEPLOY NO SERVIDOR - PASSO A PASSO OBRIGATÓRIO

## ❌ PROBLEMA ATUAL

O servidor está rodando código ANTIGO. Por isso:
- Projetos deletados voltam
- Erros de Prisma ("column 'new' doesn't exist")
- Server Actions não encontrados

---

## ✅ SOLUÇÃO: REDEPLOY COMPLETO

### OPÇÃO 1: Pelo Painel EasyPanel (RECOMENDADO)

1. Acesse https://easypanel.io (ou seu painel)
2. Faça login
3. Encontre o projeto `anchor-pwa` (ou nome do seu app)
4. Procure botão **"Redeploy"** ou **"Rebuild"** ou **"Deploy"**
5. Clique e aguarde (~5 minutos)
6. Verifique logs até ver "✓ Build successful"

---

### OPÇÃO 2: Via GitHub Actions (Se configurado)

1. Vá em https://github.com/ThiagoBauken/anchor-pwa/actions
2. Clique em "Run workflow" no workflow de deploy
3. Aguarde conclusão

---

### OPÇÃO 3: Via Terminal SSH (Última opção)

```bash
# SSH no servidor
ssh user@seu-servidor

# Ir para pasta do app
cd /app

# Puxar código novo
git pull origin main

# Limpar dependências antigas
rm -rf node_modules package-lock.json .next

# Reinstalar
npm install

# Gerar Prisma Client
npm run db:setup

# Build
npm run build

# Reiniciar (depende do gerenciador de processos)
# Se usar PM2:
pm2 restart all

# Se usar systemd:
sudo systemctl restart anchor-pwa

# Se Docker:
docker-compose down && docker-compose up -d --build
```

---

## 🧪 VERIFICAR SE DEU CERTO

Após deploy, teste no terminal do servidor:

```bash
# Verificar se Prisma Client foi gerado
ls -la node_modules/@prisma/client/generator-build/

# Se mostrar arquivos = ✅ OK
# Se mostrar erro = ❌ Execute: npm run db:setup
```

---

## 📝 CHECKLIST

- [ ] Redeploy iniciado
- [ ] Build completou sem erros
- [ ] Servidor reiniciado
- [ ] Prisma Client gerado
- [ ] Aplicação respondendo na URL
- [ ] Limpar cache do navegador (próximo passo)

---

**Data:** 2025-11-10
**Commits necessários:** 27bde4c + beb7e91
**Status:** ⚠️ OBRIGATÓRIO - Aplicação não funciona sem isso
