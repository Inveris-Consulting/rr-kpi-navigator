-- BACKFILL VIP LIST
-- Updates existing rows with random vip_list values between 0 and 5

UPDATE public.kpi_entries
SET vip_list = floor(random() * 6)::int;
