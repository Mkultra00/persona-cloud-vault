CREATE POLICY "Anyone can delete meeting rooms"
ON public.meeting_rooms
FOR DELETE
USING (true);