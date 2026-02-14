
-- Room Personas: imported personas for meeting rooms
CREATE TABLE public.room_personas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity jsonb NOT NULL DEFAULT '{}'::jsonb,
  psychology jsonb NOT NULL DEFAULT '{}'::jsonb,
  backstory jsonb NOT NULL DEFAULT '{}'::jsonb,
  memory jsonb NOT NULL DEFAULT '{"evolutionLog": [], "workingMemory": [], "episodicMemory": [], "learnedPreferences": []}'::jsonb,
  portrait_url text,
  source_export jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.room_personas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view room personas" ON public.room_personas FOR SELECT USING (true);
CREATE POLICY "Admins can manage room personas" ON public.room_personas FOR ALL USING (public.is_admin());
CREATE POLICY "Anyone can insert room personas" ON public.room_personas FOR INSERT WITH CHECK (true);

-- Meeting Rooms
CREATE TABLE public.meeting_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  scenario text NOT NULL DEFAULT '',
  purpose text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  user_role text NOT NULL DEFAULT 'observer',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);

ALTER TABLE public.meeting_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view meeting rooms" ON public.meeting_rooms FOR SELECT USING (true);
CREATE POLICY "Anyone can create meeting rooms" ON public.meeting_rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update meeting rooms" ON public.meeting_rooms FOR UPDATE USING (true);
CREATE POLICY "Admins can manage meeting rooms" ON public.meeting_rooms FOR ALL USING (public.is_admin());

-- Room Participants: join table
CREATE TABLE public.room_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.meeting_rooms(id) ON DELETE CASCADE,
  persona_id uuid NOT NULL REFERENCES public.room_personas(id) ON DELETE CASCADE,
  admitted_at timestamptz NOT NULL DEFAULT now(),
  removed_at timestamptz
);

ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view room participants" ON public.room_participants FOR SELECT USING (true);
CREATE POLICY "Anyone can insert room participants" ON public.room_participants FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update room participants" ON public.room_participants FOR UPDATE USING (true);
CREATE POLICY "Admins can manage room participants" ON public.room_participants FOR ALL USING (public.is_admin());

-- Room Messages
CREATE TABLE public.room_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.meeting_rooms(id) ON DELETE CASCADE,
  persona_id uuid REFERENCES public.room_personas(id) ON DELETE SET NULL,
  role text NOT NULL DEFAULT 'persona',
  content text NOT NULL DEFAULT '',
  inner_thought text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view room messages" ON public.room_messages FOR SELECT USING (true);
CREATE POLICY "Anyone can insert room messages" ON public.room_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage room messages" ON public.room_messages FOR ALL USING (public.is_admin());

-- Enable realtime for room_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages;
