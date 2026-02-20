-- ============================================================================
-- Migration: Add memories, goals, subtasks, user_xp, pgvector
-- Phase 1-5 of North AI Backend Migration
-- ============================================================================

-- Enable pgvector extension for semantic memory search
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- Phase 1: Memory System
-- ============================================================================

CREATE TABLE IF NOT EXISTS memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'fact' CHECK (category IN (
        'fact', 'preference', 'relationship', 'achievement',
        'struggle', 'decision', 'value', 'goal_update'
    )),
    embedding vector(1536),
    source_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    importance TEXT NOT NULL DEFAULT 'medium' CHECK (importance IN ('high', 'medium', 'low')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS memories_user_idx ON memories(user_id);
CREATE INDEX IF NOT EXISTS memories_importance_idx ON memories(user_id, importance);
CREATE INDEX IF NOT EXISTS memories_embedding_idx ON memories
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Add firmness_level to profiles (0=gentle, 5=balanced, 10=tough-love)
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS firmness_level INTEGER NOT NULL DEFAULT 5
    CHECK (firmness_level >= 0 AND firmness_level <= 10);

-- Add Google Calendar tokens to profiles
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS google_calendar_tokens JSONB;

-- RLS for memories
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own memories"
    ON memories FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- pgvector similarity search function
CREATE OR REPLACE FUNCTION match_memories(
    query_embedding vector(1536),
    match_user_id UUID,
    match_count INT DEFAULT 5,
    match_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    category TEXT,
    importance TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.id,
        m.content,
        m.category,
        m.importance,
        1 - (m.embedding <=> query_embedding) AS similarity
    FROM memories m
    WHERE
        m.user_id = match_user_id
        AND m.embedding IS NOT NULL
        AND 1 - (m.embedding <=> query_embedding) > match_threshold
    ORDER BY m.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ============================================================================
-- Phase 2: Goals System
-- ============================================================================

CREATE TABLE IF NOT EXISTS goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'personal',
    deadline TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'abandoned')),
    difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard', 'epic')),
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    coach_id UUID REFERENCES coaches(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS goals_user_idx ON goals(user_id);
CREATE INDEX IF NOT EXISTS goals_status_idx ON goals(user_id, status);

CREATE TABLE IF NOT EXISTS subtasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked')),
    order_index INTEGER NOT NULL DEFAULT 0,
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS subtasks_goal_idx ON subtasks(goal_id);
CREATE INDEX IF NOT EXISTS subtasks_user_idx ON subtasks(user_id);

-- Auto-update goals.updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER goals_updated_at
    BEFORE UPDATE ON goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS for goals
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own goals"
    ON goals FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RLS for subtasks
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own subtasks"
    ON subtasks FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- Phase 5: Gamification (XP + Levels + Streaks)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_xp (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    total_xp INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS xp_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'task_complete', 'check_in', 'goal_complete', 'streak_bonus',
        'first_message', 'session_report'
    )),
    xp_amount INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS xp_events_user_idx ON xp_events(user_id);
CREATE INDEX IF NOT EXISTS xp_events_type_idx ON xp_events(user_id, event_type);

-- RLS for XP tables
ALTER TABLE user_xp ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own xp"
    ON user_xp FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view own xp events"
    ON xp_events FOR SELECT
    USING (auth.uid() = user_id);

-- Service role can write XP (backend uses service key)
CREATE POLICY "Service role can manage xp"
    ON user_xp FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage xp events"
    ON xp_events FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================
-- Helper: Get inactive users (no messages in last N hours)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_inactive_users(hours_threshold INT DEFAULT 24)
RETURNS TABLE (user_id UUID)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT p.id AS user_id
    FROM profiles p
    WHERE p.id NOT IN (
        SELECT DISTINCT m.user_id
        FROM (
            SELECT cs.user_id, msg.created_at
            FROM messages msg
            JOIN chat_sessions cs ON cs.id = msg.chat_session_id
            WHERE msg.created_at > now() - (hours_threshold || ' hours')::INTERVAL
        ) m
    )
    -- Only users who have chatted at least once (not brand new)
    AND p.id IN (
        SELECT DISTINCT cs.user_id FROM chat_sessions cs
    );
END;
$$;
