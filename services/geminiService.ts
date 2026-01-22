import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("Gemini API Key is missing. AI features will be disabled.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const summarizeText = async (text: string): Promise<string> => {
  const client = getClient();
  if (!client) return "AI service unavailable. Check API Key.";

  try {
    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Summarize the following text concisely for a shared clipboard preview:\n\n${text}`,
    });
    return response.text || "Could not generate summary.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error generating summary.";
  }
};

export const formatText = async (text: string, style: 'professional' | 'casual' | 'code'): Promise<string> => {
  const client = getClient();
  if (!client) return text;

  try {
    const promptMap = {
      professional: "Rewrite the following text to sound more professional and formal.",
      casual: "Rewrite the following text to sound casual and friendly.",
      code: "Format the following text as a clean code block or explain the code snippet if present."
    };

    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `${promptMap[style]}:\n\n${text}`,
    });
    return response.text || text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return text;
  }
};
