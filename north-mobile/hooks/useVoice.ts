import { useState, useCallback } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import { useSettingsStore } from '@/stores/settingsStore';

interface VoiceState {
  isRecording: boolean;
  isTranscribing: boolean;
  isSynthesizing: boolean;
  transcript: string | null;
  error: string | null;
}

export function useVoice() {
  const [state, setState] = useState<VoiceState>({
    isRecording: false,
    isTranscribing: false,
    isSynthesizing: false,
    transcript: null,
    error: null,
  });

  const voiceEnabled = useSettingsStore(s => s.voiceEnabled);
  const recordingRef = { current: null as Audio.Recording | null };

  const startRecording = useCallback(async () => {
    if (!voiceEnabled) {
      setState(s => ({ ...s, error: 'Voice is a Pro feature. Enable it in Settings.' }));
      return;
    }
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) throw new Error('Microphone permission denied');

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setState(s => ({ ...s, isRecording: true, error: null, transcript: null }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to start recording';
      setState(s => ({ ...s, error: msg }));
    }
  }, []);

  const stopAndTranscribe = useCallback(async (): Promise<string | null> => {
    if (!recordingRef.current) return null;

    setState(s => ({ ...s, isRecording: false, isTranscribing: true }));

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) throw new Error('No recording URI');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) throw new Error('Recording file not found');

      const formData = new FormData();
      formData.append('audio', {
        uri,
        name: 'audio.m4a',
        type: 'audio/m4a',
      } as unknown as Blob);

      const response = await fetch(api.voiceStt, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });

      if (!response.ok) throw new Error(`Transcription failed: ${response.status}`);

      const data = await response.json();
      const text: string = data.text ?? '';
      setState(s => ({ ...s, transcript: text, isTranscribing: false }));
      return text;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Transcription failed';
      setState(s => ({ ...s, error: msg, isTranscribing: false }));
      return null;
    }
  }, []);

  const synthesizeSpeech = useCallback(async (text: string, voice = 'leah'): Promise<void> => {
    if (!voiceEnabled) {
      setState(s => ({ ...s, error: 'Voice is a Pro feature. Enable it in Settings.' }));
      return;
    }
    setState(s => ({ ...s, isSynthesizing: true, error: null }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const response = await fetch(api.voiceTts, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ text, voice }),
      });

      if (!response.ok) throw new Error(`TTS failed: ${response.status}`);

      const blob = await response.blob();
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const { sound } = await Audio.Sound.createAsync({ uri: base64 });
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate(status => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
          setState(s => ({ ...s, isSynthesizing: false }));
        }
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Speech synthesis failed';
      setState(s => ({ ...s, error: msg, isSynthesizing: false }));
    }
  }, []);

  const clearTranscript = useCallback(() => {
    setState(s => ({ ...s, transcript: null, error: null }));
  }, []);

  return {
    ...state,
    startRecording,
    stopAndTranscribe,
    synthesizeSpeech,
    clearTranscript,
  };
}
