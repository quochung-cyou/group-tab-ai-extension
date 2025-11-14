import { recordLearningEvent } from "~storage/learningSystem"

const groupCache = new Map<number, { id: number; title?: string }>()

async function initializeGroupCache(): Promise<void> {
  const groups = await chrome.tabGroups.query({})
  groups.forEach(group => {
    groupCache.set(group.id, { id: group.id, title: group.title })
  })
}

chrome.tabs.onAttached?.addListener((tabId, attachInfo) => {
  void (async () => {
    try {
      const tab = await chrome.tabs.get(tabId)
      if (tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
        const group = await chrome.tabGroups.get(tab.groupId)
        const previousGroup = groupCache.get(tab.groupId)
        
        if (previousGroup === undefined || previousGroup.id !== tab.groupId) {
          if (tab.id === undefined || tab.url === undefined) return
          
          let domain = ""
          try {
            domain = new URL(tab.url).hostname
          } catch {}
          
          await recordLearningEvent({
            timestamp: Date.now(),
            type: "manual_move",
            tabInfo: {
              id: tab.id,
              title: tab.title ?? "",
              url: tab.url,
              domain
            },
            action: {
              fromGroup: previousGroup?.title ?? null,
              toGroup: group.title ?? null,
              aiSuggested: false
            }
          })
        }
        
        groupCache.set(tab.groupId, { id: group.id, title: group.title })
      }
    } catch (error) {
      console.error("Error tracking tab attachment:", error)
    }
  })()
})

chrome.tabs.onUpdated?.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.groupId !== undefined) {
    void (async () => {
      try {
        let fromGroupName: string | null = null
        let toGroupName: string | null = null
        
        const previousGroupId = groupCache.get(tabId)?.id
        
        if (previousGroupId !== undefined && previousGroupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
          try {
            const prevGroup = await chrome.tabGroups.get(previousGroupId)
            fromGroupName = prevGroup.title ?? null
          } catch {}
        }
        
        if (changeInfo.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE && changeInfo.groupId !== undefined) {
          try {
            const newGroup = await chrome.tabGroups.get(changeInfo.groupId)
            toGroupName = newGroup.title ?? null
          } catch {}
        }
        
        if (tab.id === undefined || tab.url === undefined) return
        
        if (changeInfo.groupId !== undefined) {
          let domain = ""
          try {
            domain = new URL(tab.url).hostname
          } catch {}
          
          await recordLearningEvent({
            timestamp: Date.now(),
            type: "manual_move",
            tabInfo: {
              id: tab.id,
              title: tab.title ?? "",
              url: tab.url,
              domain
            },
            action: {
              fromGroup: fromGroupName,
              toGroup: toGroupName,
              aiSuggested: false
            }
          })
          
          groupCache.set(tabId, { id: changeInfo.groupId })
        }
      } catch (error) {
        console.error("Error tracking tab group change:", error)
      }
    })()
  }
})

chrome.tabGroups.onUpdated?.addListener((group) => {
  groupCache.set(group.id, { id: group.id, title: group.title })
})

chrome.tabGroups.onRemoved?.addListener((group) => {
  groupCache.delete(group.id)
})

void initializeGroupCache()
