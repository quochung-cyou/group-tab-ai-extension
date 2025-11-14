import type { ReactElement } from "react"

import { type Settings, defaultSettings } from "~storage/setting"

interface SettingsSectionProps {
  settings: Settings | undefined
  setSettings: (settings: Settings) => Promise<void>
}

export default function SettingsSection({ settings, setSettings }: SettingsSectionProps): ReactElement {
  const current = settings ?? defaultSettings

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: 10, borderRadius: 12, border: "1px solid #111827", background: "#020617" }}>
      <label style={{ fontSize: 11, color: "#9ca3af" }}>Behaviour</label>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#e5e7eb" }}>
            <input type="checkbox" checked={current.showName} onChange={() => { void setSettings({ ...current, showName: !current.showName }) }} style={{ width: 12, height: 12 }} />
            Show group titles
          </label>
          <span style={{ fontSize: 10, color: "#6b7280", paddingLeft: 18 }}>
            Display descriptive names for each tab group. When disabled, groups are created but remain unnamed.
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#e5e7eb" }}>
            <input type="checkbox" checked={current.keepExistingGroups} onChange={() => { void setSettings({ ...current, keepExistingGroups: !current.keepExistingGroups }) }} style={{ width: 12, height: 12 }} />
            Respect and refine existing groups
          </label>
          <span style={{ fontSize: 10, color: "#6b7280", paddingLeft: 18 }}>
            AI will preserve your current tab groups and only reorganize ungrouped tabs or refine existing groups. Useful for iterative organization.
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#e5e7eb" }}>
            <input type="checkbox" checked={current.keepMiscTab} onChange={() => { void setSettings({ ...current, keepMiscTab: !current.keepMiscTab }) }} style={{ width: 12, height: 12 }} />
            Keep Misc group for leftovers
          </label>
          <span style={{ fontSize: 10, color: "#6b7280", paddingLeft: 18 }}>
            Tabs that don&apos;t fit into any category will be grouped into a &quot;Misc&quot; group. When disabled, they remain ungrouped and moved to the end.
          </span>
        </div>
      </div>
    </div>
  )
}
