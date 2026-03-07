-- LLM Provider Configuration Table
-- Allows admin to select which LLM provider to use at runtime
-- Supports: 'groq', 'gemini'

CREATE TABLE IF NOT EXISTS llm_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'groq' CHECK (provider IN ('groq', 'gemini', 'xai')),
  model TEXT NOT NULL DEFAULT 'llama-3.3-70b-versatile',
  temperature NUMERIC(3,2) NOT NULL DEFAULT 0.7,
  max_tokens INTEGER NOT NULL DEFAULT 4096,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Ensure only one active config at a time
CREATE UNIQUE INDEX IF NOT EXISTS llm_config_active_idx ON llm_config (is_active) WHERE is_active = true;

-- Insert default config (Groq with llama-3.3-70b)
INSERT INTO llm_config (provider, model, temperature, max_tokens, is_active)
VALUES ('groq', 'llama-3.3-70b-versatile', 0.7, 4096, true)
ON CONFLICT DO NOTHING;

-- RLS: Only authenticated users can read, only admins can update
ALTER TABLE llm_config ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read the active config
CREATE POLICY "Anyone can read active llm config"
  ON llm_config FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Only service role can update (admin via Supabase dashboard or edge functions)
CREATE POLICY "Service role can manage llm config"
  ON llm_config FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
