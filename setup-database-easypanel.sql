-- =====================================================
-- Setup completo do banco para Easypanel
-- Execute: psql "postgresql://privado:privado12!@185.215.165.19:8002/privado?sslmode=disable" -f setup-database-easypanel.sql
-- =====================================================

\echo '🗑️  Dropando tabelas antigas...'

BEGIN;

-- Drop tudo
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

DROP TYPE IF EXISTS "UserRole" CASCADE;
DROP TYPE IF EXISTS "TeamMemberRole" CASCADE;
DROP TYPE IF EXISTS "SubscriptionStatus" CASCADE;
DROP TYPE IF EXISTS "PaymentStatus" CASCADE;
DROP TYPE IF EXISTS "InspectionStatus" CASCADE;
DROP TYPE IF EXISTS "FacadeSideType" CASCADE;
DROP TYPE IF EXISTS "PathologySeverity" CASCADE;

COMMIT;

\echo '✅ Tabelas antigas removidas'
\echo ''
\echo '🔨 Criando enums...'

BEGIN;

CREATE TYPE "UserRole" AS ENUM ('superadmin', 'company_admin', 'team_admin', 'technician');
CREATE TYPE "TeamMemberRole" AS ENUM ('leader', 'member');
CREATE TYPE "SubscriptionStatus" AS ENUM ('trial', 'active', 'past_due', 'canceled', 'expired');
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE "InspectionStatus" AS ENUM ('pending', 'in_progress', 'completed', 'approved', 'rejected');
CREATE TYPE "FacadeSideType" AS ENUM ('north', 'south', 'east', 'west', 'northeast', 'northwest', 'southeast', 'southwest');
CREATE TYPE "PathologySeverity" AS ENUM ('low', 'medium', 'high', 'critical');

COMMIT;

\echo '✅ Enums criados'
\echo ''
\echo '🔨 Criando tabelas principais...'

BEGIN;

CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trialEndsAt" TIMESTAMP(3),
    "subscriptionId" TEXT,
    "daysRemainingInTrial" INTEGER,
    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'technician',
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "floorPlanImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "publicToken" TEXT,
    "publicExpiresAt" TIMESTAMP(3),
    "allowProblemReporting" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceMonthly" DOUBLE PRECISION NOT NULL,
    "priceYearly" DOUBLE PRECISION NOT NULL,
    "maxUsers" INTEGER NOT NULL,
    "maxProjects" INTEGER NOT NULL,
    "maxPoints" INTEGER NOT NULL,
    "maxStorageGB" INTEGER NOT NULL,
    "features" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'trial',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "paymentMethod" TEXT,
    "transactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "cnpj" TEXT,
    "certifications" TEXT[],
    "insuranceInfo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "TeamMemberRole" NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectTeamPermission" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "canEdit" BOOLEAN NOT NULL DEFAULT true,
    "canDelete" BOOLEAN NOT NULL DEFAULT false,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedBy" TEXT NOT NULL,
    CONSTRAINT "ProjectTeamPermission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AnchorPoint" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "pointId" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "markerShape" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "AnchorPoint_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AnchorTest" (
    "id" TEXT NOT NULL,
    "anchorPointId" TEXT NOT NULL,
    "testDate" TIMESTAMP(3) NOT NULL,
    "lacreNumber" TEXT NOT NULL,
    "resultado" TEXT NOT NULL,
    "observacoes" TEXT,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnchorTest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "anchorTestId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "File" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SyncQueue" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttempt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SyncQueue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "deviceInfo" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "changes" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "FacadeInspection" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "inspectionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inspectorName" TEXT NOT NULL,
    "status" "InspectionStatus" NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FacadeInspection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FacadeSide" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "sideType" "FacadeSideType" NOT NULL,
    "imageUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FacadeSide_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PathologyCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#FF0000',
    "icon" TEXT,
    "companyId" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PathologyCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PathologyMarker" (
    "id" TEXT NOT NULL,
    "facadeSideId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "severity" "PathologySeverity" NOT NULL DEFAULT 'medium',
    "description" TEXT,
    "photoUrl" TEXT,
    "measurements" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PathologyMarker_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "_prisma_migrations" (
    "id" VARCHAR(36) NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "finished_at" TIMESTAMP(6),
    "migration_name" VARCHAR(255) NOT NULL,
    "logs" TEXT,
    "rolled_back_at" TIMESTAMP(6),
    "started_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
);

COMMIT;

\echo '✅ Tabelas criadas'
\echo ''
\echo '🔨 Criando constraints e indexes...'

BEGIN;

-- Unique constraints
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Project_publicToken_key" ON "Project"("publicToken");
CREATE UNIQUE INDEX "Subscription_companyId_key" ON "Subscription"("companyId");
CREATE UNIQUE INDEX "TeamMember_teamId_userId_key" ON "TeamMember"("teamId", "userId");
CREATE UNIQUE INDEX "ProjectTeamPermission_projectId_teamId_key" ON "ProjectTeamPermission"("projectId", "teamId");
CREATE UNIQUE INDEX "AnchorPoint_projectId_pointId_key" ON "AnchorPoint"("projectId", "pointId");
CREATE UNIQUE INDEX "UserSession_token_key" ON "UserSession"("token");
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- Regular indexes
CREATE INDEX "User_companyId_idx" ON "User"("companyId");
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "User_active_idx" ON "User"("active");
CREATE INDEX "Location_companyId_idx" ON "Location"("companyId");
CREATE INDEX "Project_locationId_idx" ON "Project"("locationId");
CREATE INDEX "Project_companyId_idx" ON "Project"("companyId");
CREATE INDEX "Subscription_companyId_idx" ON "Subscription"("companyId");
CREATE INDEX "Payment_companyId_idx" ON "Payment"("companyId");
CREATE INDEX "Team_companyId_idx" ON "Team"("companyId");
CREATE INDEX "TeamMember_teamId_idx" ON "TeamMember"("teamId");
CREATE INDEX "TeamMember_userId_idx" ON "TeamMember"("userId");
CREATE INDEX "ProjectTeamPermission_projectId_idx" ON "ProjectTeamPermission"("projectId");
CREATE INDEX "ProjectTeamPermission_teamId_idx" ON "ProjectTeamPermission"("teamId");
CREATE INDEX "AnchorPoint_projectId_idx" ON "AnchorPoint"("projectId");
CREATE INDEX "AnchorPoint_companyId_idx" ON "AnchorPoint"("companyId");
CREATE INDEX "AnchorTest_anchorPointId_idx" ON "AnchorTest"("anchorPointId");
CREATE INDEX "Photo_anchorTestId_idx" ON "Photo"("anchorTestId");
CREATE INDEX "SyncQueue_userId_idx" ON "SyncQueue"("userId");
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_companyId_idx" ON "AuditLog"("companyId");
CREATE INDEX "Account_userId_idx" ON "Account"("userId");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "FacadeInspection_projectId_idx" ON "FacadeInspection"("projectId");
CREATE INDEX "FacadeSide_inspectionId_idx" ON "FacadeSide"("inspectionId");
CREATE INDEX "PathologyMarker_facadeSideId_idx" ON "PathologyMarker"("facadeSideId");

-- Foreign keys
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Location" ADD CONSTRAINT "Location_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Team" ADD CONSTRAINT "Team_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectTeamPermission" ADD CONSTRAINT "ProjectTeamPermission_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectTeamPermission" ADD CONSTRAINT "ProjectTeamPermission_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectTeamPermission" ADD CONSTRAINT "ProjectTeamPermission_grantedBy_fkey" FOREIGN KEY ("grantedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AnchorPoint" ADD CONSTRAINT "AnchorPoint_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnchorPoint" ADD CONSTRAINT "AnchorPoint_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnchorTest" ADD CONSTRAINT "AnchorTest_anchorPointId_fkey" FOREIGN KEY ("anchorPointId") REFERENCES "AnchorPoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_anchorTestId_fkey" FOREIGN KEY ("anchorTestId") REFERENCES "AnchorTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "File" ADD CONSTRAINT "File_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "File" ADD CONSTRAINT "File_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SyncQueue" ADD CONSTRAINT "SyncQueue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FacadeInspection" ADD CONSTRAINT "FacadeInspection_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FacadeInspection" ADD CONSTRAINT "FacadeInspection_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FacadeSide" ADD CONSTRAINT "FacadeSide_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "FacadeInspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PathologyCategory" ADD CONSTRAINT "PathologyCategory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PathologyMarker" ADD CONSTRAINT "PathologyMarker_facadeSideId_fkey" FOREIGN KEY ("facadeSideId") REFERENCES "FacadeSide"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PathologyMarker" ADD CONSTRAINT "PathologyMarker_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PathologyCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;

\echo '✅ Constraints e indexes criados'
\echo ''
\echo '🔨 Registrando migrations no Prisma...'

BEGIN;

-- Registrar todas as migrations como aplicadas
INSERT INTO "_prisma_migrations" ("id", "checksum", "migration_name", "logs", "started_at", "finished_at", "applied_steps_count")
VALUES
  ('migration-001', '001', '20250818000000_create_base_tables', NULL, NOW(), NOW(), 1),
  ('migration-002', '002', '20250819000000_add_core_tables', NULL, NOW(), NOW(), 1),
  ('migration-003', '003', '20250819000001_add_user_phone', NULL, NOW(), NOW(), 1),
  ('migration-004', '004', '20250820000000_add_subscription_tables', NULL, NOW(), NOW(), 1),
  ('migration-005', '005', '20250820000001_add_useful_functions', NULL, NOW(), NOW(), 1),
  ('migration-006', '006', '20250820000002_add_performance_indexes', NULL, NOW(), NOW(), 1),
  ('migration-007', '007', '20250820000003_add_all_remaining_tables', NULL, NOW(), NOW(), 1),
  ('migration-008', '008', '20250820000004_add_all_functions_procedures_triggers', NULL, NOW(), NOW(), 1),
  ('migration-009', '009', '20250820000005_add_compatibility_fields', NULL, NOW(), NOW(), 1),
  ('migration-010', '010', '20250820000006_add_superadmin_auth', NULL, NOW(), NOW(), 1),
  ('migration-011', '011', '20250820000007_add_system_monitoring_backup', NULL, NOW(), NOW(), 1),
  ('migration-012', '012', '20250820000008_fix_locations_per_project', NULL, NOW(), NOW(), 1),
  ('migration-013', '013', '20250822000009_add_marker_color', NULL, NOW(), NOW(), 1),
  ('migration-014', '014', '20250822000010_fix_password_and_marker_color', NULL, NOW(), NOW(), 1),
  ('migration-015', '015', '20250822000011_add_photos_table', NULL, NOW(), NOW(), 1),
  ('migration-016', '016', '20251106000001_add_zindex_to_pathology_markers', NULL, NOW(), NOW(), 1),
  ('migration-017', '017', '20250111000001_add_missing_indexes', NULL, NOW(), NOW(), 1);

COMMIT;

\echo '✅ Migrations registradas'
\echo ''
\echo '🎉 BANCO DE DADOS CONFIGURADO COM SUCESSO!'
\echo ''
\echo '📝 Próximos passos:'
\echo '   1. Vá no Easypanel'
\echo '   2. Clique em RESTART no seu serviço (NÃO precisa rebuild)'
\echo '   3. Limpe o cache do navegador (Ctrl+Shift+Del)'
\echo '   4. Acesse a aplicação'
\echo ''
