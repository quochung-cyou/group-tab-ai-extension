import type { ReactElement, ChangeEvent } from "react"

import AutoSaveInput from "~components/autoSaveInput"
import {
  type ProviderConfigs,
  ProviderType,
  defaultProviderConfigs,
  providerModelMeta
} from "~storage/config"

interface ProviderSectionProps {
  provider: ProviderType
  config: ProviderConfigs | undefined
  setConfig: (configs: ProviderConfigs) => Promise<void>
  showSelector?: boolean
}

export default function ProviderSection({ provider, config, setConfig, showSelector = true }: ProviderSectionProps): ReactElement {
  const current = config ?? defaultProviderConfigs
  const openaiConfig = current.configs[ProviderType.OpenAI]
  const geminiConfig = current.configs[ProviderType.Gemini]
  const meta = providerModelMeta[provider]

  const handleProviderChange = (e: ChangeEvent<HTMLSelectElement>): void => {
    const value = e.target.value as ProviderType
    console.log("[ProviderSection] Provider changed to:", value)
    console.log("[ProviderSection] Full config being saved:", { ...current, provider: value })
    void setConfig({ ...current, provider: value })
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: 10, borderRadius: 12, border: "1px solid #111827", background: "radial-gradient(circle at top, rgba(37,99,235,0.35), transparent 55%), #020617" }}>
      {showSelector && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "#9ca3af" }}>Provider</span>
          <select value={provider} onChange={handleProviderChange} style={{ flex: 1, borderRadius: 999, border: "1px solid #1f2937", background: "#020617", color: "#e5e7eb", fontSize: 11, padding: "4px 10px" }}>
            <option value={ProviderType.OpenAI}>OpenAI</option>
            <option value={ProviderType.Gemini}>Gemini</option>
          </select>
        </div>
      )}

      {provider === ProviderType.OpenAI && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 11, color: "#9ca3af" }}>OpenAI secret key</span>
          <AutoSaveInput
            value={openaiConfig?.token ?? ""}
            onChange={(token) => {
              void setConfig({ ...current, configs: { ...current.configs, openai: { ...openaiConfig, token } } })
            }}
            placeholder="Your OpenAI secret key"
            style={{ width: "100%", borderRadius: 999, border: "1px solid #1f2937", background: "#020617", color: "#e5e7eb", fontSize: 11, padding: "6px 10px" }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: "#9ca3af" }}>Model</span>
            <select
              value={openaiConfig?.model ?? "gpt-4o"}
              onChange={(e) => {
                void setConfig({ ...current, configs: { ...current.configs, openai: { ...openaiConfig, model: e.target.value } } })
              }}
              style={{ flex: 1, borderRadius: 999, border: "1px solid #1f2937", background: "#020617", color: "#e5e7eb", fontSize: 11, padding: "4px 10px" }}
            >
              {Object.entries(providerModelMeta[ProviderType.OpenAI]).map(([value, meta]) => (
                <option key={value} value={value}>{meta.displayName}</option>
              ))}
            </select>
          </div>
          <span style={{ fontSize: 10, color: "#6b7280" }}>{meta?.[openaiConfig?.model ?? "gpt-4o"]?.rateLimitNote}</span>
        </div>
      )}

      {provider === ProviderType.Gemini && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 11, color: "#9ca3af" }}>Gemini API key</span>
          <AutoSaveInput
            value={geminiConfig?.apiKey ?? ""}
            onChange={(apiKey) => {
              void setConfig({ ...current, configs: { ...current.configs, gemini: { ...geminiConfig, apiKey } } })
            }}
            placeholder="Your Gemini API key"
            style={{ width: "100%", borderRadius: 999, border: "1px solid #1f2937", background: "#020617", color: "#e5e7eb", fontSize: 11, padding: "6px 10px" }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: "#9ca3af" }}>Model</span>
            <select
              value={geminiConfig?.model ?? "gemini-2.5-flash"}
              onChange={(e) => {
                void setConfig({ ...current, configs: { ...current.configs, gemini: { ...geminiConfig, model: e.target.value } } })
              }}
              style={{ flex: 1, borderRadius: 999, border: "1px solid #1f2937", background: "#020617", color: "#e5e7eb", fontSize: 11, padding: "4px 10px" }}
            >
              {Object.entries(providerModelMeta[ProviderType.Gemini]).map(([value, meta]) => (
                <option key={value} value={value}>{meta.displayName}</option>
              ))}
            </select>
          </div>
          <span style={{ fontSize: 10, color: "#6b7280" }}>{meta?.[geminiConfig?.model ?? "gemini-2.5-flash"]?.rateLimitNote}</span>
        </div>
      )}
    </div>
  )
}
