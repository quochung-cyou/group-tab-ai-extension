import { Storage } from "@plasmohq/storage"

const storage = new Storage({
  area: "local"
})

export enum ProviderType {
  OpenAI = "openai",
  Gemini = "gemini"
}

export interface OpenAIProviderConfig {
  token: string
  model: string
}

export interface GeminiProviderConfig {
  apiKey: string
  model: string
}

export interface ProviderConfigs {
  provider: ProviderType
  configs: {
    [ProviderType.OpenAI]: OpenAIProviderConfig
    [ProviderType.Gemini]: GeminiProviderConfig
  }
}

export const defaultProviderConfigs: ProviderConfigs = {
  provider: ProviderType.OpenAI,
  configs: {
    openai: {
      token: "",
      model: "gpt-4o"
    },
    gemini: {
      apiKey: "",
      model: "gemini-2.0-flash-exp"
    }
  }
}

export interface ModelMeta {
  displayName: string
  rateLimitNote: string
}

export const providerModelMeta: Record<ProviderType, Record<string, ModelMeta>> = {
  [ProviderType.OpenAI]: {
    "gpt-4o": {
      displayName: "GPT-4o",
      rateLimitNote: "Standard OpenAI chat rate limits based on your account tier."
    },
    "gpt-4o-mini": {
      displayName: "GPT-4o Mini",
      rateLimitNote: "Faster and more cost-effective than GPT-4o with good performance."
    },
    "gpt-4-turbo": {
      displayName: "GPT-4 Turbo",
      rateLimitNote: "Previous generation model with strong reasoning capabilities."
    },
    "gpt-3.5-turbo": {
      displayName: "GPT-3.5 Turbo",
      rateLimitNote: "Fast and economical option for simpler grouping tasks."
    }
  },
  [ProviderType.Gemini]: {
    "gemini-2.0-flash-exp": {
      displayName: "Gemini 2.0 Flash (Experimental)",
      rateLimitNote: "Latest experimental model optimized for speed and efficiency."
    },
    "gemini-2.5-flash": {
      displayName: "Gemini 2.5 Flash",
      rateLimitNote: "Optimised for high volume calls with generous tokens-per-minute limits and a 1M token context window."
    },
    "gemini-2.5-pro": {
      displayName: "Gemini 2.5 Pro (Thinking Mode)",
      rateLimitNote: "Most capable reasoning model with extended thinking. Requires thinking budget > 0."
    }
  }
}

export async function getProviderConfigs(): Promise<ProviderConfigs> {
  const providerConfigs = await storage.get<ProviderConfigs>("providerConfigs")
  if (providerConfigs === undefined) {
    console.log("[Config] No config found, using default:", defaultProviderConfigs)
    void setProviderConfigs(defaultProviderConfigs)
    return defaultProviderConfigs
  }
  console.log("[Config] Loaded config from storage:", providerConfigs)
  return providerConfigs
}

export async function setProviderConfigs(
  providerConfigs: ProviderConfigs
): Promise<void> {
  console.log("[Config] Saving config to storage:", providerConfigs)
  await storage.set("providerConfigs", providerConfigs)
  const verify = await storage.get<ProviderConfigs>("providerConfigs")
  console.log("[Config] Verified saved config:", verify)
}
