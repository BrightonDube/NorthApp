-- Migration: Add conversation_insights table for long-term memory
-- Created: 2026-02-24
-- Purpose: Store conversation-level insights for enhanced memory and context
-- Validates: Requirements 2.2 (Long-Term Memory)

-- Create conversation_insights table
CREATE TABLE conversation_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  insight TEXT NOT NULL,
  confidence FLOAT DEFAULT 0.8,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient querying by user and coach
CREATE INDEX idx_insights_user_coach ON conversation_insights(user_id, coach_id);

-- Add comments for documentation
COMMENT ON TABLE conversation_insights IS 'Stores high-level insights extracted from coaching conversations for long-term memory';
COMMENT ON COLUMN conversation_insights.user_id IS 'User who had the conversation';
COMMENT ON COLUMN conversation_insights.coach_id IS 'Coach involved in the conversation';
COMMENT ON COLUMN conversation_insights.session_id IS 'Chat session where the insight was extracted';
COMMENT ON COLUMN conversation_insights.insight IS 'The extracted insight or key takeaway from the conversation';
COMMENT ON COLUMN conversation_insights.confidence IS 'Confidence score of the insight extraction (0.0 to 1.0)';
COMMENT ON COLUMN conversation_insights.created_at IS 'Timestamp when the insight was created';
