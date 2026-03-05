-- Migration: Ensure conversation_insights table exists (idempotent)
-- Purpose: Fix missing table in deployed environments where chat insights queries return PGRST205
-- Safety: Uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS to avoid damaging existing schema/data

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.conversation_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  coach_id UUID REFERENCES public.coaches(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  insight TEXT NOT NULL,
  confidence DOUBLE PRECISION DEFAULT 0.8,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Backfill missing columns if table already exists but is incomplete
ALTER TABLE public.conversation_insights
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES public.coaches(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS insight TEXT,
  ADD COLUMN IF NOT EXISTS confidence DOUBLE PRECISION DEFAULT 0.8,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_insights_user_coach
  ON public.conversation_insights(user_id, coach_id);

CREATE INDEX IF NOT EXISTS idx_insights_user_created_at
  ON public.conversation_insights(user_id, created_at DESC);

COMMENT ON TABLE public.conversation_insights IS
  'Stores high-level insights extracted from coaching conversations for long-term memory';
