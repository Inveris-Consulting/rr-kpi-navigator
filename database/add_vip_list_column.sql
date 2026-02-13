-- ADD VIP LIST COLUMN
-- Adds the vip_list column to kpi_entries table to replace PCL metric.

ALTER TABLE public.kpi_entries 
ADD COLUMN vip_list integer DEFAULT 0;

-- Optional: If you want to drop the stored PCL column (or keep it for legacy data)
-- ALTER TABLE public.kpi_entries DROP COLUMN pcl;
