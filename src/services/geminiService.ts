import { GoogleGenAI, Modality, Type } from "@google/genai";

/**
 * Timeout wrapper — rejects if the promise doesn't resolve within `ms` milliseconds.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`TIMEOUT: ${label} — không phản hồi sau ${ms / 1000}s`)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

const REQUEST_TIMEOUT_MS = 30_000; // 30 seconds per model attempt

const getApiKey = () => {
  // Try to get from localStorage first (for client-managed keys)
  if (typeof window !== "undefined") {
    const localKey = localStorage.getItem("GEMINI_API_KEY");
    if (localKey && localKey.trim() !== "") return localKey.trim();
  }
  
  // Fallback to environment variable
  const envKey = process.env.GEMINI_API_KEY;
  if (!envKey || envKey === "UNDEFINED" || envKey === "undefined" || envKey === "MY_GEMINI_API_KEY") {
    console.warn("GEMINI_API_KEY is not set or using placeholder.");
  }
  return envKey || "";
};

// We use a function to get the instance so it can pick up changes in localStorage
const getAI = () => {
  return new GoogleGenAI({
    apiKey: getApiKey(),
    httpOptions: { timeout: REQUEST_TIMEOUT_MS },
  });
};

// Model fallback chain — updated May 2026 (verified from ai.google.dev/gemini-api/docs/models)
// ONLY include models that are currently ACTIVE (not shut down or deprecated)
const TEXT_MODELS = [
  "gemini-2.5-flash",         // Stable, best price-performance, recommended
  "gemini-3.5-flash",         // Stable, newest generation
  "gemini-3-flash-preview",   // Preview, frontier-class
  "gemini-2.5-flash-lite",    // Stable, fastest and most budget-friendly
  // NOTE: gemini-3-pro-preview is SHUT DOWN, gemini-2.0-flash is DEPRECATED — do NOT use
];

const getSelectedModel = (): string => {
  if (typeof window !== "undefined") {
    const localModel = localStorage.getItem("selected_model");
    if (localModel && localModel.trim() !== "") return localModel.trim();
  }
  return "gemini-2.5-flash"; // Default: most stable and reliable model
};

const getFallbackChain = (): string[] => {
  const selected = getSelectedModel();
  // Ensure the selected model is first, and other models follow without duplicates
  const chain = [selected];
  for (const m of TEXT_MODELS) {
    if (m !== selected) {
      chain.push(m);
    }
  }
  return chain;
};

// TTS-specific models (using stable multimodal models supporting audio outputs)
// NOTE: gemini-2.0-flash is deprecated, removed from TTS fallback
const TTS_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
];

export interface VocabularyItem {
  word: string;
  ipa: string;
  meaning: string;
  emoji?: string;
}

export interface ContentGenerationResult {
  prompt: string;
  readingText: string;
  topicName: string;
  translation: string;
  vocabulary: VocabularyItem[];
}

export type EnglishLevel = "Starters" | "Movers" | "Flyers" | "A1" | "A2" | "B1" | "B2";

/**
 * Classifies an API error and throws a standardized error message.
 */
function handleApiError(err: any): never {
  const errorMsg = err?.message || String(err);
  console.error("Gemini API Error:", err);
  
  const lowerMsg = errorMsg.toLowerCase();
  if (lowerMsg.includes("429") || lowerMsg.includes("quota") || lowerMsg.includes("resource_exhausted")) {
    throw new Error(`QUOTA_EXCEEDED: ${errorMsg}`);
  }
  if (
    lowerMsg.includes("403") || 
    lowerMsg.includes("400") || 
    lowerMsg.includes("api key") || 
    lowerMsg.includes("api_key") || 
    lowerMsg.includes("api-key") || 
    lowerMsg.includes("permission denied") ||
    lowerMsg.includes("invalid_key")
  ) {
    throw new Error(`INVALID_KEY: ${errorMsg}`);
  }
  throw err;
}

/**
 * Attempts to call generateContent with model fallback.
 * Tries each model in the fallback chain before giving up.
 */
async function generateWithFallback(
  models: string[],
  params: {
    contents: any[];
    config: any;
  }
): Promise<any> {
  // Validate API key before making any requests
  const currentKey = getApiKey();
  if (!currentKey) {
    throw new Error("INVALID_KEY: API Key chưa được cài đặt. Vui lòng nhập API Key trong phần 'Cài đặt API Key'.");
  }

  const errors: string[] = [];
  let lastError: any = null;

  for (const model of models) {
    try {
      console.log(`Trying model: ${model}`);
      const response = await withTimeout(
        getAI().models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        }),
        REQUEST_TIMEOUT_MS,
        model
      );
      return response;
    } catch (err: any) {
      lastError = err;
      const errorMsg = err?.message || String(err);
      errors.push(`[${model}]: ${errorMsg}`);
      
      const lowerMsg = errorMsg.toLowerCase();
      
      // Don't fallback for auth/bad key errors — they'll fail on all models
      if (
        lowerMsg.includes("403") || 
        lowerMsg.includes("400") || 
        lowerMsg.includes("api key") || 
        lowerMsg.includes("api_key") || 
        lowerMsg.includes("api-key") || 
        lowerMsg.includes("permission denied") ||
        lowerMsg.includes("invalid_key")
      ) {
        throw new Error(`INVALID_KEY: ${errorMsg}`);
      }
      
      // For quota/rate limit errors, try next model first
      if (lowerMsg.includes("429") || lowerMsg.includes("quota") || lowerMsg.includes("resource_exhausted")) {
        console.warn(`Model ${model} hit quota limit, trying next model...`);
        continue;
      }
      
      // For other errors (model not found, etc.), try next model
      console.warn(`Model ${model} failed: ${errorMsg}, trying next model...`);
      continue;
    }
  }

  // All models failed
  if (lastError) {
    // If we have multiple errors, combine them so we know what actually happened to the primary models
    if (errors.length > 0) {
      lastError.message = `All models failed. Details: ${errors.join(" | ")}`;
    }
    handleApiError(lastError);
  }
  throw new Error("All models failed. Please try again later.");
}

export const generateContent = async (
  input: string,
  level: EnglishLevel,
  mode: "generate" | "useInput" = "generate",
  imageData?: string,
  userName?: string,
  userAge?: string
): Promise<ContentGenerationResult> => {
  const useInputInstructions = mode === 'useInput' 
    ? `
  ⚠️ ABSOLUTE RULE FOR 'useInput' MODE — THIS OVERRIDES ALL OTHER RULES:
  - You MUST copy the user's input text EXACTLY into "readingText", word for word, preserving 100% of the original content.
  - DO NOT summarize, simplify, shorten, paraphrase, or rewrite ANY part of the text.
  - DO NOT apply the Cambridge Level word count limits below. The word count limits ONLY apply when mode is 'generate'.
  - The ONLY modifications allowed: remove ISBNs, publisher names, page numbers, copyright footers — pure noise that is not educational content.
  - If the input is from an image, perform high-accuracy OCR to extract ALL English text verbatim.
  - The "readingText" output MUST contain every sentence, every paragraph from the user's input. Missing even one sentence is UNACCEPTABLE.
  - The "translation" must be a Vietnamese translation of the COMPLETE readingText, not a summary.
  ` 
    : '';

  const generateModeInstructions = mode !== 'useInput'
    ? "The content MUST be professional, educational, and follow Cambridge curriculum styles. Use clear, descriptive, and engaging language with a tone that sounds like a native English-speaking child or a friendly teacher speaking to a child. The passage should be about the topic and the image. The text MUST be written as a cohesive reading passage or story in standard paragraph format. DO NOT use line breaks after every sentence or format it as a poem/chant unless explicitly requested."
    : '';

  const systemInstruction = `You are an expert educational content creator for English learners, strictly following the CEFR (Common European Framework of Reference for Languages) and Cambridge English Qualifications standards (Starters, Movers, Flyers, KET, PET).
  ${useInputInstructions}
  Your task is to generate:
  1. An image generation prompt for a stunning educational illustration. Write the prompt as a NATURAL, DETAILED scene description — describe WHAT you want to see, not what to avoid. Example style: "A young girl standing in a lush green park, feeding a tall giraffe, golden afternoon sunlight, crisp details, photorealistic, shot on Canon EOS R5, 4k resolution". NEVER use negative prompts like "no blur", "no distortion" — Imagen 3 does not support them. Focus on: subject, environment, lighting, mood, camera angle, and the keyword "photorealistic, sharp focus, 4k".
  2. A reading passage in English appropriate for the level: ${level}.
     ${mode === 'useInput' 
       ? "USE THE EXACT TEXT FROM THE USER'S INPUT — see the ABSOLUTE RULE above. Do NOT modify, shorten, or summarize it."
       : generateModeInstructions
     }
  3. A short, catchy, and exciting title/topic name for this lesson (max 5 words). EVEN IN 'useInput' MODE, you must create a concise title based on the content if the input was long text.
  4. A Vietnamese translation of the reading passage. ${mode === 'useInput' ? 'Translate the COMPLETE text, not a summary.' : ''}
  5. A list of 3-5 key vocabulary words from the text with their IPA pronunciation and a SHORT, CONCISE Vietnamese meaning.
   CRITICAL VOCABULARY RULES:
   - The "meaning" field MUST be in Vietnamese and MUST be very brief (e.g. "con mèo" instead of a long explanation).
   - Each vocabulary word MUST be UNIQUE — NEVER repeat the same word or its variations (e.g. do NOT list both "dog" and "doggy" or "doggo").
   - Each word MUST actually appear in the reading passage.
   - Pick the most EDUCATIONAL and USEFUL words for the student's level.
   - NEVER generate filler words, nonsense words, or slang variations of the same root word.
  
  CRITICAL WORD COUNT LIMITS FOR READING PASSAGE (ONLY for 'generate' mode, IGNORE for 'useInput' mode):
  You MUST strictly adhere to the following word count limits based on the selected level:
  - Starters (Pre-A1): Exactly 20-40 words. Use simple nouns, colors, numbers, and basic actions.
  - Movers: Exactly 45-60 words. Use simple present, present continuous.
  - Flyers: Exactly 65-85 words. Use past simple, future with 'going to'.
  - A1: Exactly 50-70 words.
  - A2: Exactly 80-110 words.
  - B1: Exactly 150-200 words.
  - B2: Exactly 200-250 words.
  Do not exceed these limits. If you write more words than the limit, the lesson will fail!
  
  User Information (if provided):
  - Name: ${userName || 'Unknown'}
  - Age: ${userAge || 'Unknown'}
  
  If the name and age are provided, you can optionally incorporate them into the reading passage if it makes sense.
  
  Output the result in JSON format with these keys: "prompt", "readingText", "topicName", "translation", "vocabulary".
  - "prompt": string (English) — Must be a detailed, vivid scene description with photography quality keywords.
  - "readingText": string (English) ${mode === 'useInput' ? '— MUST be the EXACT input text, unmodified and complete.' : ''}
  - "topicName": string (English)
  - "translation": string (Vietnamese) ${mode === 'useInput' ? '— MUST translate the complete text.' : ''}
  - "vocabulary": array of objects { "word": string, "ipa": string, "meaning": string, "emoji": string }
  
  The "prompt" should be in English, describing a visual scene that complements the text. Include photography quality terms.
  The "readingText" should be the educational passage (either generated or extracted/provided).
  The "topicName" MUST be a short (max 5 words) catchy title for the lesson. If the user's input was a long text, extract/create a title for it.
  For the "emoji" field in vocabulary, provide a single relevant emoji that perfectly illustrates the word.`;

  const parts: any[] = [{ text: `Topic/Content: ${input}\nLevel: ${level}\nMode: ${mode}` }];
  if (imageData) {
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: imageData.split(",")[1],
      },
    });
  }

  const response = await generateWithFallback(getFallbackChain(), {
    contents: [{ role: "user", parts }],
    config: { 
      systemInstruction,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          prompt: { type: Type.STRING },
          readingText: { type: Type.STRING },
          topicName: { type: Type.STRING },
          translation: { type: Type.STRING },
          vocabulary: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING },
                ipa: { type: Type.STRING },
                meaning: { type: Type.STRING },
                emoji: { type: Type.STRING }
              }
            }
          }
        }
      }
    },
  });

  if (!response.text) {
    throw new Error("Gemini returned an empty response. Please try again.");
  }

  try {
    // Clean the response text from markdown block wrappers if present
    let cleanText = response.text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/, '')
      .replace(/\s*```$/i, '')
      .trim();
    
    // Attempt to parse JSON, with repair for truncated responses
    let result: any;
    try {
      result = JSON.parse(cleanText);
    } catch (parseErr) {
      console.warn("Initial JSON parse failed, attempting repair...", parseErr);
      // Try to repair truncated JSON by closing open structures
      let repaired = cleanText;
      // Remove any trailing incomplete string (e.g. "word": "cat_null_nul...)
      repaired = repaired.replace(/,\s*"[^"]*":\s*"[^"]*$/,'');
      repaired = repaired.replace(/,\s*"[^"]*":\s*$/,'');
      repaired = repaired.replace(/,\s*\{[^}]*$/,''); // remove last incomplete object in array
      // Count and close open brackets/braces
      const opens = (repaired.match(/\[/g) || []).length;
      const closes = (repaired.match(/\]/g) || []).length;
      const openBraces = (repaired.match(/\{/g) || []).length;
      const closeBraces = (repaired.match(/\}/g) || []).length;
      for (let i = 0; i < openBraces - closeBraces; i++) repaired += '}';
      for (let i = 0; i < opens - closes; i++) repaired += ']';
      // Ensure it ends properly
      if (!repaired.endsWith('}')) repaired += '}';
      
      try {
        result = JSON.parse(repaired);
        console.log("JSON repair successful!");
      } catch (repairErr) {
        // Last resort: try to extract fields with regex
        console.warn("JSON repair failed, trying regex extraction...");
        const extractField = (field: string) => {
          const regex = new RegExp(`"${field}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`);
          const match = cleanText.match(regex);
          return match ? match[1].replace(/\\"/g, '"').replace(/\\n/g, '\n') : "";
        };
        result = {
          prompt: extractField("prompt"),
          readingText: extractField("readingText"),
          topicName: extractField("topicName"),
          translation: extractField("translation"),
          vocabulary: []
        };
        if (!result.readingText) {
          throw new Error(`Failed to parse lesson content. Please try again. Parse error: ${(parseErr as any)?.message || String(parseErr)}`);
        }
        console.log("Regex extraction recovered partial data");
      }
    }

    // AI đôi khi vẫn tự cắt ngắn văn bản, nên nếu là văn bản (không phải ảnh), 
    // ta lấy trực tiếp input của user làm readingText.
    let finalReadingText = result.readingText || "";
    if (mode === "useInput" && !imageData && input) {
      finalReadingText = input;
    }

    // Validate and deduplicate vocabulary to prevent AI hallucinations (repeated/nonsensical words)
    const rawVocab: VocabularyItem[] = Array.isArray(result.vocabulary) ? result.vocabulary : [];
    const seenWords = new Set<string>();
    const cleanedVocabulary = rawVocab.filter(item => {
      if (!item || !item.word || typeof item.word !== 'string') return false;
      const normalizedWord = item.word.trim().toLowerCase();
      // Skip empty words, single characters, or already seen words
      if (normalizedWord.length < 2 || seenWords.has(normalizedWord)) return false;
      seenWords.add(normalizedWord);
      return true;
    }).slice(0, 6); // Max 6 vocabulary items

    return {
      prompt: result.prompt || "",
      readingText: finalReadingText,
      topicName: result.topicName || (input.length < 50 ? input : "English Lesson"),
      translation: result.translation || "",
      vocabulary: cleanedVocabulary
    };
  } catch (e: any) {
    console.error("Failed to parse JSON response:", response.text, e);
    throw new Error(`Failed to parse lesson content. Please try again. Raw response: "${(response.text || "").substring(0, 300)}". Parse error: ${e?.message || String(e)}`);
  }
};

export const generateImage = async (
  prompt: string,
  aspectRatio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9" = "1:1"
): Promise<string> => {
  // Prompt tự nhiên — Nano Banana hoạt động tốt nhất với mô tả chi tiết, tích cực
  const imagePrompt = `Generate a photorealistic, highly detailed image with sharp focus and vivid colors: ${prompt}`;

  // Tên model CHÍNH XÁC từ Google Docs (ai.google.dev/gemini-api/docs/image-generation):
  // - gemini-2.5-flash-image: Nano Banana (ổn định)
  // - gemini-3.1-flash-image-preview: Nano Banana 2 (mới nhất)
  // - gemini-3-pro-image-preview: Nano Banana Pro (chất lượng cao nhất)
  const IMAGE_MODELS = [
    'gemini-2.5-flash-image',           // Nano Banana (stable)
    'gemini-3.1-flash-image',           // Nano Banana 2 (stable, newest)
  ];

  for (const model of IMAGE_MODELS) {
    try {
      console.log(`[IMAGE] 🎨 Trying ${model}...`);
      
      // Cách gọi giống CHÍNH XÁC JS example trong official docs:
      // Chỉ cần model + contents (string) — KHÔNG cần config
      const response = await getAI().models.generateContent({
        model,
        contents: imagePrompt,
      });

      // Tìm ảnh trong response parts
      const parts = response?.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.data && part.inlineData?.mimeType?.startsWith('image/')) {
          const imgMime = part.inlineData.mimeType;
          const imgData = typeof part.inlineData.data === 'string' ? part.inlineData.data : String(part.inlineData.data);
          if (imgData.length < 1000) {
            console.warn(`[IMAGE] ⚠️ ${model} ảnh quá nhỏ (${imgData.length}), bỏ qua`);
            continue;
          }
          console.log(`[IMAGE] ✅ ${model} thành công! Format: ${imgMime}, Size: ${imgData.length} bytes`);
          return `data:${imgMime};base64,${imgData}`;
        }
      }
      console.warn(`[IMAGE] ⚠️ ${model} không trả về ảnh trong response`);
    } catch (err: any) {
      const msg = err?.message || String(err);
      console.warn(`[IMAGE] ❌ ${model} thất bại: ${msg.substring(0, 300)}`);
      // Lỗi API key → dừng ngay
      if (msg.includes("403") || msg.toLowerCase().includes("api key") || msg.toLowerCase().includes("permission denied")) {
        console.error("[IMAGE] 🔑 Lỗi API key, dừng tất cả");
        break;
      }
      continue;
    }
  }

  // FALLBACK CUỐI: Pollinations AI (luôn hoạt động, không cần API key)
  console.warn("[IMAGE] ⚠️ Gemini thất bại, dùng Pollinations fallback...");
  const cleanPrompt = encodeURIComponent(prompt.replace(/[#%&{}\\<>*?/$!'":@+`|=]/g, ''));
  const [w, h] = aspectRatio.split(':').map(Number);
  const width = 1024;
  const height = Math.round(width * (h / w));
  return `https://image.pollinations.ai/prompt/${cleanPrompt}?width=${width}&height=${height}&seed=${Math.floor(Math.random() * 1000000)}&nologo=true&model=flux&enhance=true`;
};

// ============================================================
// AUDIO GENERATION - Dual strategy: Gemini AI TTS + Browser TTS fallback
// ============================================================

/**
 * Browser-based TTS using the Web Speech API.
 * This ALWAYS works on any modern browser without network or API key.
 * Returns "BROWSER_TTS" as a special signal to the audio player hook.
 */
export const BROWSER_TTS_SIGNAL = "BROWSER_TTS";

export function speakWithBrowser(text: string, level: EnglishLevel, customRate?: number): void {
  if (!('speechSynthesis' in window)) return;

  // Stop any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';

  // Use customRate if provided, otherwise default to natural normal speed (1.0)
  if (customRate) {
    utterance.rate = customRate;
  } else {
    utterance.rate = 1.0; // Normal native speaking pace for all levels
  }

  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  // Try to find a good English voice
  const voices = window.speechSynthesis.getVoices();
  const englishVoice = voices.find(v => v.lang === 'en-US' && v.name.includes('Google')) 
    || voices.find(v => v.lang === 'en-US') 
    || voices.find(v => v.lang.startsWith('en-'));
  
  if (englishVoice) {
    utterance.voice = englishVoice;
  }

  window.speechSynthesis.speak(utterance);
}

export function stopBrowserTTS(): void {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Helper: Convert PCM base64 chunks to a WAV blob URL.
 */
function pcmChunksToWav(base64Chunks: string[], sampleRate: number = 24000): string {
  const byteChunks = base64Chunks.map(base64 => {
    const cleanBase64 = base64.replace(/^data:.*?;base64,/, '');
    const binaryString = atob(cleanBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  });

  const totalLength = byteChunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const buffer = new ArrayBuffer(44 + totalLength);
  const view = new DataView(buffer);

  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + totalLength, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);    // PCM
  view.setUint16(22, 1, true);    // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, totalLength, true);

  const pcmView = new Uint8Array(buffer, 44);
  let offset = 0;
  for (const chunk of byteChunks) {
    pcmView.set(chunk, offset);
    offset += chunk.length;
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

/**
 * Attempt Gemini AI TTS. Returns a WAV blob URL on success, or throws on failure.
 */
async function geminiTTS(text: string, level: EnglishLevel, voice: string = "Kore"): Promise<string> {
  const cleanedText = text.replace(/\s+/g, ' ').trim();
  
  // Build the prompt requesting natural native English intonation at normal pace
  const prompt = `Read the following text aloud in a natural, native English speaking voice with proper intonation, rhythm, stress patterns, and natural pauses. Speak at a normal conversational pace — not too slow, not too fast. Make it sound like a fluent native speaker reading naturally: ${cleanedText}`;

  // Use ONLY TTS-specific models (gemini-2.0-flash etc. do NOT support audio output with speechConfig)
  for (let i = 0; i < TTS_MODELS.length; i++) {
    const model = TTS_MODELS[i];
    
    try {
      console.log(`[TTS] Trying model: ${model}, voice: ${voice}`);
      
      const response = await withTimeout(
        getAI().models.generateContent({
          model,
          contents: [{ 
            parts: [{ text: prompt }] 
          }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voice as any },
              },
            },
          },
        }),
        REQUEST_TIMEOUT_MS,
        `TTS ${model}`
      );

      // Extract audio data from response
      const candidates = response?.candidates;
      if (!candidates || candidates.length === 0) {
        console.warn(`[TTS] ${model} returned no candidates`);
        continue;
      }
      
      const parts = candidates[0]?.content?.parts || [];
      if (parts.length === 0) {
        console.warn(`[TTS] ${model} returned empty parts array`);
        continue;
      }
      
      for (const p of parts) {
        if (p.inlineData?.data) {
          const audioData = typeof p.inlineData.data === 'string' 
            ? p.inlineData.data 
            : String(p.inlineData.data);
          
          // Validate that audio data is non-empty and substantial
          if (audioData.length < 100) {
            console.warn(`[TTS] ${model} returned suspiciously small audio data (${audioData.length} chars), skipping`);
            continue;
          }
          
          console.log(`[TTS] ✅ Success with ${model}! Audio data length: ${audioData.length}, mimeType: ${p.inlineData.mimeType || 'unknown'}`);
          return pcmChunksToWav([audioData]);
        }
      }
      
      // Log what we got instead of audio
      const partTypes = parts.map((p: any) => p.text ? 'text' : p.inlineData ? 'inlineData' : 'unknown');
      console.warn(`[TTS] ${model} returned no audio data. Part types: [${partTypes.join(', ')}]`);
      
    } catch (err: any) {
      const msg = err?.message || String(err);
      console.warn(`[TTS] ${model} failed: ${msg.substring(0, 200)}`);
      
      const lowerMsg = msg.toLowerCase();
      // Don't retry on auth errors — they'll fail on all models
      if (
        lowerMsg.includes("403") || 
        lowerMsg.includes("400") || 
        lowerMsg.includes("api key") || 
        lowerMsg.includes("api_key") || 
        lowerMsg.includes("api-key") || 
        lowerMsg.includes("permission denied") ||
        lowerMsg.includes("invalid_key")
      ) {
        throw new Error(`INVALID_KEY: ${msg}`);
      }
      // For quota/rate limit, try next model
      if (lowerMsg.includes("429") || lowerMsg.toLowerCase().includes("quota") || lowerMsg.toLowerCase().includes("resource_exhausted")) {
        console.warn(`[TTS] ${model} hit quota/rate limit, trying next model...`);
        continue;
      }
      // For other errors (model not found, bad request, etc.), try next model
      continue;
    }
  }
  
  throw new Error("All Gemini TTS models failed. Models tried: " + TTS_MODELS.join(", "));
}

/**
 * Main audio generation function.
 * Strategy: Try Gemini AI TTS first (best quality), fall back to browser TTS (always works).
 */
export const generateAudio = async (text: string, level: EnglishLevel, voice: string = "Kore"): Promise<string> => {
  const cleanedText = text.replace(/\s+/g, ' ').trim();
  if (!cleanedText) {
    throw new Error("Text to speak is empty");
  }

  // Try Gemini TTS first
  try {
    const url = await geminiTTS(cleanedText, level, voice);
    return url;
  } catch (err: any) {
    console.warn("[TTS] Gemini TTS failed, falling back to browser TTS:", err?.message);
    
    // For quota/key errors, propagate up so UI can show specific message
    if (err?.message?.startsWith("QUOTA_EXCEEDED") || err?.message?.startsWith("INVALID_KEY")) {
      // Still fall back to browser TTS but don't propagate the error
      console.warn("[TTS] Auth/quota error, using browser TTS silently");
    }
  }

  // Fallback: Browser TTS always works
  return BROWSER_TTS_SIGNAL;
};

export interface EvaluationResult {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  cefrLevel?: string;
  isComplete: boolean;
  missingContent?: string;
  criteriaScores?: {
    pronunciation: number;
    fluency: number;
    vocabulary: number;
    grammar: number;
    interaction: number;
  };
  ipaAnalysis?: {
    word: string;
    correctIpa: string;
    studentIpa: string;
    tip: string;
  }[];
  standardSentences?: string[];
  personalizedExercises?: string[];
}

export const evaluateSpeech = async (
  originalText: string,
  audioData: string,
  level: EnglishLevel,
  mimeType: string = "audio/webm"
): Promise<EvaluationResult> => {
  const systemInstruction = `Bạn là Mrs. Dung — giáo viên tiếng Anh giàu kinh nghiệm, chấm phát âm chuẩn quốc tế (IPA, CEFR).

Nhiệm vụ: Nghe audio, đối soát từng từ với Original Text.

🚨 ĐIỀU KIỆN TIÊN QUYẾT:
1. ĐỌC HẾT BÀI (100%): Không bỏ sót từ nào (kể cả a, an, the).
2. ĐỌC ĐÚNG NỘI DUNG: Không tự thay đổi từ.
- Nếu thiếu/sai nhiều → "isComplete": false, "score": 0, ghi rõ "missingContent".

🚨 CHẤM ĐIỂM CEFR (thang 10, mỗi tiêu chí tối đa 2.0):
1. pronunciation: Nguyên âm, phụ âm, âm đuôi, âm nối.
2. fluency: Tốc độ, nhịp điệu, ngắt nghỉ.
3. vocabulary: Nhận diện và đọc đúng từ.
4. grammar: Duy trì ngữ pháp khi đọc (s/es/ed).
5. interaction: Hoàn thành nhiệm vụ, nỗ lực.
Tổng = 5 tiêu chí. Xếp loại CEFR tương ứng.

🚨 QUY TẮC VIẾT NHẬN XÉT — NGẮN GỌN, CHUYÊN NGHIỆP, KHÔNG LẶP LẠI:

📌 "feedback" (BẮT BUỘC — nhận xét tổng quan):
- Bắt đầu: "Chào con, cô Dung đây!"
- Tối đa 2-3 câu ngắn. Nêu đánh giá tổng thể + 1 điểm cần cải thiện quan trọng nhất.
- KHÔNG liệt kê lại ưu điểm hay chi tiết lỗi (đã có ở mục khác).
- Ví dụ tốt: "Chào con, cô Dung đây! Bài đọc của con khá tốt, phát âm rõ ràng và trôi chảy. Con cần chú ý thêm âm cuối /dz/ và nguyên âm dài /ɔː/ nhé!"

📌 "strengths" (tối đa 2-3 mục, mỗi mục 1 câu ngắn ≤15 từ):
- Chỉ nêu điểm mạnh CỤ THỂ, không chung chung.
- Ví dụ tốt: "Phát âm rõ ràng, đặc biệt các phụ âm đầu"
- Ví dụ XẤU (quá dài): "Con đã đọc đủ 100% nội dung bài, không bỏ sót bất kỳ từ nào, kể cả các mạo từ và giới từ nhỏ."

📌 "improvements" (BẮT BUỘC — tối thiểu 1, tối đa 3 mục, mỗi mục ≤15 từ):
- LUÔN LUÔN phải có ít nhất 1 mục. Dù học sinh đọc tốt, vẫn phải có gợi ý cải thiện (ví dụ: ngữ điệu, stress, âm nối, tốc độ...).
- Chỉ nêu điểm CỤ THỂ cần sửa, không giải thích dài.
- Ví dụ tốt: "Kéo dài nguyên âm /ɔː/ trong small, ball"
- Ví dụ tốt khi đọc giỏi: "Luyện thêm ngữ điệu lên-xuống tự nhiên hơn"

📌 "ipaAnalysis" (chỉ liệt kê từ phát âm SAI, tối đa 4 từ):
- "tip": Tối đa 1 câu ngắn gọn, chỉ rõ lỗi và cách sửa.
- Ví dụ tốt: "Kéo dài âm /ɔː/, đọc 'smoool' thay vì 'smol'."
- KHÔNG viết câu dài dòng kiểu động viên trong tip.

📌 "personalizedExercises" (tối đa 2 bài tập, mỗi bài ≤20 từ):
- Bài tập cụ thể, thực hành được ngay.
- Ví dụ tốt: "Đọc to 5 lần: small, ball, tall, walk — kéo dài âm /ɔː/"

📌 "standardSentences" (tối đa 2 câu mẫu ngắn để luyện):
- Câu đơn giản chứa từ cần sửa.

🚨 NGUYÊN TẮC VÀNG: KHÔNG LẶP LẠI thông tin giữa các mục. Mỗi mục phục vụ 1 mục đích riêng:
- feedback = tổng quan ngắn
- strengths = điểm mạnh (bullet)
- improvements = điểm yếu (bullet)
- ipaAnalysis = phân tích IPA chi tiết
- personalizedExercises = bài tập thực hành

Output JSON:
{
  "isComplete": boolean,
  "missingContent": string,
  "score": number,
  "cefrLevel": string,
  "criteriaScores": { "pronunciation": number, "fluency": number, "vocabulary": number, "grammar": number, "interaction": number },
  "feedback": string,
  "ipaAnalysis": [ { "word": string, "correctIpa": string, "studentIpa": string, "tip": string } ],
  "standardSentences": string[],
  "personalizedExercises": string[],
  "strengths": string[],
  "improvements": string[]
}`;

  try {
    const response = await generateWithFallback(getFallbackChain(), {
      contents: [
        {
          role: "user",
          parts: [
            { text: `Original Text: ${originalText}\nTarget Level: ${level}\nAnalyze the audio carefully word by word.` },
            {
              inlineData: {
                mimeType: mimeType,
                data: audioData,
              },
            },
          ],
        },
      ],
      config: { 
        systemInstruction,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isComplete: { type: Type.BOOLEAN },
            missingContent: { type: Type.STRING },
            score: { type: Type.NUMBER },
            cefrLevel: { type: Type.STRING },
            criteriaScores: {
              type: Type.OBJECT,
              properties: {
                pronunciation: { type: Type.NUMBER },
                fluency: { type: Type.NUMBER },
                vocabulary: { type: Type.NUMBER },
                grammar: { type: Type.NUMBER },
                interaction: { type: Type.NUMBER },
              }
            },
            feedback: { type: Type.STRING },
            ipaAnalysis: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING },
                  correctIpa: { type: Type.STRING },
                  studentIpa: { type: Type.STRING },
                  tip: { type: Type.STRING }
                }
              }
            },
            standardSentences: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            personalizedExercises: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            strengths: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            improvements: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      },
    });

    const cleanText = (response.text || "{}")
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/, '')
      .replace(/\s*```$/i, '')
      .trim();
    const result = JSON.parse(cleanText);
    const score = result.isComplete === false ? 0 : (result.score || 0);
    
    // Defensive programming: ensure criteriaScores contains all 5 required CEFR sub-scores
    const rawScores = result.criteriaScores || {};
    const criteriaScores = {
      pronunciation: typeof rawScores.pronunciation === 'number' ? rawScores.pronunciation : (score / 5),
      fluency: typeof rawScores.fluency === 'number' ? rawScores.fluency : (score / 5),
      vocabulary: typeof rawScores.vocabulary === 'number' ? rawScores.vocabulary : (score / 5),
      grammar: typeof rawScores.grammar === 'number' ? rawScores.grammar : (score / 5),
      interaction: typeof rawScores.interaction === 'number' ? rawScores.interaction : (score / 5)
    };

    // Ensure friendly feedback from Mrs. Dung if incomplete or empty
    const defaultFeedback = (result.isComplete === false)
      ? "Chào con, cô Dung đây! Con cần đọc ĐỦ và ĐÚNG hết bài thì cô mới chấm điểm được. Xem phần 'Phần thiếu' và đọc lại nhé!"
      : "Chào con, cô Dung đây! Con đã cố gắng tốt rồi. Tiếp tục luyện đọc mỗi ngày, chú ý âm cuối và ngữ điệu câu nhé! 💚";
    const feedback = (result.feedback && result.feedback.trim() !== "") ? result.feedback : defaultFeedback;

    return {
      isComplete: result.isComplete ?? true,
      missingContent: result.missingContent || "",
      score: score,
      cefrLevel: result.cefrLevel || "A1",
      criteriaScores: criteriaScores,
      feedback: feedback,
      ipaAnalysis: result.ipaAnalysis || [],
      standardSentences: result.standardSentences || [],
      personalizedExercises: result.personalizedExercises || [],
      strengths: result.strengths || [],
      improvements: result.improvements || []
    };
  } catch (err: any) {
    console.error("Speech Evaluation Error:", err);
    const msg = err?.message || String(err);
    if (msg.startsWith("INVALID_KEY") || msg.startsWith("QUOTA_EXCEEDED")) {
      throw err;
    }
    if (msg.includes("429") || msg.toLowerCase().includes("quota")) {
      throw new Error("QUOTA_EXCEEDED");
    }
    throw new Error(`Lỗi đánh giá: ${msg}`);
  }
};
