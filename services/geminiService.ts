
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generateRefTips(category: string) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate 3 short, professional refereeing tips for a ${category} level basketball official in Azerbaijan. Keep it concise and encouraging.`,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text || "Focus on consistent whistle blowing and signal clarity.";
  } catch (error) {
    console.error("AI Error:", error);
    return "Keep focusing on positioning and clear communication with the crew.";
  }
}

export async function summarizeReports(reportsCount: number, avgScore: number) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Write a 2-sentence performance summary for a basketball referee who has completed ${reportsCount} matches with an average feedback score of ${avgScore}%.`,
    });
    return response.text || "Your consistency in game management is highly valued by the league committee.";
  } catch (error) {
    return "Your consistency in game management is highly valued by the league committee.";
  }
}

export async function generateRefereeLogo() {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [
        {
          text: "A professional circular logo for 'Azerbaijan Basketball Referees'. The logo should feature a basketball and a referee whistle. Use a color palette of deep burgundy (#581c1c) and basketball orange (#f39200). The text 'Azərbaycan Basketbol Hakimləri' should be incorporated into the circular border in a clean, modern sans-serif font. High-end sports branding style, minimalist and bold."
        }
      ],
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Image generation error:", error);
    return null;
  }
}
