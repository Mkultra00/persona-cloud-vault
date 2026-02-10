
-- Create storage bucket for persona portraits
INSERT INTO storage.buckets (id, name, public) VALUES ('portraits', 'portraits', true);

-- Allow public read access
CREATE POLICY "Portrait images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'portraits');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload portraits"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'portraits' AND auth.role() = 'authenticated');

-- Allow authenticated users to update
CREATE POLICY "Authenticated users can update portraits"
ON storage.objects FOR UPDATE
USING (bucket_id = 'portraits' AND auth.role() = 'authenticated');
