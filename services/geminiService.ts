import { ScanResult, AIModelProvider } from "../types";

// Note: The logic has been moved to /api/analyze.js (Server-side)
// This ensures that:
// 1. API Keys are hidden from the client browser.
// 2. Google/Gemini calls originate from the server (Vercel), which can access Google even if the user is in China.

export const analyzeLuggageImage = async (
  base64Image: string, 
  provider: AIModelProvider = 'qwen'
): Promise<ScanResult> => {
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64Image,
        provider: provider
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data;

  } catch (error: any) {
    console.error("AI Service Error:", error);
    
    // Return a friendly fallback error for UI
    return {
      riskLevel: 'MEDIUM',
      funnyMessage: `AI 连接失败 (${provider})。${provider === 'gemini' ? 'Gemini 需通过服务器代理或VPN。' : '请检查网络或切换模型。'}`,
      detectedItems: ["Error"],
      estimatedValue: 0,
      isDaigouSuspect: false
    };
  }
};