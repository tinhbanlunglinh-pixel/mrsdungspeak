import { GoogleGenAI } from "@google/genai";

const getAI = () => {
  return new GoogleGenAI({ apiKey: "AIzaSyFakeKey1234567890" });
};

async function test() {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: "Hello!" }] }],
    });
    console.log("Success:", response.text);
  } catch (err: any) {
    console.error("Error message:", err.message);
    console.error("Error full:", err);
  }
}

test();
