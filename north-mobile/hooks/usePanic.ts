import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';

interface PanicState {
  isActive: boolean;
  response: string;
  isStreaming: boolean;
  error: string | null;
}

export function usePanic() {
  const [state, setState] = useState<PanicState>({
    isActive: false,
    response: '',
    isStreaming: false,
    error: null,
  });

  const abortRef = useRef<AbortController | null>(null);

  const triggerPanic = useCallback(async (initialMessage?: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setState(s => ({ ...s, error: 'Not authenticated' }));
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setState({ isActive: true, response: '', isStreaming: true, error: null });

    try {
      const response = await fetch(api.agentPanic, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ initial_message: initialMessage ?? null }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) throw new Error(`Panic agent error: ${response.status}`);
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.type === 'token') {
              setState(s => ({ ...s, response: s.response + parsed.data }));
            } else if (parsed.type === 'done') {
              setState(s => ({ ...s, isStreaming: false }));
            }
          } catch {
            // skip malformed lines
          }
        }
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return;
      const msg = e instanceof Error ? e.message : 'Panic agent failed';
      setState(s => ({ ...s, error: msg, isStreaming: false }));
    }
  }, []);

  const dismiss = useCallback(() => {
    abortRef.current?.abort();
    setState({ isActive: false, response: '', isStreaming: false, error: null });
  }, []);

  return { ...state, triggerPanic, dismiss };
}
