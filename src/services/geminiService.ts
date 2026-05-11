import { GoogleGenAI, Modality, Type } from "@google/genai";

const getApiKey = () => {
  // Try to get from localStorage first (for client-managed keys)
  if (typeof window !== "undefined") {
    const localKey = localStorage.getItem("GEMINI_API_KEY");
    if (localKey && localKey.trim() !== "") return localKey.trim();
  }
  
  // Fallback to environment variable
  const envKey = process.env.GEMINI_API_KEY;
  if (!envKey || envKey === "UNDEFINED" || envKey === "MY_GEMINI_API_KEY") {
    console.warn("GEMINI_API_KEY is not set or using placeholder.");
  }
  return envKey || "";
};

// We use a function to get the instance so it can pick up changes in localStorage
const getAI = () => {
  return new GoogleGenAI({ apiKey: getApiKey() });
};

// Model fallback chain per AI_INSTRUCTIONS.md
const TEXT_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
];

const AUDIO_MODEL = "gemini-2.0-flash";

export interface VocabularyItem {
  word: string;
  ipa: string;
  meaning: string;
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
  
  if (errorMsg.includes("429") || errorMsg.toLowerCase().includes("quota") || errorMsg.toLowerCase().includes("resource_exhausted")) {
    throw new Error("QUOTA_EXCEEDED");
  }
  if (errorMsg.includes("403") || errorMsg.toLowerCase().includes("api key") || errorMsg.includes("invalid")) {
    throw new Error("INVALID_KEY");
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
  let lastError: any = null;

  for (const model of models) {
    try {
      console.log(`Trying model: ${model}`);
      const response = await getAI().models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });
      return response;
    } catch (err: any) {
      lastError = err;
      const errorMsg = err?.message || String(err);
      
      // Don't fallback for auth errors — they'll fail on all models
      if (errorMsg.includes("403") || errorMsg.toLowerCase().includes("api key") || errorMsg.includes("invalid")) {
        throw new Error("INVALID_KEY");
      }
      
      // For quota/rate limit errors, try next model
      if (errorMsg.includes("429") || errorMsg.toLowerCase().includes("quota") || errorMsg.toLowerCase().includes("resource_exhausted")) {
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
  const systemInstruction = `You are an expert educational content creator for English learners, strictly following the CEFR (Common European Framework of Reference for Languages) and Cambridge English Qualifications standards (Starters, Movers, Flyers, KET, PET).
  
  Your task is to generate:
  1. An image generation prompt for a children's book illustration (3D Pixar style, high-quality 2D vector, extremely vibrant, bright saturated colors, clean sharp lines, high contrast, cinematic lighting, 8k resolution style, very clear and detailed).
  2. A reading passage in English appropriate for the level: ${level}. 
     ${mode === 'useInput' 
       ? "CRITICAL: If the user provided text, you MUST use the EXACT wording from the source for the 'readingText'. Your priority is to preserve the complete content while identifying and removing non-educational 'noise' such as ISBNs, publisher names, page numbers, and copyright footers that would disrupt the student's reading experience. DO NOT summarize, simplify, or shorten the passage. If the input is from an image, perform high-accuracy OCR to extract the English text verbatim." 
       : "The content MUST be professional, educational, and follow Cambridge curriculum styles. Use clear, descriptive, and engaging language with a tone that sounds like a native English-speaking child or a friendly teacher speaking to a child. The passage should be about the topic and the image. The text MUST be written as a cohesive reading passage or story in standard paragraph format. DO NOT use line breaks after every sentence or format it as a poem/chant unless explicitly requested."
     }
  3. A short, catchy, and exciting title/topic name for this lesson (max 5 words). EVEN IN 'useInput' MODE, you must create a concise title based on the content if the input was long text.
  4. A Vietnamese translation of the reading passage.
  5. A list of 3-5 key vocabulary words from the text with their IPA pronunciation and Vietnamese meaning.
  CRITICAL: Each vocabulary item MUST be extracted fully. DO NOT abbreviate or truncate words or meanings even for long definitions.
  
  Cambridge Level Specifics:
  - Starters (Pre-A1): Focus on nouns, colors, numbers, and simple actions. 20-40 words.
  - Movers (A1): Simple present, present continuous, basic descriptions. 40-60 words.
  - Flyers (A2): Past simple, future with 'going to', comparisons. 60-80 words.
  - A1/A2: Standard CEFR elementary content.
  - B1/B2: More complex structures, opinions, and abstract concepts.
  
  User Information (if provided):
  - Name: ${userName || 'Unknown'}
  - Age: ${userAge || 'Unknown'}
  
  If the name and age are provided, you can optionally incorporate them into the reading passage if it makes sense.
  
  Output the result in JSON format with these keys: "prompt", "readingText", "topicName", "translation", "vocabulary".
  - "prompt": string (English)
  - "readingText": string (English)
  - "topicName": string (English)
  - "translation": string (Vietnamese)
  - "vocabulary": array of objects { "word": string, "ipa": string, "meaning": string }
  
  The "prompt" should be in English, describing a visual scene that complements the text.
  The "readingText" should be the educational passage (either generated or extracted/provided).
  The "topicName" MUST be a short (max 5 words) catchy title for the lesson. If the user's input was a long text, extract/create a title for it.`;

  const parts: any[] = [{ text: `Topic/Content: ${input}\nLevel: ${level}\nMode: ${mode}` }];
  if (imageData) {
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: imageData.split(",")[1],
      },
    });
  }

  const response = await generateWithFallback(TEXT_MODELS, {
    contents: [{ role: "user", parts }],
    config: { 
      systemInstruction,
      responseMimeType: "application/json",
    },
  });

  if (!response.text) {
    throw new Error("Gemini returned an empty response. Please try again.");
  }

  try {
    const result = JSON.parse(response.text);
    return {
      prompt: result.prompt || "",
      readingText: result.readingText || "",
      topicName: result.topicName || (input.length < 50 ? input : "English Lesson"),
      translation: result.translation || "",
      vocabulary: result.vocabulary || []
    };
  } catch (e) {
    console.error("Failed to parse JSON response:", response.text, e);
    throw new Error("Failed to parse lesson content. Please try again.");
  }
};

export const generateImage = async (
  prompt: string,
  aspectRatio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9" = "1:1"
): Promise<string> => {
  // Use Pollinations.ai as a high-quality reliable placeholder for image generation
  const cleanPrompt = encodeURIComponent(prompt.replace(/[^\w\s]/gi, '').substring(0, 300));
  const [widthRatio, heightRatio] = aspectRatio.split(':').map(Number);
  const width = 1024;
  const height = Math.round(width * (heightRatio / widthRatio));
  
  return `https://image.pollinations.ai/prompt/${cleanPrompt}?width=${width}&height=${height}&seed=${Math.floor(Math.random() * 1000000)}&nologo=true&model=flux`;
};

function pcmToWav(base64Pcm: string, sampleRate: number = 24000): string {
  const binaryString = atob(base64Pcm);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const buffer = new ArrayBuffer(44 + bytes.length);
  const view = new DataView(buffer);

  // RIFF identifier
  view.setUint32(0, 0x52494646, false); // "RIFF"
  // file length
  view.setUint32(4, 36 + bytes.length, true);
  // RIFF type
  view.setUint32(8, 0x57415645, false); // "WAVE"
  // format chunk identifier
  view.setUint32(12, 0x666d7420, false); // "fmt "
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw PCM = 1)
  view.setUint16(20, 1, true);
  // channel count (mono = 1)
  view.setUint16(22, 1, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * 2, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  view.setUint32(36, 0x64617461, false); // "data"
  // data chunk length
  view.setUint32(40, bytes.length, true);

  // write PCM data
  const pcmView = new Uint8Array(buffer, 44);
  pcmView.set(bytes);

  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

export const generateAudio = async (text: string, level: EnglishLevel): Promise<string> => {
  // Clean text: remove excessive whitespace and newlines, and truncate to avoid issues on long text
  const cleanedText = text.replace(/\s+/g, ' ').trim().substring(0, 1000);
  
  if (!cleanedText) {
    throw new Error("Text to speak is empty");
  }

  // User requested normal reading speed (1.0) and native child voice
  let speedInstruction = "Read at a normal, natural pace (1.0 speed)";
  if (["Starters", "Movers", "Flyers"].includes(level)) {
    speedInstruction = "Read at a clear, friendly, and natural pace suitable for children (slightly slower if needed but NOT artificial)";
  }

  const systemInstruction = `You are a native English speaker with a warm and clear voice.
Your SOLE task is to read the provided English text exactly as it is written.
${speedInstruction}
Output ONLY the audio data. Do NOT provide any text response, translations, or explanations.`;

  // Add a retry loop for robustness
  let lastError = null;
  // 'Puck' is a youthful/child-like voice.
  const voices = ['Puck', 'Kore', 'Zephyr', 'Fenrir']; 
  
  for (let i = 0; i < 3; i++) {
    try {
      const currentVoice = voices[i % voices.length];
      let response;
      try {
        response = await getAI().models.generateContent({
          model: AUDIO_MODEL,
          contents: [{ role: "user", parts: [{ text: `TEXT TO READ: ${cleanedText}` }] }],
          config: {
            systemInstruction,
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: currentVoice as any },
              },
            },
          },
        });
      } catch (err: any) {
        handleApiError(err);
      }

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        return pcmToWav(base64Audio);
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`Audio generation attempt ${i + 1} failed:`, err);
      
      if (err?.message === "QUOTA_EXCEEDED" || err?.message === "INVALID_KEY") {
        throw err;
      }

      if (i < 2) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  if (lastError) {
    console.error("Gemini TTS Final Failure:", lastError);
  }
  throw lastError || new Error("No audio data returned from Gemini");
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
    stress: number;
    intonation: number;
    fluency: number;
    connectedSpeech: number;
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
  level: EnglishLevel
): Promise<EvaluationResult> => {
  const systemInstruction = `Bạn là một giám khảo chấm phát âm tiếng Anh chuẩn quốc tế (IPA, CEFR) cực kỳ nghiêm túc nhưng cũng rất yêu thương, đóng vai Mrs. Dung.

Bối cảnh: Học sinh đang luyện đọc một đoạn văn cụ thể.
Nhiệm vụ: Nghe audio và đối soát TỪNG TỪ MỘT với Nội dung bài đọc gốc (Original Text).

🚨 ĐIỀU KIỆN TIÊN QUYẾT ĐỂ CÓ ĐIỂM (CRITICAL CONDITION):
Học sinh CHỈ được chấm điểm nếu đạt đủ 2 điều kiện sau:
1. ĐỌC HẾT BÀI (100% Completion): Không được bỏ sót bất kỳ từ nào, kể cả mạo từ (a, an, the) hay giới từ.
2. ĐỌC ĐÚNG NỘI DUNG: Không được tự ý thay đổi từ ngữ trong bài.

BƯỚC 0: KIỂM TRA ĐỘ HOÀN THÀNH VÀ TÍNH CHÍNH XÁC NỘI DUNG (ZERO TOLERANCE)
- Nếu học sinh bỏ sót từ (omission) HOẶC đọc sai quá nhiều từ quan trọng:
  - "isComplete": false.
  - "score": 0 (Bắt buộc phải là 0 nếu thiếu nội dung).
  - "missingContent": Ghi rõ những cụm từ hoặc đoạn mà học sinh đã bỏ sót hoặc đọc sai hoàn toàn.
  - "feedback": Mrs. Dung nhắn nhủ: "Ôi tình yêu của cô, con đã đọc rất cố gắng rồi nhưng bài này con cần đọc ĐỦ và ĐÚNG hết tất cả các chữ thì cô mới chấm điểm được. Con hãy xem phần 'Cần cải thiện' để biết mình thiếu chỗ nào và đọc lại cho cô nghe nhé!"

🚨 NẾU ĐÃ ĐỌC ĐỦ VÀ ĐÚNG 100% NỘI DUNG:
1. Chấm điểm từng tiêu chí (thang 10):
   - Pronunciation Accuracy (IPA chuẩn xác).
   - Word Stress (Trọng âm từ).
   - Intonation (Ngữ điệu lên xuống).
   - Fluency (Tốc độ và sự trôi chảy).
   - Connected Speech (Nối âm, nuốt âm đặc trưng người bản ngữ).

2. Xếp loại:
   - Tổng điểm (Score): Điểm trung bình có trọng số của các tiêu chí trên.
   - Xếp loại CEFR (A1-C2).

3. Phân tích lỗi sai cụ thể (IPA Analysis):
   - Chỉ ra từ phát âm sai, IPA chuẩn vs IPA học sinh thực tế phát âm.
   - Gợi ý cách sửa: Khẩu hình miệng, vị trí lưỡi, cách bật hơi.

PHONG CÁCH PHẢN HỒI (Mrs. Dung):
- Luôn bắt đầu bằng lời chào ấm áp: "Chào con, cô Dung đây!..."
- Phản hồi phải mang tính kiến tạo, chỉ rõ lỗi để bé sửa.

Output định dạng JSON:
{
  "isComplete": boolean,
  "missingContent": string,
  "score": number,
  "cefrLevel": string,
  "criteriaScores": { "pronunciation": number, "stress": number, "intonation": number, "fluency": number, "connectedSpeech": number },
  "feedback": string,
  "ipaAnalysis": [ { "word": string, "correctIpa": string, "studentIpa": string, "tip": string } ],
  "standardSentences": string[],
  "personalizedExercises": string[],
  "strengths": string[],
  "improvements": string[]
}`;

  const response = await generateWithFallback(TEXT_MODELS, {
    contents: [
      {
        role: "user",
        parts: [
          { text: `Original Text: ${originalText}\nTarget Level: ${level}\nAnalyze the audio carefully word by word.` },
          {
            inlineData: {
              mimeType: "audio/wav",
              data: audioData,
            },
          },
        ],
      },
    ],
    config: { 
      systemInstruction,
      responseMimeType: "application/json"
    },
  });

  try {
    const result = JSON.parse(response.text || "{}");
    return {
      isComplete: result.isComplete ?? true,
      missingContent: result.missingContent || "",
      score: result.isComplete === false ? 0 : (result.score || 0),
      cefrLevel: result.cefrLevel || "A1",
      criteriaScores: result.criteriaScores,
      feedback: result.feedback || "Không thể đánh giá.",
      ipaAnalysis: result.ipaAnalysis || [],
      standardSentences: result.standardSentences || [],
      personalizedExercises: result.personalizedExercises || [],
      strengths: result.strengths || [],
      improvements: result.improvements || []
    };
  } catch (err: any) {
    console.error("Speech Evaluation Error:", err);
    const msg = err?.message || String(err);
    if (msg.includes("429") || msg.toLowerCase().includes("quota")) {
      throw new Error("QUOTA_EXCEEDED");
    }
    throw new Error("Failed to evaluate speech. Please try again.");
  }
};
