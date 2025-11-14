import { allTabsPrompt, updateGroupsPrompt } from "~background/prompts"
import { getProvider } from "~background/providers"
import { getSettings } from "~storage/setting"
import { recordLearningEvent, getActivePromptRevision } from "~storage/learningSystem"
import { getTabSummaries } from "~background/tabContent"
import { showGroupingStarted, showGroupingSuccess, showGroupingCancelled, showGroupingError } from "~background/toast"

// Global state for managing active grouping operations
let activeGroupingController: AbortController | null = null
let activeGroupingTimer: NodeJS.Timeout | null = null
const GROUPING_TIMEOUT_MS = 60000 // 60 seconds timeout

export async function groupAllTabs(windowID?: number): Promise<boolean> {
  console.log("[Grouping] === groupAllTabs function called ===", { windowID })
  
  // Cancel any existing grouping operation
  if (activeGroupingController) {
    console.log("[Grouping] Cancelling previous grouping operation")
    activeGroupingController.abort()
    if (activeGroupingTimer) {
      clearInterval(activeGroupingTimer)
      activeGroupingTimer = null
    }
    void chrome.action.setBadgeText({ text: "" })
  }

  // Create new abort controller for this operation
  activeGroupingController = new AbortController()
  const signal = activeGroupingController.signal
  console.log("[Grouping] Created new AbortController")
  
  // Show toast notification
  void showGroupingStarted()

  console.log("[Grouping] Getting settings...")
  const setting = await getSettings()
  console.log("[Grouping] Settings loaded:", setting)

  // The GPT response is take many time to response,
  // The last windows maybe change to another windows
  // So we need to get the current window id
  console.log("[Grouping] Getting window ID...")
  const windowId = windowID ?? (await chrome.windows.getCurrent()).id
  console.log("[Grouping] Window ID:", windowId)
  if (windowId === undefined) {
    console.error("[Grouping] Window ID is undefined, aborting")
    return false
  }

  // Get all tabs in the current window
  console.log("[Grouping] Querying tabs...")
  const tabs = await chrome.tabs.query({ windowId })
  console.log("[Grouping] Found", tabs.length, "tabs")
  if (tabs.length === 0) {
    console.log("[Grouping] No tabs to group.")
    return true // Nothing to do
  }

  console.log("[Grouping] Getting provider...")
  const provider = getProvider()

  // Set badge text to show the time
  console.log("[Grouping] Starting timer badge...")
  const startTime = new Date().getTime()
  activeGroupingTimer = setInterval(() => {
    if (signal.aborted) {
      if (activeGroupingTimer) clearInterval(activeGroupingTimer)
      return
    }
    const now = new Date().getTime()
    const diff = Math.floor((now - startTime) / 1000).toString()
    void chrome.action.setBadgeText({ text: diff })
  }, 1000)

  // Set up timeout
  console.log("[Grouping] Setting up", GROUPING_TIMEOUT_MS / 1000, "second timeout")
  const timeoutId = setTimeout(() => {
    if (activeGroupingController && !signal.aborted) {
      console.error("[Grouping] Operation timed out after", GROUPING_TIMEOUT_MS / 1000, "seconds")
      activeGroupingController.abort()
    }
  }, GROUPING_TIMEOUT_MS)

  let resp: Group[] = []
  try {
    console.log("[Grouping] Entering main try block")
    // Check if already aborted
    if (signal.aborted) {
      console.log("[Grouping] Signal already aborted before starting")
      throw new Error("Operation cancelled")
    }
    console.log("[Grouping] Getting active prompt revision...")
    const activeRevision = await getActivePromptRevision()
    console.log("[Grouping] Active revision:", activeRevision !== null ? "exists" : "null")
    let prompt: string
    
    if (activeRevision !== null) {
      console.log("[AI] Using learned prompt revision")
      const basePrompt = activeRevision
      prompt = basePrompt
        .replace("{specialRequirements}", setting.specialRequirements ?? "No special requirements")
        .replace("{tabsJson}", "")
      
      if (setting.keepExistingGroups) {
        const existingGroups = await chrome.tabGroups.query({ windowId })
        const updatePrompt = await updateGroupsPrompt(tabs, existingGroups, setting.specialRequirements)
        prompt = updatePrompt
      } else {
        const summaries = await getTabSummaries(tabs, 100, 800)
        prompt = prompt.replace("{tabsJson}", JSON.stringify(summaries))
      }
    } else {
      console.log("[Grouping] No active revision, generating prompt...")
      if (setting.keepExistingGroups) {
        console.log("[Grouping] Keep existing groups mode enabled")
        const existingGroups = await chrome.tabGroups.query({ windowId })
        prompt = await updateGroupsPrompt(tabs, existingGroups, setting.specialRequirements)
      } else {
        console.log("[Grouping] Standard grouping mode enabled")
        prompt = await allTabsPrompt(tabs, setting.specialRequirements)
      }
      console.log("[Grouping] Prompt generated")
    }
    
    console.log("[Grouping] Generated prompt (length:", prompt.length, ")")
    
    // Check if aborted before API call
    if (signal.aborted) {
      console.log("[Grouping] Signal aborted before API call")
      throw new Error("Operation cancelled")
    }
    
    console.log("[Grouping] Calling provider.generate()...")
    const response = await (await provider).generate(prompt, signal)
    console.log("[Grouping] Provider returned response (length:", response.length, ")")
    
    // Check if aborted after API call
    if (signal.aborted) {
      console.log("[Grouping] Signal aborted after API call")
      throw new Error("Operation cancelled")
    }
    
    console.log("[Grouping] Parsing response...")
    resp = await JSON.parse(response)
    console.log("[Grouping] Parsed", resp.length, "groups:", resp)

    // --- Ungroup ALL tabs AFTER getting AI response --- 
    // This simplifies applying the potentially complex desired state from the AI.
    const tabIDs: number[] = []
    const currentTabs = await chrome.tabs.query({ windowId }) // Get fresh tab list
    for (const tab of currentTabs) {
      if (tab.id !== undefined) {
        tabIDs.push(tab.id)
      }
    }
    if (tabIDs.length > 0) {
        console.log("Ungrouping all tabs before applying new groups...")
        await chrome.tabs.ungroup(tabIDs)
        console.log("Finished ungrouping.")
    } else {
        console.log("No tabs found to ungroup.")
    }

    // Apply the grouping from the AI response
    console.log("[Grouping] Applying groups to tabs...")
    await grounpTabs(resp, windowId, setting.showName, setting.keepMiscTab)
    console.log("[Grouping] Groups applied successfully")
    
    // Clear timer and show success
    if (activeGroupingTimer) {
      clearInterval(activeGroupingTimer)
      activeGroupingTimer = null
    }
    clearTimeout(timeoutId)
    void chrome.action.setBadgeText({ text: "" })
    void showGroupingSuccess()

  } catch (error) {
    console.error("[Grouping] Error during grouping process:", error)
    
    // Cleanup timers
    if (activeGroupingTimer) {
      clearInterval(activeGroupingTimer)
      activeGroupingTimer = null
    }
    clearTimeout(timeoutId)
    
    // Show appropriate error message
    if (signal.aborted) {
      console.log("[Grouping] Operation was cancelled")
      void chrome.action.setBadgeText({ text: "⊗" })
      setTimeout(() => {
        void chrome.action.setBadgeText({ text: "" })
      }, 2000)
      void showGroupingCancelled()
    } else {
      console.log("[Grouping] Operation failed with error")
      void chrome.action.setBadgeText({ text: "Err" })
      setTimeout(() => {
        void chrome.action.setBadgeText({ text: "" })
      }, 3000)
      const errorMsg = error instanceof Error ? error.message : "Unknown error"
      void showGroupingError(errorMsg)
    }
    
    activeGroupingController = null
    throw error // Re-throw to let the message handler catch it
  } finally {
    // Final cleanup - only clear if no error badge is showing
    console.log("[Grouping] Final cleanup...")
    if (activeGroupingTimer) {
      clearInterval(activeGroupingTimer)
      activeGroupingTimer = null
    }
    activeGroupingController = null
    console.log("[Grouping] Cleanup complete")
  }

  console.log("[Grouping] === groupAllTabs function completed successfully ===")
  return true
}

async function grounpTabs(
  data: Group[],
  windowId: number = chrome.windows.WINDOW_ID_CURRENT,
  showName: boolean = true,
  keepMiscTab: boolean = false
): Promise<void> {
  // Get all tabs in the current window
  const tabs = await chrome.tabs.query({ windowId })
  for (const group of data) {
    // At some time, they are return empty group name and like "other", "others", "miscellaneous".
    // So we need to filter out these group
    switch (group.group_name.toLowerCase()) {
      case "":
      case "other":
      case "others":
        continue
      default:
        break
    }

    // Because AI is take many time to response,
    // So we need to filter out the tabs that are not exist
    const ids = group.ids.filter((id) => {
      return tabs.find((tab) => tab.id === id)
    })

    // If there is only one tab in the group, we don't need to group it
    if (ids.length <= 1) {
      continue
    }

    try {
      const createdGroup = await chrome.tabs.group({
        tabIds: ids,
        createProperties: {
          windowId
        }
      })
      
      const groupTitle = showName ? group.group_name : ""
      
      if (showName) {
        await chrome.tabGroups.update(createdGroup, {
          title: groupTitle,
          collapsed: true
        })
        console.log("Grouped ", group.group_name)
      } else {
        await chrome.tabGroups.update(createdGroup, {
          collapsed: true
        })
        console.log("Grouped tabs (name hidden)")
      }
      
      for (const tabId of ids) {
        const tab = tabs.find(t => t.id === tabId)
        if (tab !== undefined && tab.id !== undefined && tab.url !== undefined) {
          let domain = ""
          try {
            domain = new URL(tab.url).hostname
          } catch {}
          
          void recordLearningEvent({
            timestamp: Date.now(),
            type: "ai_group",
            tabInfo: {
              id: tab.id,
              title: tab.title ?? "",
              url: tab.url,
              domain
            },
            action: {
              fromGroup: null,
              toGroup: groupTitle,
              aiSuggested: true
            }
          })
        }
      }
    } catch (error) {
       console.error("Error grouping tabs:", error, "Group:", group)
    }
  }
  console.log("Finished initial grouping based on AI response")

  // Handle remaining ungrouped tabs
  const nonGroupTabs = await chrome.tabs.query({
    windowId,
    groupId: chrome.tabGroups.TAB_GROUP_ID_NONE
  })

  if (keepMiscTab && nonGroupTabs.length > 0) {
    const miscTabIDs = nonGroupTabs.map((tab) => tab.id).filter((id): id is number => id !== undefined);
    if (miscTabIDs.length > 0) {
        try {
          const miscGroup = await chrome.tabs.group({
            tabIds: miscTabIDs,
            createProperties: {
              windowId
            }
          })
          await chrome.tabGroups.update(miscGroup, {
            title: "Misc",
            collapsed: true
          })
          console.log("Grouped remaining tabs into 'Misc' group")
        } catch (error) {
           console.error("Error creating 'Misc' group:", error)
        }
    }
  } else if (nonGroupTabs.length > 0) {
    // If not keeping misc tab, move ungrouped tabs to the end
    console.log("Moving ungrouped tabs to the end")
    for (const tab of nonGroupTabs) {
      if (tab.id !== undefined) {
          try {
            await chrome.tabs.move(tab.id, { index: -1 })
          } catch (error) {
             console.error(`Error moving tab ${tab.id} to end:`, error)
          }
      }
    }
  }
  console.log("Finished handling ungrouped tabs.")
}

interface Group {
  group_name: string
  ids: number[]
}
