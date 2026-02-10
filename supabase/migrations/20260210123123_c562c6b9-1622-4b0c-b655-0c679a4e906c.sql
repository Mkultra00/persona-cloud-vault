
ALTER TABLE public.admin_settings
  ADD COLUMN IF NOT EXISTS openai_api_key text DEFAULT '',
  ADD COLUMN IF NOT EXISTS google_api_key text DEFAULT '',
  ADD COLUMN IF NOT EXISTS persona_ai_provider text NOT NULL DEFAULT 'lovable',
  ADD COLUMN IF NOT EXISTS persona_ai_model text NOT NULL DEFAULT 'google/gemini-3-flash-preview';
