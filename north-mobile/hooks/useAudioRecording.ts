import { useCallback, useEffect, useRef, useState } from 'react';

let ExpoAudio: any = null;
try {
  ExpoAudio = require('expo-av').Audio;
} catch {
  ExpoAudio = null;
}

export interface AudioRecordingState {
  isRecording: boolean;
  durationMs: number;
  error: string | null;
}

export function useAudioRecording() {
  const recordingRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [state, setState] = useState<AudioRecordingState>({
    isRecording: false,
    durationMs: 0,
    error: null,
  });

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (!ExpoAudio) {
      const msg = 'Voice recording is not available in this build.';
      setState({ isRecording: false, durationMs: 0, error: msg });
      throw new Error(msg);
    }

    const permission = await ExpoAudio.requestPermissionsAsync();
    if (permission.status !== 'granted') {
      const msg = 'Microphone permission is required.';
      setState({ isRecording: false, durationMs: 0, error: msg });
      throw new Error(msg);
    }

    await ExpoAudio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const created = await ExpoAudio.Recording.createAsync(
      ExpoAudio.RecordingOptionsPresets.HIGH_QUALITY
    );
    recordingRef.current = created.recording;

    setState({ isRecording: true, durationMs: 0, error: null });
    timerRef.current = setInterval(async () => {
      try {
        const status = await recordingRef.current?.getStatusAsync();
        if (status?.isRecording) {
          setState((prev) => ({ ...prev, durationMs: status.durationMillis ?? prev.durationMs }));
        }
      } catch {
        // Keep recording even if status polling fails.
      }
    }, 300);
  }, []);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    const recording = recordingRef.current;
    if (!recording) return null;

    stopTimer();
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI?.() ?? null;
      recordingRef.current = null;
      setState({ isRecording: false, durationMs: 0, error: null });
      return uri;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to stop recording.';
      setState({ isRecording: false, durationMs: 0, error: msg });
      return null;
    }
  }, [stopTimer]);

  useEffect(() => {
    return () => {
      stopTimer();
      void stopRecording();
    };
  }, [stopRecording, stopTimer]);

  return {
    ...state,
    startRecording,
    stopRecording,
  };
}
