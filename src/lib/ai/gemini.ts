import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const geminiModel = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" });

export async function generateAIResponse(prompt: string, systemInstruction?: string): Promise<string> {
  try {
    const model = systemInstruction
      ? genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite", systemInstruction })
      : geminiModel;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error("Failed to generate AI response");
  }
}

async function generateContentWithRetry(model: any, request: any, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      return await model.generateContent(request);
    } catch (e: any) {
      if (e.status === 429 && i < retries - 1) {
        let delayMs = 15000;
        if (e.errorDetails) {
          const retryInfo = e.errorDetails.find((d: any) => d['@type'] === 'type.googleapis.com/google.rpc.RetryInfo');
          if (retryInfo && retryInfo.retryDelay) {
            delayMs = (parseInt(retryInfo.retryDelay) + 2) * 1000; // Add 2 seconds buffer
          }
        }
        console.warn(`Gemini Rate Limit (429). Retrying in ${delayMs/1000}s... (Attempt ${i + 1}/${retries})`);
        await new Promise(r => setTimeout(r, delayMs));
        continue;
      }
      throw e;
    }
  }
}

export async function chatWithTools(
  message: string,
  systemInstruction: string | undefined,
  tools: any[],
  toolExecutors: Record<string, (args: any) => Promise<any>>,
  history: Array<{ role: "user" | "model"; parts: [{ text: string }] }> = []
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite", systemInstruction, tools });
    
    const contents: any[] = [...history, { role: "user", parts: [{ text: message }] }];
    let result = await generateContentWithRetry(model, { contents });
    let calls = result.response.functionCalls();
    let maxRounds = 15;

    while (calls && calls.length > 0 && maxRounds > 0) {
      if (result.response.candidates && result.response.candidates[0]?.content) {
        contents.push(result.response.candidates[0].content);
      }

      const resultsParts: any[] = [];
      for (const call of calls) {
        console.log("AI called tool:", call.name, call.args);
        const executor = toolExecutors[call.name];
        if (executor) {
          const apiResponse = await executor(call.args);
          resultsParts.push({
            text: `System Tool Execution Result for ${call.name}: ${JSON.stringify(apiResponse)}`
          });
        }
      }

      contents.push({
        role: "user",
        parts: resultsParts.length > 0 ? resultsParts : [{ text: "Done" }]
      });

      result = await generateContentWithRetry(model, { contents });
      calls = result.response.functionCalls();
      maxRounds--;
    }

    return result.response.text();
  } catch (error) {
    console.error("Gemini API tool calling error:", error);
    throw new Error("Failed to generate AI response with tools");
  }
}
export async function generateJSON<T>(prompt: string, systemInstruction?: string): Promise<T> {
  const response = await generateAIResponse(
    prompt + "\n\nRespond ONLY with valid JSON. No markdown, no code blocks, just the JSON object.",
    systemInstruction
  );

  // Strip any markdown code blocks if present
  const cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned) as T;
}
