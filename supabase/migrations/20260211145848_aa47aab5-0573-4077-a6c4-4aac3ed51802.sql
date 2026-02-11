
-- Allow anyone to create and read conversations
CREATE POLICY "Anyone can create conversations"
ON public.conversations FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view conversations"
ON public.conversations FOR SELECT
USING (true);

CREATE POLICY "Anyone can update conversations"
ON public.conversations FOR UPDATE
USING (true);

-- Allow anyone to create and read messages
CREATE POLICY "Anyone can create messages"
ON public.messages FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view messages"
ON public.messages FOR SELECT
USING (true);

-- Allow anyone to update personas (for interaction counts etc)
CREATE POLICY "Anyone can update personas"
ON public.personas FOR UPDATE
USING (true);
