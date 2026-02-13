-- ALLOW ADMIN TO EDIT AND DELETE KPI ENTRIES
-- This script updates the RLS policies for kpi_entries to allow admins to update and delete any entry.

-- 1. Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can update own entries" ON public.kpi_entries;
DROP POLICY IF EXISTS "Users can delete own entries" ON public.kpi_entries;

-- 2. Create new permissive policies using public.is_admin()

CREATE POLICY "Users can update own entries or admins update all" 
  ON public.kpi_entries FOR UPDATE 
  USING (
    auth.uid() = user_id 
    OR 
    public.is_admin()
  );

CREATE POLICY "Users can delete own entries or admins delete all" 
  ON public.kpi_entries FOR DELETE 
  USING (
    auth.uid() = user_id 
    OR 
    public.is_admin()
  );

-- Note: INSERT policy usually doesn't need to change if admins validly insert for themselves, 
-- but if admins need to insert FOR others, we might need to check that too.
-- For now, the requirement is Edit/Delete.
