/**
 * API client for the North Python backend (Railway)
 *
 * All AI-heavy endpoints (chat, voice, agents, goals, memories)
 * route to the FastAPI backend instead of Supabase Edge Functions.
 * Direct Supabase calls (auth, context, coaches) remain unchanged.
 */

const API_BASE = process.env.EXPO_PUBLIC_API_URL;

if (!API_BASE && __DEV__) {
  console.warn('[API] EXPO_PUBLIC_API_URL is not set. Backend calls will fail.');
}

export const api = {
  // Chat
  chatStream: `${API_BASE}/v1/chat/stream`,

  // Voice
  voiceStt: `${API_BASE}/v1/chat/voice`,
  voiceTts: `${API_BASE}/v1/chat/voice/response`,

  // Goals
  goals: `${API_BASE}/v1/goals`,
  goal: (id: string) => `${API_BASE}/v1/goals/${id}`,
  goalSubtasks: (goalId: string) => `${API_BASE}/v1/goals/${goalId}/subtasks`,
  subtask: (id: string) => `${API_BASE}/v1/subtasks/${id}`,

  // Memories
  memories: `${API_BASE}/v1/memories`,
  memory: (id: string) => `${API_BASE}/v1/memories/${id}`,

  // Settings
  settings: `${API_BASE}/v1/settings`,

  // Agents
  agentPlan: `${API_BASE}/v1/agent/plan`,
  agentPanic: `${API_BASE}/v1/agent/panic`,
  agentCurate: `${API_BASE}/v1/agent/curate`,

  // Integrations
  calendarAuth: `${API_BASE}/v1/integrations/calendar/auth`,
  calendarEvents: `${API_BASE}/v1/integrations/calendar/events`,
};

/**
 * Build standard auth headers for backend requests.
 * Uses Supabase JWT — no apikey header needed (backend validates via JWT secret).
 */
export function buildAuthHeaders(accessToken: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
}
