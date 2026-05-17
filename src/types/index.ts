import { EvaluationResult, EnglishLevel, VocabularyItem } from '../services/geminiService';

export type { EvaluationResult, EnglishLevel, VocabularyItem };

export type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
export type ContentMode = "generate" | "useInput" | "image";
export type TTSVoice = "Kore" | "Charon" | "Puck";

export interface AppState {
  topic: string;
  level: EnglishLevel;
  apiKey: string;
  showApiKeyModal: boolean;
  imagePreview: string | null;
  aspectRatio: AspectRatio;
  isGenerating: boolean;
  isAudioLoading: boolean;
  generatedImage: string | null;
  generatedPrompt: string | null;
  readingText: string | null;
  translationText: string | null;
  vocabulary: VocabularyItem[];
  showTranslation: boolean;
  generatedTopicName: string | null;
  error: string | null;
  contentMode: ContentMode;
  isDragging: boolean;
  isProcessingFile: boolean;
  isDownloading: boolean;
  isPlaying: boolean;
  audioUrl: string | null;
  // Recording
  isRecording: boolean;
  isEvaluating: boolean;
  evaluation: EvaluationResult | null;
  studentName: string;
  teacherName: string;
  showCertificate: boolean;
}
