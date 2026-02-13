-- FIX RLS INFINITE RECURSION
-- This script replaces the recursive RLS policies on 'users' with a safe function approach.

-- 1. Create a SECURITY DEFINER function to check admin status without triggering RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop existing recursive policies on 'users'
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;

-- 3. Re-create policies using the safe function
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.users
  FOR SELECT USING (public.is_admin());

-- 4. Fix 'kpi_entries' policy which also had recursion via the admin check
DROP POLICY IF EXISTS "Users can view own entries or admins view all" ON public.kpi_entries;

CREATE POLICY "Users can view own entries or admins view all" 
  ON public.kpi_entries FOR SELECT 
  USING (
    auth.uid() = user_id 
    OR 
    public.is_admin()
  );
