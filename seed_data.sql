-- Seed Data for KPI Entries
-- Generates random data for the last 3 months (approx 90 days) excluding weekends and major US holidays.

DO $$
DECLARE
  target_user_ids uuid[] := ARRAY[
    '16778df7-713e-46db-9883-98cde56ece5d'::uuid, 
    'd4ffe327-7958-4e8e-a89a-8fefa90a931b'::uuid,
    '25d3bb14-c489-4a47-9753-73404a5ac80b'::uuid
  ];
  user_id uuid;
  date_cursor date;
  start_date date := current_date - interval '3 months';
  end_date date := current_date;
  
  -- Random variables
  v_calls_made integer;
  v_meetings_set integer;
  v_meetings_completed integer;
  v_closes integer;
  v_open_requisitions integer;
  
  -- Holiday checks
  is_holiday boolean;
BEGIN
  -- Loop through each user
  FOREACH user_id IN ARRAY target_user_ids
  LOOP
    -- Loop through each day in the range
    date_cursor := start_date;
    WHILE date_cursor <= end_date LOOP
      
      -- 1. Check if it's a weekend (Saturday=6, Sunday=7 in ISO)
      -- 2. Check for simple static US holidays (approximate for seed data)
      is_holiday := (
        -- New Year's Day
        (extract(month from date_cursor) = 1 and extract(day from date_cursor) = 1) OR
        -- Christmas
        (extract(month from date_cursor) = 12 and extract(day from date_cursor) = 25) OR
        -- Veterans Day
        (extract(month from date_cursor) = 11 and extract(day from date_cursor) = 11) OR
        -- Independence Day
        (extract(month from date_cursor) = 7 and extract(day from date_cursor) = 4)
      );

      IF extract(isodow from date_cursor) < 6 AND NOT is_holiday THEN
        
        -- Generate random plausible data
        -- Calls: 15-45
        v_calls_made := floor(random() * 31 + 15)::int;
        
        -- Meetings Set: 2-10 (approx 10-20% of calls usually, but staying close to original mock)
        v_meetings_set := floor(random() * 9 + 2)::int;
        
        -- Meetings Completed: 50-90% of meetings set
        v_meetings_completed := floor(v_meetings_set * (0.5 + random() * 0.4))::int;
        
        -- Closes: 10-40% of meetings completed
        v_closes := floor(v_meetings_completed * (0.1 + random() * 0.3))::int;
        
        -- Open Requisitions: 5-20
        v_open_requisitions := floor(random() * 16 + 5)::int;

        -- Insert the record
        -- Note: generated columns (req_close_rate, pcl) are auto-calculated
        INSERT INTO public.kpi_entries (
          user_id,
          date,
          calls_made,
          meetings_set,
          meetings_completed,
          closes,
          open_requisitions
        ) VALUES (
          user_id,
          date_cursor,
          v_calls_made,
          v_meetings_set,
          v_meetings_completed,
          v_closes,
          v_open_requisitions
        );
        
      END IF;

      -- Advance date
      date_cursor := date_cursor + 1;
    END LOOP;
  END LOOP;
END $$;
