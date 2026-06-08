export type ModelProvider = "ollama" | "grok";

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

export async function interactWithAI(
  text: string,
  prompt: string,
  provider: ModelProvider,
  modelName: string,
  apiKey?: string
): Promise<string> {
  const systemPrompt = `You are a helpful assistant. Below is the content of a file. Use it to answer the user's specific query. Be precise and only extract what is relevant.
  
  FILE CONTENT:
  ${text}`;

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
          { role: "user", content: prompt }
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
          { role: "user", content: prompt }
        ],
        stream: false
      })
    });
    
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Ollama error: ${err}`);
    }
    
    const data = await response.json();
    return data.message?.content || "";
  }

  throw new Error("Unsupported provider");
}

export async function translateText(
  text: string,
  provider: ModelProvider,
  modelName: string,
  apiKey?: string,
  context?: string
): Promise<string> {
  const systemPrompt = `You are a professional translator. Translate the following text into English. If the input is a JSON object (like Route A JSON format), PRESERVE the exact JSON structure, keys, arrays, and formatting, and ONLY translate the raw textual content found within. Do NOT translate system keys, UUIDs, code, or boolean values. Only return the translated content, no conversational filler.${context ? `\n\nAdditional context/instructions: ${context}` : ''}`;

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
      throw new Error(`Ollama error: ${err}`);
    }
    
    const data = await response.json();
    return data.message?.content || "";
  }

  throw new Error("Unsupported provider");
}
