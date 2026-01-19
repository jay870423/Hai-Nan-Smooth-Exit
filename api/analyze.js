
// This is a Serverless Function (e.g., Vercel / Next.js API Route)
// It runs on the server, so it can securely access API Keys and bypass Client-side Network restrictions (GFW).

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { image, provider } = req.body;

  if (!image) {
    return res.status(400).json({ error: 'Missing image data' });
  }

  // --- Configuration ---
  const API_KEYS = {
    gemini: process.env.API_KEY,
    qwen: process.env.NEXT_PUBLIC_QWEN_API_KEY,
    deepseek: process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY,
    doubao: process.env.NEXT_PUBLIC_DOUBAO_API_KEY,
    doubaoEndpoint: process.env.NEXT_PUBLIC_DOUBAO_ENDPOINT_ID,
  };

  const SYSTEM_PROMPT = `
  You are a humorous but strict Hainan Customs AI Officer.
  Analyze this luggage photo. Identify duty-free items (cosmetics, electronics, alcohol, luxury bags).
  
  Output a valid JSON object strictly with this structure (NO markdown code blocks, NO extra text):
  {
    "riskLevel": "LOW" | "MEDIUM" | "HIGH",
    "funnyMessage": "A short, witty, slightly roasting comment about their packing in Chinese (Mandarin). If high risk, warn them they look like a Daigou (reseller). If low, praise them.",
    "detectedItems": ["item1", "item2"],
    "estimatedValue": number (in RMB, approximate integer),
    "isDaigouSuspect": boolean
  }
  
  Rules:
  - High risk if: multiple same items (e.g., 5+ same cream), very high value, or looks like commercial stock.
  - "Daigou" means a professional reseller.
  - Be funny like the app "Si Le Me".
  - RETURN ONLY JSON.
  `;

  try {
    let resultText = "{}";

    // --- Provider Logic ---

    if (provider === 'gemini') {
      if (!API_KEYS.gemini) throw new Error("Gemini API Key missing");
      
      // Use standard REST API to avoid dependency issues on serverless if SDK isn't present
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${API_KEYS.gemini}`;
      
      const geminiPayload = {
        contents: [{
          parts: [
            { text: SYSTEM_PROMPT },
            { inline_data: { mime_type: "image/jpeg", data: image } }
          ]
        }]
      };

      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiPayload)
      });

      if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`Gemini API Error: ${err}`);
      }
      
      const data = await resp.json();
      resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    
    } else if (provider === 'qwen' || provider === 'deepseek' || provider === 'doubao') {
      
      let apiUrl = "";
      let apiKey = "";
      let modelName = "";

      if (provider === 'qwen') {
        apiKey = API_KEYS.qwen;
        apiUrl = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
        modelName = "qwen-vl-max";
      } else if (provider === 'deepseek') {
        apiKey = API_KEYS.deepseek;
        apiUrl = "https://api.deepseek.com/chat/completions";
        modelName = "deepseek-chat"; 
      } else if (provider === 'doubao') {
        apiKey = API_KEYS.doubao;
        apiUrl = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";
        modelName = API_KEYS.doubaoEndpoint; // Doubao uses endpoint ID as model
      }

      if (!apiKey) throw new Error(`${provider} API Key missing`);

      const payload = {
        model: modelName,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: SYSTEM_PROMPT },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image}` } }
            ]
          }
        ],
        max_tokens: 1000
      };

      const resp = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`${provider} API Error: ${err}`);
      }

      const data = await resp.json();
      resultText = data.choices?.[0]?.message?.content || "{}";
    }

    // --- Parsing Logic (Shared) ---
    const cleanJson = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
    let parsed;
    try {
      parsed = JSON.parse(cleanJson);
    } catch (e) {
      console.error("JSON Parse Error", resultText);
      // Fallback if AI chats instead of JSON
      parsed = {
        riskLevel: "MEDIUM",
        funnyMessage: "AI 好像喝多了，没返回标准数据，但看起来还行。",
        detectedItems: ["Unknown"],
        estimatedValue: 0,
        isDaigouSuspect: false
      };
    }

    // Return sanitized JSON
    return res.status(200).json({
      riskLevel: parsed.riskLevel || 'MEDIUM',
      funnyMessage: parsed.funnyMessage || "AI 正在思考人生...",
      detectedItems: Array.isArray(parsed.detectedItems) ? parsed.detectedItems : [],
      estimatedValue: typeof parsed.estimatedValue === 'number' ? parsed.estimatedValue : 0,
      isDaigouSuspect: !!parsed.isDaigouSuspect
    });

  } catch (error) {
    console.error("Server Proxy Error:", error);
    return res.status(500).json({ error: error.message });
  }
}