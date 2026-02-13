-- Drop legacy columns from kpi_entries table
-- WARNING: Running this script will break the current frontend until it is updated to use the new structure.
-- Ensure you have migrated any necessary data before running this.

ALTER TABLE public.kpi_entries
DROP COLUMN IF EXISTS calls_made,
DROP COLUMN IF EXISTS meetings_set,
DROP COLUMN IF EXISTS meetings_completed,
DROP COLUMN IF EXISTS closes,
DROP COLUMN IF EXISTS open_requisitions,
DROP COLUMN IF EXISTS req_close_rate,
DROP COLUMN IF EXISTS vip_list,
DROP COLUMN IF EXISTS pcl;
