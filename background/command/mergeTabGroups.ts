import { showToast } from "~background/toast"
import { recordLearningEvent } from "~storage/learningSystem"

export async function mergeTabGroups(groupIds: number[], newGroupName: string): Promise<void> {
  if (groupIds.length < 2) {
    throw new Error("At least 2 groups are required to merge")
  }

  if (!newGroupName || newGroupName.trim() === "") {
    throw new Error("Group name cannot be empty")
  }

  const currentWindow = await chrome.windows.getCurrent()
  if (currentWindow.id === undefined) {
    throw new Error("Could not determine current window")
  }

  const windowId = currentWindow.id

  const validatedGroups: chrome.tabGroups.TabGroup[] = []
  const allTabIds: number[] = []
  const groupTitles: string[] = []

  for (const groupId of groupIds) {
    try {
      const group = await chrome.tabGroups.get(groupId)
      
      if (group.windowId !== windowId) {
        throw new Error(`Group "${group.title || groupId}" is not in the current window`)
      }

      validatedGroups.push(group)
      groupTitles.push(group.title || "Untitled")

      const tabs = await chrome.tabs.query({ groupId })
      
      if (tabs.length === 0) {
        console.warn(`[MergeGroups] Group ${groupId} has no tabs, skipping`)
        continue
      }

      for (const tab of tabs) {
        if (tab.id !== undefined) {
          allTabIds.push(tab.id)
        }
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("No group with id")) {
        throw new Error(`Group with ID ${groupId} no longer exists. Please refresh and try again.`)
      }
      throw error
    }
  }

  if (allTabIds.length === 0) {
    throw new Error("No tabs found in the selected groups")
  }

  if (validatedGroups.length < 2) {
    throw new Error("At least 2 valid groups are required to merge")
  }

  try {
    await chrome.tabs.ungroup(allTabIds)
  } catch (error) {
    console.error("[MergeGroups] Error ungrouping tabs:", error)
    throw new Error("Failed to ungroup tabs. Some tabs may have been closed.")
  }

  const stillExistingTabs: number[] = []
  for (const tabId of allTabIds) {
    try {
      const tab = await chrome.tabs.get(tabId)
      if (tab.id !== undefined) {
        stillExistingTabs.push(tab.id)
      }
    } catch {
      console.warn(`[MergeGroups] Tab ${tabId} no longer exists`)
    }
  }

  if (stillExistingTabs.length === 0) {
    throw new Error("All tabs were closed during the merge operation")
  }

  try {
    const newGroupId = await chrome.tabs.group({
      tabIds: stillExistingTabs,
      createProperties: { windowId }
    })

    await chrome.tabGroups.update(newGroupId, {
      title: newGroupName,
      collapsed: false
    })

    for (const tabId of stillExistingTabs) {
      try {
        const tab = await chrome.tabs.get(tabId)
        if (tab.url !== undefined) {
          let domain = ""
          try {
            domain = new URL(tab.url).hostname
          } catch {}

          void recordLearningEvent({
            timestamp: Date.now(),
            type: "manual_move",
            tabInfo: {
              id: tabId,
              title: tab.title ?? "",
              url: tab.url,
              domain
            },
            action: {
              fromGroup: groupTitles.join(", "),
              toGroup: newGroupName,
              aiSuggested: false
            }
          })
        }
      } catch (error) {
        console.warn(`[MergeGroups] Could not record learning event for tab ${tabId}:`, error)
      }
    }

    void showToast(`Successfully merged ${validatedGroups.length} groups into "${newGroupName}"`, "success")

    console.log(`[MergeGroups] Successfully merged ${validatedGroups.length} groups into "${newGroupName}"`)
  } catch (error) {
    console.error("[MergeGroups] Error creating merged group:", error)
    throw new Error("Failed to create the merged group")
  }
}
