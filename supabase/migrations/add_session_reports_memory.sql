-- Migration: Add Session Reports & Conversation Memory
-- This migration creates the necessary tables and indexes to support automatic session
-- report generation and conversation memory features
-- Validates: Requirements 1.5, 2.6, 3.1-3.7, 5.1, 9.7

-- ============================================================================
-- COACHING SESSIONS TABLE
-- ============================================================================
-- Tracks session boundaries for coaching conversations
CREATE TABLE IF NOT EXISTS coaching_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  message_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('active', 'ended')) DEFAULT 'active',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comments to explain the table and columns
COMMENT ON TABLE coaching_sessions IS 'Tracks coaching session boundaries for report generation';
COMMENT ON COLUMN coaching_sessions.user_id IS 'Reference to the user participating in the session';
COMMENT ON COLUMN coaching_sessions.coach_id IS 'Reference to the AI coach conducting the session';
COMMENT ON COLUMN coaching_sessions.start_time IS 'When the session started';
COMMENT ON COLUMN coaching_sessions.end_time IS 'When the session ended (NULL for active sessions)';
COMMENT ON COLUMN coaching_sessions.message_count IS 'Total number of messages in the session';
COMMENT ON COLUMN coaching_sessions.status IS 'Session status: active or ended';

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_user_status 
  ON coaching_sessions(user_id, status);

CREATE INDEX IF NOT EXISTS idx_coaching_sessions_active 
  ON coaching_sessions(status) 
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_coaching_sessions_user_coach 
  ON coaching_sessions(user_id, coach_id);

CREATE INDEX IF NOT EXISTS idx_coaching_sessions_end_time 
  ON coaching_sessions(end_time) 
  WHERE end_time IS NOT NULL;

-- ============================================================================
-- SESSION REPORTS TABLE
-- ============================================================================
-- Stores generated session reports with insights and action items
CREATE TABLE IF NOT EXISTS session_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES coaching_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  
  -- Report content (JSONB for flexibility and encryption support)
  summary TEXT NOT NULL,
  key_insights JSONB NOT NULL DEFAULT '[]'::jsonb,
  decisions JSONB NOT NULL DEFAULT '[]'::jsonb,
  topics TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  
  -- Metadata
  session_date TIMESTAMPTZ NOT NULL,
  session_duration INTEGER NOT NULL, -- minutes
  message_count INTEGER NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Quality indicators
  confidence TEXT NOT NULL CHECK (confidence IN ('high', 'medium', 'low')) DEFAULT 'medium',
  generation_attempts INTEGER NOT NULL DEFAULT 1,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comments to explain the table and columns
COMMENT ON TABLE session_reports IS 'Stores automatically generated session reports';
COMMENT ON COLUMN session_reports.session_id IS 'Reference to the coaching session';
COMMENT ON COLUMN session_reports.summary IS 'Brief 2-4 sentence summary of the session';
COMMENT ON COLUMN session_reports.key_insights IS 'Array of insight objects with text, category, and importance';
COMMENT ON COLUMN session_reports.decisions IS 'Array of decisions made during the session';
COMMENT ON COLUMN session_reports.topics IS 'Array of main topics/tags discussed';
COMMENT ON COLUMN session_reports.session_duration IS 'Duration of the session in minutes';
COMMENT ON COLUMN session_reports.confidence IS 'AI confidence level in the generated report';
COMMENT ON COLUMN session_reports.generation_attempts IS 'Number of attempts to generate the report';

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_session_reports_user_date 
  ON session_reports(user_id, session_date DESC);

CREATE INDEX IF NOT EXISTS idx_session_reports_coach 
  ON session_reports(coach_id);

CREATE INDEX IF NOT EXISTS idx_session_reports_topics 
  ON session_reports USING GIN(topics);

CREATE INDEX IF NOT EXISTS idx_session_reports_session 
  ON session_reports(session_id);

CREATE INDEX IF NOT EXISTS idx_session_reports_user_coach 
  ON session_reports(user_id, coach_id, session_date DESC);

-- Create full-text search index for insights and decisions
CREATE INDEX IF NOT EXISTS idx_session_reports_insights_search 
  ON session_reports USING GIN(to_tsvector('english', 
    COALESCE(summary, '') || ' ' || 
    COALESCE(key_insights::text, '') || ' ' || 
    COALESCE(decisions::text, '')
  ));

-- ============================================================================
-- ACTION ITEMS TABLE
-- ============================================================================
-- Tracks action items identified in sessions with status management
CREATE TABLE IF NOT EXISTS action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES session_reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  text TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'cancelled')) DEFAULT 'pending',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  linked_action_item_id UUID REFERENCES action_items(id) ON DELETE SET NULL,
  
  -- For full-text search
  text_search tsvector GENERATED ALWAYS AS (to_tsvector('english', text)) STORED
);

-- Add comments to explain the table and columns
COMMENT ON TABLE action_items IS 'Tracks action items from coaching sessions';
COMMENT ON COLUMN action_items.report_id IS 'Reference to the session report where this action item was identified';
COMMENT ON COLUMN action_items.text IS 'Description of the action item';
COMMENT ON COLUMN action_items.status IS 'Current status: pending, completed, or cancelled';
COMMENT ON COLUMN action_items.completed_at IS 'When the action item was marked as completed';
COMMENT ON COLUMN action_items.linked_action_item_id IS 'Reference to a previous action item if discussed again';
COMMENT ON COLUMN action_items.text_search IS 'Full-text search vector for the action item text';

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_action_items_user_status 
  ON action_items(user_id, status);

CREATE INDEX IF NOT EXISTS idx_action_items_report 
  ON action_items(report_id);

CREATE INDEX IF NOT EXISTS idx_action_items_text_search 
  ON action_items USING GIN(text_search);

CREATE INDEX IF NOT EXISTS idx_action_items_user_created 
  ON action_items(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_action_items_pending 
  ON action_items(user_id) 
  WHERE status = 'pending';

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- ============================================================================
-- Create or replace the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for automatic updated_at updates
DROP TRIGGER IF EXISTS update_coaching_sessions_updated_at ON coaching_sessions;
CREATE TRIGGER update_coaching_sessions_updated_at
  BEFORE UPDATE ON coaching_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_session_reports_updated_at ON session_reports;
CREATE TRIGGER update_session_reports_updated_at
  BEFORE UPDATE ON session_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- Enable RLS on all tables
ALTER TABLE coaching_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;

-- Coaching Sessions Policies
-- Users can view their own sessions
CREATE POLICY "Users can view their own coaching sessions"
  ON coaching_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own sessions
CREATE POLICY "Users can create their own coaching sessions"
  ON coaching_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own sessions
CREATE POLICY "Users can update their own coaching sessions"
  ON coaching_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own sessions
CREATE POLICY "Users can delete their own coaching sessions"
  ON coaching_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Session Reports Policies
-- Users can view their own reports
CREATE POLICY "Users can view their own session reports"
  ON session_reports FOR SELECT
  USING (auth.uid() = user_id);

-- System can insert reports (service role)
CREATE POLICY "System can create session reports"
  ON session_reports FOR INSERT
  WITH CHECK (true);

-- Users can update their own reports (for feedback, etc.)
CREATE POLICY "Users can update their own session reports"
  ON session_reports FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own reports
CREATE POLICY "Users can delete their own session reports"
  ON session_reports FOR DELETE
  USING (auth.uid() = user_id);

-- Action Items Policies
-- Users can view their own action items
CREATE POLICY "Users can view their own action items"
  ON action_items FOR SELECT
  USING (auth.uid() = user_id);

-- System can insert action items (service role)
CREATE POLICY "System can create action items"
  ON action_items FOR INSERT
  WITH CHECK (true);

-- Users can update their own action items (status changes)
CREATE POLICY "Users can update their own action items"
  ON action_items FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own action items
CREATE POLICY "Users can delete their own action items"
  ON action_items FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================
-- Function to get recent session reports for context building
CREATE OR REPLACE FUNCTION get_recent_session_reports(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 3
)
RETURNS TABLE (
  id UUID,
  session_date TIMESTAMPTZ,
  summary TEXT,
  key_insights JSONB,
  topics TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sr.id,
    sr.session_date,
    sr.summary,
    sr.key_insights,
    sr.topics
  FROM session_reports sr
  WHERE sr.user_id = p_user_id
  ORDER BY sr.session_date DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get pending action items
CREATE OR REPLACE FUNCTION get_pending_action_items(
  p_user_id UUID
)
RETURNS TABLE (
  id UUID,
  text TEXT,
  created_at TIMESTAMPTZ,
  report_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ai.id,
    ai.text,
    ai.created_at,
    ai.report_id
  FROM action_items ai
  WHERE ai.user_id = p_user_id
    AND ai.status = 'pending'
  ORDER BY ai.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search session reports by keyword
CREATE OR REPLACE FUNCTION search_session_reports(
  p_user_id UUID,
  p_query TEXT,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  session_date TIMESTAMPTZ,
  summary TEXT,
  key_insights JSONB,
  topics TEXT[],
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sr.id,
    sr.session_date,
    sr.summary,
    sr.key_insights,
    sr.topics,
    ts_rank(
      to_tsvector('english', 
        COALESCE(sr.summary, '') || ' ' || 
        COALESCE(sr.key_insights::text, '') || ' ' || 
        COALESCE(sr.decisions::text, '')
      ),
      plainto_tsquery('english', p_query)
    ) as rank
  FROM session_reports sr
  WHERE sr.user_id = p_user_id
    AND to_tsvector('english', 
      COALESCE(sr.summary, '') || ' ' || 
      COALESCE(sr.key_insights::text, '') || ' ' || 
      COALESCE(sr.decisions::text, '')
    ) @@ plainto_tsquery('english', p_query)
  ORDER BY rank DESC, sr.session_date DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION get_recent_session_reports(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_action_items(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION search_session_reports(UUID, TEXT, INTEGER) TO authenticated;
