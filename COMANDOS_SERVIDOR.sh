#!/bin/bash
# =========================================
# COMANDOS PARA EXECUTAR NO SERVIDOR
# =========================================
# Cole estes comandos no terminal do EasyPanel

echo "🚀 Iniciando correção do servidor..."

# 1. ATUALIZAR PRISMA CLIENT (RECOMENDADO - RESOLVE TUDO)
echo "📦 Gerando Prisma Client atualizado..."
npx prisma generate

# 2. VERIFICAR SE GEROU CORRETAMENTE
echo "✅ Verificando Prisma Client..."
npx prisma --version

# 3. REINICIAR APLICAÇÃO
echo "🔄 Reiniciando aplicação..."
pm2 restart all

# OU se não usar PM2:
# npm run build
# docker-compose restart (ou reiniciar container manualmente)

echo "✅ Servidor atualizado!"
echo ""
echo "⚠️  PRÓXIMO PASSO:"
echo "No navegador, execute o script de limpeza do LIMPAR_CACHE_COMPLETO.md"
