#!/bin/bash
# LIMPAR TODO CACHE - EasyPanel

echo "🧹 Limpando cache do Next.js..."
rm -rf .next

echo "🧹 Limpando cache do Prisma..."
rm -rf node_modules/.prisma

echo "🧹 Limpando node_modules (opcional, mais radical)..."
# Descomente a linha abaixo se quiser limpar tudo
# rm -rf node_modules

echo "📦 Reinstalando dependências..."
npm install

echo "🔄 Regenerando Prisma Client..."
npx prisma generate

echo "✅ Cache limpo! Agora faça REBUILD no EasyPanel."
