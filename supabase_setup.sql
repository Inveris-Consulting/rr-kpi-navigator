-- 1. Tabela de Usuários (Profiles)
-- Cria a tabela que estende auth.users
create table public.users (
  id uuid not null references auth.users(id) on delete cascade primary key,
  name text,
  role text default 'user' check (role in ('admin', 'user')),
  avatar text,
  created_at timestamptz default now()
);

-- Habilita RLS
alter table public.users enable row level security;

-- Políticas de Acesso
create policy "Users can view own profile" 
  on public.users for select 
  using (auth.uid() = id);

create policy "Admins can view all profiles" 
  on public.users for select 
  using (
    exists (
      select 1 from public.users 
      where id = auth.uid() and role = 'admin'
    )
  );

-- Trigger para criar perfil automaticamente
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.users (id, name, role, avatar)
  values (
    new.id, 
    coalesce(new.raw_user_meta_data->>'name', 'New User'),
    coalesce(new.raw_user_meta_data->>'role', 'user'),
    new.raw_user_meta_data->>'avatar'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. Tabela de KPIs
create table public.kpi_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  date date not null,
  calls_made integer default 0,
  meetings_set integer default 0,
  meetings_completed integer default 0,
  closes integer default 0,
  open_requisitions integer default 0,
  
  -- Colunas calculadas (Generated Columns)
  -- Evita inconsistência de dados calculando diretamente no banco
  req_close_rate numeric generated always as (
    case when open_requisitions = 0 then 0 
    else round((closes::numeric / open_requisitions) * 100, 1) 
    end
  ) stored,
  
  pcl numeric generated always as (
    case when calls_made = 0 then 0 
    else round((closes::numeric / calls_made) * 100, 2) 
    end
  ) stored,
  
  created_at timestamptz default now()
);

-- Habilita RLS
alter table public.kpi_entries enable row level security;

-- Políticas de Acesso
create policy "Users can view own entries or admins view all" 
  on public.kpi_entries for select 
  using (
    auth.uid() = user_id 
    or 
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

create policy "Users can insert own entries" 
  on public.kpi_entries for insert 
  with check (auth.uid() = user_id);

create policy "Users can update own entries" 
  on public.kpi_entries for update 
  using (auth.uid() = user_id);

create policy "Users can delete own entries" 
  on public.kpi_entries for delete 
  using (auth.uid() = user_id);
