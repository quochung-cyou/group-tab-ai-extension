import type { ReactElement } from "react"
import { useState, useEffect } from "react"
import { GitMerge, Check, X, AlertCircle } from "tabler-icons-react"

import { sendToBackground } from "@plasmohq/messaging"

interface TabGroupInfo {
  id: number
  title: string
  color: chrome.tabGroups.ColorEnum
  tabCount: number
  collapsed: boolean
}

function MergeGroupsPage(): ReactElement {
  const [groups, setGroups] = useState<TabGroupInfo[]>([])
  const [selectedGroups, setSelectedGroups] = useState<Set<number>>(new Set())
  const [newGroupName, setNewGroupName] = useState("")
  const [isMerging, setIsMerging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    void loadGroups()
  }, [])

  const loadGroups = async (): Promise<void> => {
    try {
      const currentWindow = await chrome.windows.getCurrent()
      if (currentWindow.id === undefined) return

      const tabGroups = await chrome.tabGroups.query({ windowId: currentWindow.id })
      const tabs = await chrome.tabs.query({ windowId: currentWindow.id })

      const groupsInfo: TabGroupInfo[] = tabGroups.map(group => ({
        id: group.id,
        title: group.title || "Untitled Group",
        color: group.color,
        tabCount: tabs.filter(tab => tab.groupId === group.id).length,
        collapsed: group.collapsed
      }))

      setGroups(groupsInfo)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load groups")
    }
  }

  const toggleGroupSelection = (groupId: number): void => {
    const newSelection = new Set(selectedGroups)
    if (newSelection.has(groupId)) {
      newSelection.delete(groupId)
    } else {
      newSelection.add(groupId)
    }
    setSelectedGroups(newSelection)

    if (newSelection.size > 0 && newGroupName === "") {
      const selectedGroupNames = groups
        .filter(g => newSelection.has(g.id))
        .map(g => g.title)
        .join(" + ")
      setNewGroupName(selectedGroupNames)
    }
  }

  const handleMerge = async (): Promise<void> => {
    if (selectedGroups.size < 2) {
      setError("Please select at least 2 groups to merge")
      return
    }

    if (newGroupName.trim() === "") {
      setError("Please enter a name for the merged group")
      return
    }

    setIsMerging(true)
    setError(null)

    try {
      const result = await sendToBackground({
        name: "mergeTabGroups",
        body: {
          groupIds: Array.from(selectedGroups),
          newGroupName: newGroupName.trim()
        }
      }) as { success: boolean; error?: string }

      if (result.success) {
        setSuccess(true)
        setSelectedGroups(new Set())
        setNewGroupName("")
        await loadGroups()
        setTimeout(() => setSuccess(false), 3000)
      } else {
        setError(result.error || "Failed to merge groups")
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to merge groups")
    } finally {
      setIsMerging(false)
    }
  }

  const suggestGroupName = (): void => {
    if (selectedGroups.size === 0) return
    
    const selectedGroupNames = groups
      .filter(g => selectedGroups.has(g.id))
      .map(g => g.title)
      .filter(name => name !== "Untitled Group")
    
    if (selectedGroupNames.length > 0) {
      setNewGroupName(selectedGroupNames.join(" + "))
    }
  }

  return (
    <div style={{ minHeight: "100vh", padding: "32px 20px", background: "#020617", color: "#f9fafb", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
          <GitMerge size={32} color="#22c55e" />
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 600, margin: 0 }}>Merge Tab Groups</h1>
            <p style={{ fontSize: 14, color: "#9ca3af", margin: "4px 0 0 0" }}>
              Select multiple tab groups to combine them into one
            </p>
          </div>
        </div>

        {error && (
          <div style={{ padding: 12, marginBottom: 20, borderRadius: 8, background: "#7f1d1d", border: "1px solid #991b1b", display: "flex", alignItems: "center", gap: 8 }}>
            <AlertCircle size={20} color="#fca5a5" />
            <span style={{ fontSize: 13, color: "#fca5a5" }}>{error}</span>
          </div>
        )}

        {success && (
          <div style={{ padding: 12, marginBottom: 20, borderRadius: 8, background: "#14532d", border: "1px solid #166534", display: "flex", alignItems: "center", gap: 8 }}>
            <Check size={20} color="#86efac" />
            <span style={{ fontSize: 13, color: "#86efac" }}>Groups merged successfully!</span>
          </div>
        )}

        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: "#e5e7eb" }}>
              Select Groups to Merge ({selectedGroups.size} selected)
            </label>
            {selectedGroups.size > 0 && (
              <button
                onClick={() => setSelectedGroups(new Set())}
                style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, border: "1px solid #374151", background: "#111827", color: "#9ca3af", cursor: "pointer" }}>
                Clear Selection
              </button>
            )}
          </div>

          {groups.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", borderRadius: 12, border: "1px solid #1f2937", background: "#0f172a" }}>
              <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>No tab groups found in this window</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {groups.map(group => (
                <div
                  key={group.id}
                  onClick={() => toggleGroupSelection(group.id)}
                  style={{
                    padding: 14,
                    borderRadius: 10,
                    border: selectedGroups.has(group.id) ? "2px solid #22c55e" : "1px solid #1f2937",
                    background: selectedGroups.has(group.id) ? "#0f172a" : "#020617",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    gap: 12
                  }}>
                  <div style={{
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    border: selectedGroups.has(group.id) ? "2px solid #22c55e" : "2px solid #374151",
                    background: selectedGroups.has(group.id) ? "#22c55e" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  }}>
                    {selectedGroups.has(group.id) && <Check size={14} color="#020617" />}
                  </div>
                  <div style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: group.color,
                    flexShrink: 0
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "#f9fafb" }}>{group.title}</div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                      {group.tabCount} {group.tabCount === 1 ? "tab" : "tabs"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedGroups.size >= 2 && (
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#e5e7eb", marginBottom: 8 }}>
              New Group Name
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Enter name for merged group"
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid #374151",
                  background: "#0f172a",
                  color: "#f9fafb",
                  fontSize: 13
                }}
              />
              <button
                onClick={suggestGroupName}
                style={{
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: "1px solid #374151",
                  background: "#1f2937",
                  color: "#9ca3af",
                  fontSize: 12,
                  cursor: "pointer",
                  whiteSpace: "nowrap"
                }}>
                Suggest Name
              </button>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={handleMerge}
            disabled={isMerging || selectedGroups.size < 2 || newGroupName.trim() === ""}
            style={{
              flex: 1,
              padding: "12px 20px",
              borderRadius: 8,
              border: "none",
              background: isMerging || selectedGroups.size < 2 || newGroupName.trim() === "" 
                ? "#374151" 
                : "linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #22c55e 100%)",
              color: isMerging || selectedGroups.size < 2 || newGroupName.trim() === "" ? "#6b7280" : "#022c22",
              fontSize: 14,
              fontWeight: 600,
              cursor: isMerging || selectedGroups.size < 2 || newGroupName.trim() === "" ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8
            }}>
            <GitMerge size={18} />
            {isMerging ? "Merging..." : `Merge ${selectedGroups.size} Groups`}
          </button>
          <button
            onClick={() => window.close()}
            style={{
              padding: "12px 20px",
              borderRadius: 8,
              border: "1px solid #374151",
              background: "#1f2937",
              color: "#e5e7eb",
              fontSize: 14,
              cursor: "pointer"
            }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default MergeGroupsPage
