-- Rename columns in jobs table to match user requirements
ALTER TABLE public.jobs 
RENAME COLUMN name TO job_title;

ALTER TABLE public.jobs 
RENAME COLUMN start_date TO job_date;

-- Add client_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'client_id') THEN
        ALTER TABLE public.jobs ADD COLUMN client_id uuid;
    END IF;
END $$;

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
