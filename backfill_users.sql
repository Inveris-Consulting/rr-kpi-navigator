-- Backfill Users
-- Run this if you have existing users in Authentication but they are missing from the public.users table.

insert into public.users (id, name, role, avatar)
select 
  id, 
  coalesce(raw_user_meta_data->>'name', email) as name, 
  coalesce(raw_user_meta_data->>'role', 'user') as role, 
  raw_user_meta_data->>'avatar' as avatar
from auth.users
where id not in (select id from public.users);
