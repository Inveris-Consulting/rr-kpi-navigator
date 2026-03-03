-- Replace Employee Allocation with Employees Payment
-- This script creates a new table for simplified monthly employee expenses.

CREATE TABLE IF NOT EXISTS public.monthly_employee_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    month_date DATE NOT NULL, -- Stored as the first of the month (e.g. 2026-02-01)
    total_amount NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(month_date)
);

-- Note: We are not deleting the old tables (employee_hourly_rates, monthly_employee_hours, employee_cost_periods) 
-- just in case the client wants to revert, but we will no longer use them in the UI.

-- Enable RLS
ALTER TABLE public.monthly_employee_expenses ENABLE ROW LEVEL SECURITY;

-- Policies (Admin Only)
CREATE POLICY "Admins can do everything on monthly_employee_expenses" 
  ON public.monthly_employee_expenses
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Update the reporting function if it was being used (from costs_schema.sql)
-- We will replace the complex employee logic with just a simple lookup
CREATE OR REPLACE FUNCTION public.get_monthly_cost_breakdown(start_date date, end_date date, selected_client_id uuid DEFAULT NULL)
RETURNS table (
  month_date date,
  total_employee_cost numeric,
  total_job_costs numeric,
  open_jobs_count bigint,
  cost_per_job numeric
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  WITH months AS (
    SELECT generate_series(date_trunc('month', start_date), date_trunc('month', end_date), '1 month'::interval)::date AS m_date
  ),
  -- NEW: Simple lookup from monthly_employee_expenses
  emp_costs AS (
    SELECT 
      m.m_date,
      coalesce(mee.total_amount, 0) AS emp_total
    FROM months m
    LEFT JOIN public.monthly_employee_expenses mee ON date_trunc('month', mee.month_date)::date = m.m_date
  ),
  j_costs AS (
    SELECT
      date_trunc('month', cost_date)::date AS m_date,
      sum(amount) AS job_total
    FROM public.job_costs jc
    LEFT JOIN public.jobs j on jc.job_id = j.id
    WHERE cost_date BETWEEN start_date AND end_date
      AND (selected_client_id IS NULL OR j.client_id = selected_client_id)
    GROUP BY 1
  ),
  job_counts AS (
    SELECT
      m.m_date,
      count(*) AS open_jobs
    FROM months m
    LEFT JOIN public.jobs j ON j.start_date <= (m.m_date + interval '1 month - 1 day')::date 
      AND (j.end_date IS NULL OR j.end_date >= m.m_date)
      AND (selected_client_id IS NULL OR j.client_id = selected_client_id)
    GROUP BY m.m_date
  )
  SELECT
    m.m_date,
    coalesce(ec.emp_total, 0) AS total_employee_cost,
    coalesce(jc.job_total, 0) AS total_job_costs,
    coalesce(jcnt.open_jobs, 0) AS open_jobs_count,
    CASE 
      WHEN coalesce(jcnt.open_jobs, 0) = 0 THEN 0
      ELSE round((coalesce(ec.emp_total, 0) + coalesce(jc.job_total, 0)) / jcnt.open_jobs, 2)
    END AS cost_per_job
  FROM months m
  LEFT JOIN emp_costs ec ON ec.m_date = m.m_date
  LEFT JOIN j_costs jc ON jc.m_date = m.m_date
  LEFT JOIN job_counts jcnt ON jcnt.m_date = m.m_date
  ORDER BY m.m_date;
END;
$$;
