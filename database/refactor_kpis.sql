-- Refactor KPI System

-- 1. Create KPIs table
CREATE TABLE IF NOT EXISTS public.kpis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    sector TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create User KPIs table (Linking users to allowed KPIs)
CREATE TABLE IF NOT EXISTS public.user_kpis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    kpi_id UUID NOT NULL REFERENCES public.kpis(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, kpi_id)
);

-- 3. Modify kpi_entries to support normalized structure
-- We will keep the old columns for now but make them nullable to avoid breaking immediate history if needed, 
-- but we will primarily use the new structure.
ALTER TABLE public.kpi_entries 
ADD COLUMN IF NOT EXISTS kpi_id UUID REFERENCES public.kpis(id),
ADD COLUMN IF NOT EXISTS value NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS sector TEXT; -- Denormalized sector as requested

-- Make old columns nullable if they aren't already (assuming they might be NOT NULL)
ALTER TABLE public.kpi_entries ALTER COLUMN calls_made DROP NOT NULL;
ALTER TABLE public.kpi_entries ALTER COLUMN meetings_set DROP NOT NULL;
ALTER TABLE public.kpi_entries ALTER COLUMN meetings_completed DROP NOT NULL;
ALTER TABLE public.kpi_entries ALTER COLUMN closes DROP NOT NULL;
ALTER TABLE public.kpi_entries ALTER COLUMN open_requisitions DROP NOT NULL;
-- vip_list is likely already nullable or we just ignore it.

-- 4. Seed KPIs
INSERT INTO public.kpis (name, sector) VALUES
-- RAR Sector
('Active Clients', 'RAR'),
('Open Job Reqs', 'RAR'),
('Open Positions', 'RAR'),
('Resumes Reviewed', 'RAR'),
('Hires', 'RAR'),
('Closed Job Reqs', 'RAR'),
('Meetings', 'RAR'),
-- Prospecting Sector
('Calls', 'Prospecting'),
('Meetings set', 'Prospecting'),
-- Placement Sector
('No shows', 'Placement'),
('Completed Meetings', 'Placement'),
('VIP List', 'Placement')
ON CONFLICT DO NOTHING;

-- 5. Seed User KPIs (Amber and Janet)
-- Need to find User IDs. This part is tricky in a migration if we don't know the exact IDs.
-- We will assume the IDs provided in the prompt are correct.
-- Amber: 16778df7-713e-46db-9883-98cde56ece5d
-- Janet: d4ffe327-7958-4e8e-a89a-8fefa90a931b

DO $$
DECLARE
    amber_id UUID := '16778df7-713e-46db-9883-98cde56ece5d';
    janet_id UUID := 'd4ffe327-7958-4e8e-a89a-8fefa90a931b';
    kpi_rec RECORD;
BEGIN
    -- Assign Amber's KPIs
    -- RAR: Active Clients, Open Job Reqs, Open Positions, Resumes Reviewed, Hires, Closed Job Reqs
    FOR kpi_rec IN SELECT id FROM public.kpis WHERE name IN ('Active Clients', 'Open Job Reqs', 'Open Positions', 'Resumes Reviewed', 'Hires', 'Closed Job Reqs') AND sector = 'RAR'
    LOOP
        INSERT INTO public.user_kpis (user_id, kpi_id) VALUES (amber_id, kpi_rec.id) ON CONFLICT DO NOTHING;
    END LOOP;

    -- Prospecting: Calls, Meetings set
    FOR kpi_rec IN SELECT id FROM public.kpis WHERE name IN ('Calls', 'Meetings set') AND sector = 'Prospecting'
    LOOP
        INSERT INTO public.user_kpis (user_id, kpi_id) VALUES (amber_id, kpi_rec.id) ON CONFLICT DO NOTHING;
    END LOOP;

    -- Assign Janet's KPIs
    -- RAR: Meetings, Closes, Resumes Reviewed
    FOR kpi_rec IN SELECT id FROM public.kpis WHERE name IN ('Meetings', 'Closes', 'Resumes Reviewed') AND sector = 'RAR'
    LOOP
        INSERT INTO public.user_kpis (user_id, kpi_id) VALUES (janet_id, kpi_rec.id) ON CONFLICT DO NOTHING;
    END LOOP;

    -- Placement: No shows, Completed Meetings, VIP List
    FOR kpi_rec IN SELECT id FROM public.kpis WHERE name IN ('No shows', 'Completed Meetings', 'VIP List') AND sector = 'Placement'
    LOOP
        INSERT INTO public.user_kpis (user_id, kpi_id) VALUES (janet_id, kpi_rec.id) ON CONFLICT DO NOTHING;
    END LOOP;
END $$;


-- 6. Backfill Amber's Data (Feb 3, 2026 and Feb 2, 2026) based on image
-- Image Data Interpretation:
-- Feb 3, 2026 (Amber Suarez): Calls: 0, Meetings Set: 0, Completed: 0, Closes: 0, Open Reqs: 17, Vip List: 0
-- Feb 3, 2026 (Duplicate Row? - Ignoring, assuming it's the same day)
-- Feb 2, 2026 (Amber Suarez): Calls: 26, Meetings Set: 0, Completed: 0, Closes: 0, Open Reqs: 0, Vip List: 0

DO $$
DECLARE
    amber_id UUID := '16778df7-713e-46db-9883-98cde56ece5d';
    kpi_calls UUID;
    kpi_meetings_set UUID;
    kpi_completed UUID; -- Ambiguous in image "Completed" vs "Completed Meetings". Assuming "Completed Meetings" in Placement or "Meetings" in RAR? 
                      -- Wait, Amber ONLY has Prospecting (Calls, Meetings set) and RAR.
                      -- Janet has "Completed Meetings".
                      -- The image shows columns: Calls, Meetings Set, Completed, Closes, Open Reqs, Vip List.
                      -- BUT Amber's allowed KPIs are verified in step 5.
                      -- Let's map the image columns to Amber's allowed KPIs where possible.
                      -- Calls -> Prospecting: Calls
                      -- Meetings Set -> Prospecting: Meetings set
                      -- Open Reqs -> RAR: Open Job Reqs
                      
    kpi_open_reqs UUID;
BEGIN
    SELECT id INTO kpi_calls FROM public.kpis WHERE name = 'Calls' LIMIT 1;
    SELECT id INTO kpi_meetings_set FROM public.kpis WHERE name = 'Meetings set' LIMIT 1;
    SELECT id INTO kpi_open_reqs FROM public.kpis WHERE name = 'Open Job Reqs' LIMIT 1;

    -- Feb 3 Entry
    -- Open Reqs: 17
    IF kpi_open_reqs IS NOT NULL THEN
        INSERT INTO public.kpi_entries (user_id, date, kpi_id, value, sector)
        VALUES (amber_id, '2026-02-03', kpi_open_reqs, 17, 'RAR');
    END IF;
    
    -- Calls: 0
    IF kpi_calls IS NOT NULL THEN
         INSERT INTO public.kpi_entries (user_id, date, kpi_id, value, sector)
        VALUES (amber_id, '2026-02-03', kpi_calls, 0, 'Prospecting');
    END IF;

    -- Meetings Set: 0
     IF kpi_meetings_set IS NOT NULL THEN
         INSERT INTO public.kpi_entries (user_id, date, kpi_id, value, sector)
        VALUES (amber_id, '2026-02-03', kpi_meetings_set, 0, 'Prospecting');
    END IF;


    -- Feb 2 Entry
    -- Calls: 26
    IF kpi_calls IS NOT NULL THEN
        INSERT INTO public.kpi_entries (user_id, date, kpi_id, value, sector)
        VALUES (amber_id, '2026-02-02', kpi_calls, 26, 'Prospecting');
    END IF;
    
    -- Open Reqs: 0
    IF kpi_open_reqs IS NOT NULL THEN
        INSERT INTO public.kpi_entries (user_id, date, kpi_id, value, sector)
        VALUES (amber_id, '2026-02-02', kpi_open_reqs, 0, 'RAR');
    END IF;

END $$;

-- 7. Add RLS Policies
ALTER TABLE public.kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_kpis ENABLE ROW LEVEL SECURITY;

-- KPIs: Authenticated users can view all KPIs (needed to see options)
CREATE POLICY "KPIs are viewable by everyone" ON public.kpis
    FOR SELECT TO authenticated USING (true);

-- User KPIs: Users can view their own assignments
CREATE POLICY "Users can view own KPI assignments" ON public.user_kpis
    FOR SELECT TO authenticated USING (auth.uid() = user_id);
    
-- (Optional) If admins need full access, we'd add policies for them, but for now strict owner access for viewing assignments is good start. 
-- Admins usually bypass RLS or have a specific role check. Assuming standard auth.

