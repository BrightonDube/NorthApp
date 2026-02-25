CREATE TABLE IF NOT EXISTS model_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,
  model TEXT NOT NULL,
  input_tokens INT,
  output_tokens INT,
  cost_usd DECIMAL(10, 6),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_model_usage_user_id ON model_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_model_usage_created_at ON model_usage_logs(created_at DESC);
