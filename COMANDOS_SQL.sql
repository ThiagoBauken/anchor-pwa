-- =========================================
-- COMANDOS SQL - APENAS SE PRISMA GENERATE FALHAR
-- =========================================
-- IMPORTANTE: Execute npx prisma generate primeiro!
-- Só use estes comandos SQL se o Prisma generate não funcionar

-- Conectar ao banco:
-- psql -h private_alpdb -U privado -d privado

-- =========================================
-- 1. VERIFICAR COLUNAS FALTANTES
-- =========================================

-- Ver estrutura da tabela Project
\d "Project"

-- Ver estrutura da tabela Location
\d "Location"

-- Ver estrutura da tabela AnchorPoint
\d "AnchorPoint"

-- =========================================
-- 2. ADICIONAR COLUNAS FALTANTES (SE NECESSÁRIO)
-- =========================================

-- Adicionar coluna 'new' se não existir (provável causa do erro)
ALTER TABLE "Project"
ADD COLUMN IF NOT EXISTS "new" BOOLEAN DEFAULT false;

-- Adicionar outras colunas que podem estar faltando
ALTER TABLE "Project"
ADD COLUMN IF NOT EXISTS "floorPlanImages" TEXT[] DEFAULT '{}';

-- Para AnchorPoint
ALTER TABLE "AnchorPoint"
ADD COLUMN IF NOT EXISTS "archivedById" TEXT,
ADD COLUMN IF NOT EXISTS "floorPlanId" TEXT,
ADD COLUMN IF NOT EXISTS "photoUploadPending" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "lastSyncedAt" TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS "syncStatus" TEXT DEFAULT 'synced',
ADD COLUMN IF NOT EXISTS "gpsLatitude" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "gpsLongitude" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "gpsAccuracy" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "gpsTimestamp" TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS "nextInspectionDate" TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS "inspectionInterval" INTEGER DEFAULT 180,
ADD COLUMN IF NOT EXISTS "lastInspectionDate" TIMESTAMPTZ;

-- Para AnchorTest
ALTER TABLE "AnchorTest"
ADD COLUMN IF NOT EXISTS "regulatoryStandard" TEXT,
ADD COLUMN IF NOT EXISTS "complianceStatus" TEXT DEFAULT 'compliant',
ADD COLUMN IF NOT EXISTS "certificationNumber" TEXT,
ADD COLUMN IF NOT EXISTS "equipmentUsed" TEXT,
ADD COLUMN IF NOT EXISTS "equipmentSerialNumber" TEXT,
ADD COLUMN IF NOT EXISTS "equipmentCalibration" TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS "weatherConditions" TEXT,
ADD COLUMN IF NOT EXISTS "temperature" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "humidity" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "technicianLicense" TEXT,
ADD COLUMN IF NOT EXISTS "technicianCertification" TEXT,
ADD COLUMN IF NOT EXISTS "supervisorId" TEXT;

-- =========================================
-- 3. VERIFICAR SE ADICIONOU
-- =========================================

-- Ver novamente estrutura das tabelas
\d "Project"
\d "AnchorPoint"
\d "AnchorTest"

-- =========================================
-- 4. SAIR DO PSQL
-- =========================================

\q

-- =========================================
-- DEPOIS: REINICIAR APLICAÇÃO
-- =========================================

-- No terminal bash (fora do psql):
-- pm2 restart all
