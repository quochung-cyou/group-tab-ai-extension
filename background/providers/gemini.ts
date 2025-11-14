import type { Provider } from "~background/types"
import { ProviderType, type ProviderConfigs, getProviderConfigs } from "~storage/config"

interface GeminiCandidatePart {
  text?: string
}

interface GeminiContent {
  parts?: GeminiCandidatePart[]
}

interface GeminiCandidate {
  content?: GeminiContent
}

interface GeminiResponse {
  candidates?: GeminiCandidate[]
}

export class GeminiProvider implements Provider {
  private readonly apiKey: string
  private readonly model: string

  constructor(apiKey: string, model: string) {
    this.apiKey = apiKey
    this.model = model
  }

  async generate(prompt: string, signal?: AbortSignal): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`
    
    // Determine if model requires thinking mode
    // Pro models (2.5-pro) require thinking budget > 0
    // Flash models work better with thinking budget 0 for speed
    const isProModel = this.model.includes('pro')
    const thinkingBudget = isProModel ? 8192 : 0
    
    const body: any = {
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ]
    }
    
    // Only add generationConfig if we need thinking mode
    if (isProModel) {
      body.generationConfig = {
        thinkingConfig: {
          thinkingBudget: thinkingBudget
        }
      }
    } else {
      // For Flash models, set thinking budget to 0 for faster responses
      body.generationConfig = {
        thinkingConfig: {
          thinkingBudget: 0
        }
      }
    }

    console.log("[Gemini] Request body", {
      url,
      body
    })

    const rep = await fetch(url, {
      method: "POST",
      headers: {
        "x-goog-api-key": this.apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
      signal
    })

    if (!rep.ok) {
      const errorBody = await rep.text()
      console.error("[Gemini] API error", rep.status, rep.statusText, errorBody)
      throw new Error(`Gemini API error: ${rep.status} ${rep.statusText}`)
    }

    const json = (await rep.json()) as GeminiResponse
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text

    if (!text) {
      console.error("[Gemini] Empty response", json)
      throw new Error("Gemini returned empty content")
    }

    const trimmed = text.trim()
    const withoutFence = trimmed
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim()

    let parsed: unknown
    try {
      parsed = JSON.parse(withoutFence)
    } catch (e) {
      console.error("[Gemini] Failed to parse JSON", withoutFence)
      throw e
    }

    if (Array.isArray(parsed)) {
      return JSON.stringify(parsed)
    }

    if (parsed && typeof parsed === "object" && (parsed as any).groups) {
      return JSON.stringify((parsed as any).groups)
    }

    return JSON.stringify(parsed)
  }

  async generateWithFormat<T>(prompt: string, signal?: AbortSignal): Promise<T> {
    const resp = await this.generate(prompt, signal)
    return JSON.parse(resp) as T
  }
}

export async function getGeminiProviderFromConfig(): Promise<GeminiProvider | null> {
  const config: ProviderConfigs = await getProviderConfigs()
  if (config.provider !== ProviderType.Gemini) {
    return null
  }
  const geminiConfig = config.configs[ProviderType.Gemini]
  return new GeminiProvider(geminiConfig.apiKey, geminiConfig.model)
}
