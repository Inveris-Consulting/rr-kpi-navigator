-- ALLOW ADMIN TO MANAGE KPIS
-- This script updates the RLS policies for the `kpis` table to allow admins to insert, update, and delete KPI definitions.

-- 1. Ensure RLS is enabled on the kpis table
ALTER TABLE public.kpis ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing restrictive policies if any (we keep the SELECT policy)
DROP POLICY IF EXISTS "Admins can insert KPIs" ON public.kpis;
DROP POLICY IF EXISTS "Admins can update KPIs" ON public.kpis;
DROP POLICY IF EXISTS "Admins can delete KPIs" ON public.kpis;

-- 3. Create new permissive policies using public.is_admin()

CREATE POLICY "Admins can insert KPIs" 
  ON public.kpis FOR INSERT 
  WITH CHECK (
    public.is_admin()
  );

CREATE POLICY "Admins can update KPIs" 
  ON public.kpis FOR UPDATE 
  USING (
    public.is_admin()
  );

CREATE POLICY "Admins can delete KPIs" 
  ON public.kpis FOR DELETE 
  USING (
    public.is_admin()
  );
