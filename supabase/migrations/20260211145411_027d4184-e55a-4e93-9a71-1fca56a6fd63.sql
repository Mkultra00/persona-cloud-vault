
-- Allow everyone to read personas
CREATE POLICY "Anyone can view personas"
ON public.personas
FOR SELECT
USING (true);
