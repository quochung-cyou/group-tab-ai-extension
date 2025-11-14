import type { ReactElement } from "react"
import { useState, useEffect } from "react"
import { FolderX, Folders, GitMerge } from "tabler-icons-react"

import { sendToBackground } from "@plasmohq/messaging"

import ProviderSection from "~components/providerSection"
import SettingsSection from "~components/settingsSection"
import {
  type ProviderConfigs,
  ProviderType,
  defaultProviderConfigs,
  getProviderConfigs,
  setProviderConfigs
} from "~storage/config"
import { type Settings, defaultSettings, getSettings, setSettings as saveSettings } from "~storage/setting"
import { shortHash, version } from "~version"

function IndexPopup(): ReactElement {
  const [config, setConfig] = useState<ProviderConfigs>(defaultProviderConfigs)
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [isGrouping, setIsGrouping] = useState(false)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const loadedConfig = await getProviderConfigs()
      const loadedSettings = await getSettings()
      setConfig(loadedConfig)
      setSettings(loadedSettings)
    })()
  }, [])

  const provider = config?.provider ?? ProviderType.OpenAI
  
  const handleSetConfig = async (newConfig: ProviderConfigs): Promise<void> => {
    await setProviderConfigs(newConfig)
    setConfig(newConfig)
  }
  
  const handleSetSettings = async (newSettings: Settings): Promise<void> => {
    await saveSettings(newSettings)
    setSettings(newSettings)
  }
  const handleOpenPromptEditor = (): void => {
    const url = chrome.runtime.getURL("tabs/promptEditor.html")
    void chrome.tabs.create({ url })
  }

  const handleOpenOnboarding = (): void => {
    const url = chrome.runtime.getURL("tabs/index.html")
    void chrome.tabs.create({ url })
  }

  const handleOpenLearning = (): void => {
    const url = chrome.runtime.getURL("tabs/learning.html")
    void chrome.tabs.create({ url })
  }

  const handleOpenMergeGroups = (): void => {
    const url = chrome.runtime.getURL("tabs/mergeGroups.html")
    void chrome.tabs.create({ url })
  }

  const handleGroupClick = (): void => {
    console.log("[Popup] Group button clicked")
    if (isGrouping) {
      console.log("[Popup] Already grouping, returning")
      return
    }
    console.log("[Popup] Starting grouping process")
    setIsGrouping(true)
    setErrorText(null)
    setStatusMessage("Grouping tabs...")
    void (async () => {
      try {
        console.log("[Popup] Getting current window")
        const window = await chrome.windows.getCurrent()
        console.log("[Popup] Window ID:", window.id)
        if (window.id == null) {
          console.log("[Popup] Window ID is null, returning")
          return
        }
        console.log("[Popup] Sending message to background")
        const resp = await sendToBackground({
          name: "groupAllTabs",
          body: { windowId: window.id }
        }) as { success?: boolean; error?: string } | undefined
        console.log("[Popup] Received response:", resp)
        if (resp?.success !== true) {
          console.log("[Popup] Grouping failed:", resp?.error)
          setErrorText(resp?.error ?? "Unknown error")
          setStatusMessage(null)
        } else {
          console.log("[Popup] Grouping succeeded")
          setStatusMessage("Tabs grouped successfully!")
          setTimeout(() => setStatusMessage(null), 2000)
        }
      } catch (e) {
        console.error("[Popup] Error during grouping:", e)
        setErrorText(e instanceof Error ? e.message : "Failed to group tabs")
        setStatusMessage(null)
      } finally {
        console.log("[Popup] Grouping process finished")
        setIsGrouping(false)
      }
    })()
  }

  return (
    <div style={{ minWidth: 260, maxWidth: 360, padding: 14, display: "flex", flexDirection: "column", gap: 10, background: "#020617", color: "#f9fafb", fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 13, letterSpacing: 0.6, textTransform: "uppercase", color: "#9ca3af" }}>Group Tab AI</span>
          <span style={{ fontSize: 11, color: "#6b7280" }}>One click to tidy your workspace.</span>
        </div>
        <span style={{ fontSize: 10, color: "#4b5563" }}>{version} · {shortHash}</span>
      </div>

      <ProviderSection provider={provider} config={config} setConfig={handleSetConfig} />

      <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: 10, borderRadius: 12, border: "1px solid #111827", background: "#020617" }}>
        <label style={{ fontSize: 11, color: "#9ca3af" }}>Rough requirements</label>
        <input type="text" value={settings?.specialRequirements} onChange={(e) => { void handleSetSettings({ ...(settings ?? defaultSettings), specialRequirements: e.target.value }) }} placeholder="Tell the AI what to optimise for, e.g. 'separate work vs personal'" style={{ width: "100%", borderRadius: 999, border: "1px solid #1f2937", background: "#020617", color: "#e5e7eb", fontSize: 11, padding: "6px 10px" }} />
        <button type="button" onClick={handleOpenPromptEditor} style={{ alignSelf: "flex-start", marginTop: 4, fontSize: 10, border: "none", background: "transparent", color: "#60a5fa", cursor: "pointer", padding: 0 }}>
          Edit full prompt templates
        </button>
      </div>

      <SettingsSection settings={settings} setSettings={handleSetSettings} />

      <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
        <button onClick={handleGroupClick} disabled={isGrouping} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "6px 8px", borderRadius: 999, border: "none", background: isGrouping ? "linear-gradient(135deg, #4ade80 0%, #16a34a 50%, #4ade80 100%)" : "linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #22c55e 100%)", opacity: isGrouping ? 0.85 : 1, color: "#022c22", fontSize: 12, fontWeight: 600, cursor: isGrouping ? "default" : "pointer" }}>
          <Folders size={16} />
          {isGrouping ? "Grouping" : "Group"}
        </button>
        <button onClick={handleOpenMergeGroups} style={{ width: 40, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 999, border: "1px solid #374151", background: "#020617", color: "#22c55e", cursor: "pointer" }} title="Merge groups">
          <GitMerge size={16} />
        </button>
        <button onClick={() => { if (isGrouping) return; void (async () => { const window = await chrome.windows.getCurrent(); if (window.id == null) return; void sendToBackground({ name: "unGroupAllTabs", body: { windowId: window.id } }) })() }} style={{ width: 40, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 999, border: "1px solid #374151", background: "#020617", color: "#e5e7eb", cursor: "pointer" }} title="Ungroup all">
          <FolderX size={16} />
        </button>
      </div>

      {statusMessage !== null && statusMessage.length > 0 && <div style={{ marginTop: 4, fontSize: 10, color: "#60a5fa" }}>{statusMessage}</div>}
      {errorText !== null && errorText.length > 0 && <div style={{ marginTop: 4, fontSize: 10, color: "#f97373" }}>{errorText}</div>}

      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button type="button" onClick={handleOpenOnboarding} style={{ flex: 1, border: "none", background: "transparent", color: "#6b7280", fontSize: 10, textAlign: "left", cursor: "pointer", padding: 0 }}>
          Open quickstart
        </button>
        <button type="button" onClick={handleOpenLearning} style={{ flex: 1, border: "none", background: "transparent", color: "#3b82f6", fontSize: 10, textAlign: "right", cursor: "pointer", padding: 0 }}>
          🧠 Learning
        </button>
      </div>
    </div>
  )
}

export default IndexPopup
