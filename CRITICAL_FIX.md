# 🚨 CORREÇÃO CRÍTICA - EXECUTAR AGORA

## Problema
O Prisma Client está COMPLETAMENTE DESATUALIZADO. Erros:
1. `The column 'new' does not exist` 
2. `anchor_points.archived_by_id` não existe
3. `anchor_tests.regulatory_standard` não existe

## 🔧 SOLUÇÃO COMPLETA (Execute NESTA ORDEM)

### PASSO 1: Executar SQL no banco
No terminal do EasyPanel:

```bash
psql 'postgresql://privado:privado12!@private_alpdb:5432/privado?sslmode=disable'
```

Cole TODO este SQL:

```sql
-- Adicionar campos em anchor_points
ALTER TABLE anchor_points 
  ADD COLUMN IF NOT EXISTS archived_by_id TEXT,
  ADD COLUMN IF NOT EXISTS floor_plan_id TEXT,
  ADD COLUMN IF NOT EXISTS photo_upload_pending BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'synced',
  ADD COLUMN IF NOT EXISTS gps_latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS gps_longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS gps_accuracy DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS gps_timestamp TIMESTAMP,
  ADD COLUMN IF NOT EXISTS next_inspection_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS inspection_interval INTEGER DEFAULT 180,
  ADD COLUMN IF NOT EXISTS last_inspection_date TIMESTAMP;

-- Adicionar campos em anchor_tests
ALTER TABLE anchor_tests
  ADD COLUMN IF NOT EXISTS regulatory_standard TEXT,
  ADD COLUMN IF NOT EXISTS compliance_status TEXT DEFAULT 'compliant',
  ADD COLUMN IF NOT EXISTS certification_number TEXT,
  ADD COLUMN IF NOT EXISTS equipment_used TEXT,
  ADD COLUMN IF NOT EXISTS equipment_serial_number TEXT,
  ADD COLUMN IF NOT EXISTS equipment_calibration TIMESTAMP,
  ADD COLUMN IF NOT EXISTS weather_conditions TEXT,
  ADD COLUMN IF NOT EXISTS temperature DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS humidity DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS technician_license TEXT,
  ADD COLUMN IF NOT EXISTS technician_certification TEXT,
  ADD COLUMN IF NOT EXISTS supervisor_id TEXT;

-- Verificar
\d anchor_points
\d anchor_tests

-- Sair
\q
```

### PASSO 2: Limpar build cache no EasyPanel

No terminal do EasyPanel:
```bash
rm -rf .next
rm -rf node_modules/.prisma
npx prisma generate
```

### PASSO 3: REBUILD completo no EasyPanel

No dashboard do EasyPanel:
1. Clique em "Rebuild"
2. Aguarde o build completar
3. Verifique os logs

## ✅ Resultado Esperado

Após executar, você NÃO deve mais ver:
- ❌ The column 'new' does not exist
- ❌ anchor_points.archived_by_id does not exist
- ❌ anchor_tests.regulatory_standard does not exist

Tudo deve funcionar normalmente!
