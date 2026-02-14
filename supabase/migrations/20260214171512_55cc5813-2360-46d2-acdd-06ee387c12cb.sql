ALTER TABLE public.meeting_rooms 
ADD COLUMN duration_minutes integer NOT NULL DEFAULT 30,
ADD COLUMN started_at timestamp with time zone DEFAULT NULL;