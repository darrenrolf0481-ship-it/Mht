import { GoogleGenAI } from "@google/genai";

export type ModelProvider = "google" | "grok" | "ollama";

export interface OllamaModel {
  name: string;
  model: string;
}

export async function fetchOllamaModels(): Promise<OllamaModel[]> {
  try {
    const response = await fetch("http://localhost:11434/api/tags");
    if (!response.ok) throw new Error("Failed to fetch Ollama models");
    const data = await response.json();
    return data.models || [];
  } catch (error) {
    console.error("Ollama fetch error:", error);
    return [];
  }
}

export async function pullOllamaModel(
  name: string,
  onProgress: (status: string, completed?: number, total?: number) => void
): Promise<void> {
  const response = await fetch("http://localhost:11434/api/pull", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name })
  });

  if (!response.ok) {
    throw new Error(`Failed to pull model: ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("Failed to read response stream");

  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n').filter(line => line.trim());

    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        onProgress(data.status, data.completed, data.total);
        if (data.status === 'success') {
          return;
        }
      } catch (e) {
        console.error('Error parsing pull progress:', e);
      }
    }
  }
}

export async function translateText(
  text: string,
  provider: ModelProvider,
  modelName: string,
  apiKey?: string
): Promise<string> {
  const systemPrompt = "You are a professional translator. Translate the following HTML or text into English. Preserve the HTML structure if it is HTML. Only return the translated content, no conversational filler.";

  if (provider === "google") {
    const key = apiKey || import.meta.env.VITE_GEMINI_API_KEY || (import.meta as any).env?.GEMINI_API_KEY;
    if (!key) throw new Error("Google Gemini API key is missing");
    
    const ai = new GoogleGenAI({ apiKey: key });
    const response = await ai.models.generateContent({
      model: modelName || "gemini-3-flash-preview",
      contents: text,
      config: {
        systemInstruction: systemPrompt,
      }
    });
    return response.text || "";
  } 
  
  if (provider === "grok") {
    if (!apiKey) throw new Error("Grok API key is required");
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelName || "grok-2-latest",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ]
      })
    });
    
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Grok API error: ${err}`);
    }
    
    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  }
  
  if (provider === "ollama") {
    const response = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ],
        stream: false
      })
    });
    
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Ollama API error: ${err}`);
    }
    
    const data = await response.json();
    return data.message?.content || "";
  }

  throw new Error("Unknown provider");
}
