import type { Provider } from "~background/types"
import {
  type ProviderConfigs,
  ProviderType,
  getProviderConfigs
} from "~storage/config"

import { OpenAIProvider } from "./openai"
import { GeminiProvider } from "./gemini"

export async function getProvider(): Promise<Provider> {
  const config: ProviderConfigs = await getProviderConfigs()
  
  console.log("[Provider] Selected provider:", config.provider)
  console.log("[Provider] Full config:", config)
  
  switch (config.provider) {
    case ProviderType.Gemini: {
      const geminiConfig = config.configs[ProviderType.Gemini]
      console.log("[Provider] Using Gemini with model:", geminiConfig.model)
      return new GeminiProvider(geminiConfig.apiKey, geminiConfig.model)
    }
    case ProviderType.OpenAI:
    default: {
      const openaiConfig = config.configs[ProviderType.OpenAI]
      console.log("[Provider] Using OpenAI with model:", openaiConfig.model)
      return new OpenAIProvider(openaiConfig.token, openaiConfig.model)
    }
  }
}
