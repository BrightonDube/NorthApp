-- Migration: Add GROW state tracking to chat_sessions
-- Created: 2026-02-24
-- Purpose: Enable GROW coaching framework tracking (Goal, Reality, Options, Way Forward)

-- Add GROW state tracking columns
ALTER TABLE chat_sessions 
ADD COLUMN grow_state TEXT DEFAULT 'goal',
ADD COLUMN grow_data JSONB DEFAULT '{}',
ADD COLUMN grow_updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add constraint to ensure valid GROW states
ALTER TABLE chat_sessions 
ADD CONSTRAINT grow_state_check 
CHECK (grow_state IN ('goal', 'reality', 'options', 'way_forward', 'complete'));

-- Add comment for documentation
COMMENT ON COLUMN chat_sessions.grow_state IS 'Current GROW coaching stage: goal, reality, options, way_forward, or complete';
COMMENT ON COLUMN chat_sessions.grow_data IS 'JSON data storing GROW stage-specific information and insights';
COMMENT ON COLUMN chat_sessions.grow_updated_at IS 'Timestamp of last GROW state update';
