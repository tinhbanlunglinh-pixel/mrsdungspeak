import { useState, useRef, useCallback, useEffect } from 'react';
import { evaluateSpeech } from '../services/geminiService';
import { EnglishLevel, EvaluationResult } from '../types';

interface UseRecorderReturn {
  isRecording: boolean;
  isEvaluating: boolean;
  evaluation: EvaluationResult | null;
  setEvaluation: (evaluation: EvaluationResult | null) => void;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
}

export function useRecorder(
  readingText: string | null,
  level: EnglishLevel,
  setError: (error: string | null) => void
): UseRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  // Keep refs to always access latest values inside the onstop closure
  const readingTextRef = useRef(readingText);
  const levelRef = useRef(level);
  const setErrorRef = useRef(setError);
  // Save mimeType at recording start so it's available after stop
  const recordingMimeTypeRef = useRef<string>('audio/webm');

  // Keep refs in sync with latest props
  useEffect(() => { readingTextRef.current = readingText; }, [readingText]);
  useEffect(() => { levelRef.current = level; }, [level]);
  useEffect(() => { setErrorRef.current = setError; }, [setError]);

  const handleEvaluate = useCallback(async (audioBlob: Blob, mimeType: string) => {
    // Use refs to get the latest values, avoiding stale closures
    const currentText = readingTextRef.current;
    const currentLevel = levelRef.current;
    const currentSetError = setErrorRef.current;

    if (!currentText) {
      console.error("handleEvaluate: readingText is null, cannot evaluate.");
      return;
    }

    setIsEvaluating(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        try {
          const base64Audio = (reader.result as string).split(',')[1];
          const result = await evaluateSpeech(currentText, base64Audio, currentLevel, mimeType);
          setEvaluation(result);
          setIsEvaluating(false);
        } catch (err: any) {
          console.error("Evaluation error:", err);
          const errorMessage = err?.message || String(err);
          
          if (errorMessage === "QUOTA_EXCEEDED") {
            currentSetError("Bạn đã hết hạn mức sử dụng (Quota) của API Key này. Vui lòng nhấn vào nút 'Cài đặt API Key' để đổi key mới hoặc thử lại sau.");
          } else if (errorMessage === "INVALID_KEY") {
            currentSetError("API Key không hợp lệ. Vui lòng kiểm tra lại cấu hình trong 'Cài đặt API Key'.");
          } else {
            let treatedAsQuota = false;
            try {
              const parsedError = JSON.parse(errorMessage);
              if (parsedError?.error?.code === 429 || parsedError?.status === 429) {
                currentSetError("Bạn đã hết hạn mức sử dụng (Quota) của API Key này. Vui lòng nhấn vào nút 'Cài đặt API Key' để đổi key mới.");
                treatedAsQuota = true;
              }
            } catch (e) { 
              if (errorMessage.includes('"code":429') || errorMessage.includes('"code": 429')) {
                currentSetError("Bạn đã hết hạn mức sử dụng (Quota) của API Key này. Vui lòng nhấn vào nút 'Cài đặt API Key' để đổi key mới.");
                treatedAsQuota = true;
              }
            }

            if (!treatedAsQuota) {
              currentSetError(`Lỗi chấm điểm chi tiết: ${errorMessage}. (Vui lòng copy dòng này và gửi cho Assistant)`);
            }
          }
          setIsEvaluating(false);
        }
      };
      reader.onerror = () => {
        console.error("FileReader error:", reader.error);
        currentSetError("Có lỗi xảy ra khi xử lý audio.");
        setIsEvaluating(false);
      };
    } catch (err: any) {
      console.error("Reader error:", err);
      setErrorRef.current("Có lỗi xảy ra khi xử lý audio.");
      setIsEvaluating(false);
    }
  }, []); // No deps needed — we read everything from refs

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      // Capture the actual mimeType the MediaRecorder is using
      recordingMimeTypeRef.current = mediaRecorder.mimeType || 'audio/webm';

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Use the saved mimeType from when recording started
        const mimeType = recordingMimeTypeRef.current;
        const chunks = audioChunksRef.current;
        if (chunks.length === 0) {
          console.warn("No audio chunks recorded, skipping evaluation.");
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        const audioBlob = new Blob(chunks, { type: mimeType });
        stream.getTracks().forEach(track => track.stop());
        await handleEvaluate(audioBlob, mimeType);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setEvaluation(null);
    } catch (err: any) {
      console.error("Error accessing microphone:", err);
      const isPermissionError = 
        err.name === 'NotAllowedError' || 
        err.name === 'PermissionDeniedError' || 
        (err.message && err.message.toLowerCase().includes('permission denied'));

      if (isPermissionError) {
        setError("Không thể truy cập micro. Bạn vui lòng: \n1. Nhấn 'Cho phép' khi trình duyệt yêu cầu.\n2. Kiểm tra cài đặt quyền truy cập micro của trình duyệt.\n3. Nhấn nút 'Mở trong tab mới' (góc trên bên phải) để ứng dụng hoạt động tốt nhất.");
      } else {
        setError(`Lỗi micro: ${err.message || "Vui lòng kiểm tra lại thiết bị của bạn."}`);
      }
    }
  }, [handleEvaluate, setError]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
        }
      }, 500);
    }
  }, [isRecording]);

  return {
    isRecording,
    isEvaluating,
    evaluation,
    setEvaluation,
    startRecording,
    stopRecording,
  };
}
