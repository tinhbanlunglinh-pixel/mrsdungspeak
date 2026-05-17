import { GoogleGenAI, Type } from "@google/genai";

const getAI = () => {
  return new GoogleGenAI({ apiKey: "AIzaSyFakeKey1234567890" });
};

async function test() {
  console.log("Starting test...");
  try {
    const ai = getAI();
    console.log("Calling generateContent...");
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: "Hello!" }] }],
      config: {
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
      }
    });
    console.log("Success:", response.text);
  } catch (err: any) {
    console.error("Error message:", err.message);
  }
}

test();
