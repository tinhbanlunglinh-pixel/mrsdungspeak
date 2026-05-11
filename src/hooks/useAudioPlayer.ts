import React, { useState, useRef, useEffect, useCallback } from 'react';
import { generateAudio } from '../services/geminiService';
import { EnglishLevel } from '../types';

interface UseAudioPlayerReturn {
  isPlaying: boolean;
  isAudioLoading: boolean;
  audioUrl: string | null;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  setIsPlaying: (playing: boolean) => void;
  setIsAudioLoading: (loading: boolean) => void;
  setAudioUrl: (url: string | null) => void;
  handlePlayAudio: () => Promise<void>;
  cleanup: () => void;
}

export function useAudioPlayer(
  readingText: string | null,
  level: EnglishLevel,
  setError: (error: string | null) => void
): UseAudioPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousAudioUrlRef = useRef<string | null>(null);

  // Revoke previous audio URL to prevent memory leaks
  const setAudioUrlSafe = useCallback((url: string | null) => {
    if (previousAudioUrlRef.current && previousAudioUrlRef.current !== url) {
      URL.revokeObjectURL(previousAudioUrlRef.current);
    }
    previousAudioUrlRef.current = url;
    setAudioUrl(url);
  }, []);

  // Handle auto-play when audioUrl is first generated
  useEffect(() => {
    if (audioUrl && audioRef.current && isPlaying) {
      const audio = audioRef.current;
      audio.load();
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.error("Auto-play error:", err);
          setIsPlaying(false);
        });
      }
    }
  }, [audioUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previousAudioUrlRef.current) {
        URL.revokeObjectURL(previousAudioUrlRef.current);
      }
    };
  }, []);

  const handlePlayAudio = async () => {
    if (!readingText) return;
    
    if (audioUrl && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().catch(err => {
          console.error("Playback error:", err);
          setIsPlaying(false);
        });
        setIsPlaying(true);
      }
      return;
    }

    if (isAudioLoading) return;

    setIsPlaying(true);
    setIsAudioLoading(true);
    try {
      const url = await generateAudio(readingText, level);
      setAudioUrlSafe(url);
    } catch (err) {
      console.error("Failed to generate audio", err);
      setError("Không thể tạo âm thanh. Vui lòng thử lại.");
      setIsPlaying(false);
    } finally {
      setIsAudioLoading(false);
    }
  };

  const cleanup = () => {
    if (previousAudioUrlRef.current) {
      URL.revokeObjectURL(previousAudioUrlRef.current);
      previousAudioUrlRef.current = null;
    }
    setAudioUrl(null);
    setIsPlaying(false);
  };

  return {
    isPlaying,
    isAudioLoading,
    audioUrl,
    audioRef,
    setIsPlaying,
    setIsAudioLoading,
    setAudioUrl: setAudioUrlSafe,
    handlePlayAudio,
    cleanup,
  };
}
