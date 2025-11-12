-- ==========================================
-- MIGRATION: Move floors/divisions config from FacadeSide to FacadeInspection
-- DATE: 2025-01-13
-- REASON: Floors and divisions are same for all sides of a building
-- ==========================================

-- Step 1: Add columns to facade_inspections table
ALTER TABLE "facade_inspections" ADD COLUMN IF NOT EXISTS "available_floors" TEXT[] DEFAULT '{}';
ALTER TABLE "facade_inspections" ADD COLUMN IF NOT EXISTS "available_divisions" TEXT[] DEFAULT '{}';
ALTER TABLE "facade_inspections" ADD COLUMN IF NOT EXISTS "floor_positions" JSONB;
ALTER TABLE "facade_inspections" ADD COLUMN IF NOT EXISTS "division_positions" JSONB;

-- Step 2: Migrate data from first facade_side of each inspection
-- (We take the first side as the source of truth)
UPDATE "facade_inspections" fi
SET
  "available_floors" = fs."available_floors",
  "available_divisions" = fs."available_divisions",
  "floor_positions" = fs."floor_positions",
  "division_positions" = fs."division_positions"
FROM (
  SELECT DISTINCT ON (inspection_id)
    inspection_id,
    available_floors,
    available_divisions,
    floor_positions,
    division_positions
  FROM "facade_sides"
  ORDER BY inspection_id, "order" ASC
) fs
WHERE fi.id = fs.inspection_id
  AND (
    fs.available_floors IS NOT NULL OR
    fs.available_divisions IS NOT NULL OR
    fs.floor_positions IS NOT NULL OR
    fs.division_positions IS NOT NULL
  );

-- Step 3: Drop columns from facade_sides table
ALTER TABLE "facade_sides" DROP COLUMN IF EXISTS "available_floors";
ALTER TABLE "facade_sides" DROP COLUMN IF EXISTS "available_divisions";
ALTER TABLE "facade_sides" DROP COLUMN IF EXISTS "floor_positions";
ALTER TABLE "facade_sides" DROP COLUMN IF EXISTS "division_positions";
