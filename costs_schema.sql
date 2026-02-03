-- Tabela de Jobs
create table if not exists public.jobs (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  status text check (status in ('open', 'closed')) default 'open',
  start_date date not null default current_date,
  end_date date,
  created_at timestamptz default now()
);

-- Tabela de Custos Variáveis por Job
create table if not exists public.job_costs (
  id uuid default gen_random_uuid() primary key,
  job_id uuid references public.jobs(id) on delete set null, -- Optional: link to specific job if needed, but requirements say "divided by open jobs" usually implies shared costs, but user said "custo por job" as well. Let's keep it flexible.
  description text not null,
  amount numeric not null,
  cost_date date not null default current_date,
  created_at timestamptz default now()
);

-- Tabela de Salário Hora dos Funcionários
create table if not exists public.employee_hourly_rates (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  hourly_rate numeric not null default 0,
  created_at timestamptz default now(),
  unique(user_id) -- One rate per employee for simplicity, can be historical later if needed
);

-- Tabela de Ajuste de Horas Mensais
create table if not exists public.monthly_employee_hours (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  month_date date not null, -- Always 1st of the month
  hours_worked numeric not null default 173.2, -- 40 * 4.33
  created_at timestamptz default now(),
  unique(user_id, month_date)
);

-- Enable RLS
alter table public.jobs enable row level security;
alter table public.job_costs enable row level security;
alter table public.employee_hourly_rates enable row level security;
alter table public.monthly_employee_hours enable row level security;

-- Policies (Admin Only for now as per requirements "acessível apenas para admin")
create policy "Admins can do everything on jobs" on public.jobs
  for all using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));

create policy "Admins can do everything on job_costs" on public.job_costs
  for all using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));

create policy "Admins can do everything on employee_hourly_rates" on public.employee_hourly_rates
  for all using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));

create policy "Admins can do everything on monthly_employee_hours" on public.monthly_employee_hours
  for all using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));

-- Functions to help with reporting
create or replace function public.get_monthly_cost_breakdown(start_date date, end_date date)
returns table (
  month_date date,
  total_employee_cost numeric,
  total_job_costs numeric,
  open_jobs_count bigint,
  cost_per_job numeric
) language plpgsql security definer as $$
begin
  return query
  with months as (
    select generate_series(date_trunc('month', start_date), date_trunc('month', end_date), '1 month'::interval)::date as m_date
  ),
  emp_costs as (
    select 
      m.m_date,
      sum(
        coalesce(meh.hours_worked, 173.2) * coalesce(ehr.hourly_rate, 0)
      ) as emp_total
    from months m
    cross join public.employee_hourly_rates ehr
    left join public.monthly_employee_hours meh on meh.user_id = ehr.user_id and meh.month_date = m.m_date
    group by m.m_date
  ),
  j_costs as (
    select
      date_trunc('month', cost_date)::date as m_date,
      sum(amount) as job_total
    from public.job_costs
    where cost_date between start_date and end_date
    group by 1
  ),
  job_counts as (
    select
      m.m_date,
      count(*) as open_jobs
    from months m
    left join public.jobs j on j.start_date <= (m.m_date + interval '1 month - 1 day')::date 
      and (j.end_date is null or j.end_date >= m.m_date)
    group by m.m_date
  )
  select
    m.m_date,
    coalesce(ec.emp_total, 0) as total_employee_cost,
    coalesce(jc.job_total, 0) as total_job_costs,
    coalesce(jcnt.open_jobs, 0) as open_jobs_count,
    case 
      when coalesce(jcnt.open_jobs, 0) = 0 then 0
      else round((coalesce(ec.emp_total, 0) + coalesce(jc.job_total, 0)) / jcnt.open_jobs, 2)
    end as cost_per_job
  from months m
  left join emp_costs ec on ec.m_date = m.m_date
  left join j_costs jc on jc.m_date = m.m_date
  left join job_counts jcnt on jcnt.m_date = m.m_date
  order by m.m_date;
end;
$$;
