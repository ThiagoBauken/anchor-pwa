#!/bin/bash
# Script para rebuild completo do Docker e limpar banco de dados

set -e

echo "🧹 Limpando Docker cache e containers antigos..."
docker-compose down -v 2>/dev/null || true
docker system prune -f

echo ""
echo "🗑️ Dropando todas as tabelas do PostgreSQL..."
psql 'postgresql://privado:privado12!@private_alpdb:5432/privado?sslmode=disable' << 'EOSQL'
-- Drop todas as tabelas
DROP TABLE IF EXISTS "PathologyMarker" CASCADE;
DROP TABLE IF EXISTS "PathologyCategory" CASCADE;
DROP TABLE IF EXISTS "FacadeSide" CASCADE;
DROP TABLE IF EXISTS "FacadeInspection" CASCADE;
DROP TABLE IF EXISTS "VerificationToken" CASCADE;
DROP TABLE IF EXISTS "Session" CASCADE;
DROP TABLE IF EXISTS "Account" CASCADE;
DROP TABLE IF EXISTS "AuditLog" CASCADE;
DROP TABLE IF EXISTS "Notification" CASCADE;
DROP TABLE IF EXISTS "UserSession" CASCADE;
DROP TABLE IF EXISTS "SyncQueue" CASCADE;
DROP TABLE IF EXISTS "File" CASCADE;
DROP TABLE IF EXISTS "Photo" CASCADE;
DROP TABLE IF EXISTS "AnchorTest" CASCADE;
DROP TABLE IF EXISTS "AnchorPoint" CASCADE;
DROP TABLE IF EXISTS "ProjectTeamPermission" CASCADE;
DROP TABLE IF EXISTS "TeamMember" CASCADE;
DROP TABLE IF EXISTS "Team" CASCADE;
DROP TABLE IF EXISTS "Payment" CASCADE;
DROP TABLE IF EXISTS "Subscription" CASCADE;
DROP TABLE IF EXISTS "SubscriptionPlan" CASCADE;
DROP TABLE IF EXISTS "Project" CASCADE;
DROP TABLE IF EXISTS "Location" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;
DROP TABLE IF EXISTS "Company" CASCADE;
DROP TABLE IF EXISTS "_prisma_migrations" CASCADE;

-- Drop todos os enums
DROP TYPE IF EXISTS "UserRole" CASCADE;
DROP TYPE IF EXISTS "TeamMemberRole" CASCADE;
DROP TYPE IF EXISTS "SubscriptionStatus" CASCADE;
DROP TYPE IF EXISTS "PaymentStatus" CASCADE;
DROP TYPE IF EXISTS "InspectionStatus" CASCADE;
DROP TYPE IF EXISTS "FacadeSideType" CASCADE;
DROP TYPE IF EXISTS "PathologySeverity" CASCADE;

-- Drop tabelas antigas (snake_case)
DROP TABLE IF EXISTS "users" CASCADE;
DROP TABLE IF EXISTS "companies" CASCADE;
DROP TABLE IF EXISTS "projects" CASCADE;
DROP TABLE IF EXISTS "locations" CASCADE;
DROP TABLE IF EXISTS "anchor_points" CASCADE;
DROP TABLE IF EXISTS "anchor_tests" CASCADE;
DROP TABLE IF EXISTS "subscriptions" CASCADE;
DROP TABLE IF EXISTS "subscription_plans" CASCADE;
DROP TABLE IF EXISTS "teams" CASCADE;
DROP TABLE IF EXISTS "team_members" CASCADE;
DROP TABLE IF EXISTS "project_team_permissions" CASCADE;
DROP TABLE IF EXISTS "facade_inspections" CASCADE;
DROP TABLE IF EXISTS "pathology_markers" CASCADE;
DROP TABLE IF EXISTS "pathology_categories" CASCADE;

\echo '✅ Todas as tabelas foram dropadas!'
EOSQL

echo ""
echo "🔄 Rebuilding Docker image (sem cache)..."
docker-compose build --no-cache

echo ""
echo "🚀 Iniciando containers..."
docker-compose up -d

echo ""
echo "⏳ Aguardando aplicação iniciar (30s)..."
sleep 30

echo ""
echo "📊 Verificando logs..."
docker-compose logs --tail=50 app

echo ""
echo "✅ Rebuild completo finalizado!"
echo ""
echo "🌐 Acesse: http://localhost:9002"
echo ""
echo "⚠️  IMPORTANTE: Limpe o cache do navegador (Ctrl+Shift+Del) antes de acessar!"
