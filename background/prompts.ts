import { getTabSummaries } from "~background/tabContent"
import { getPromptConfig } from "~storage/promptConfig"

export async function allTabsPrompt(tabs: chrome.tabs.Tab[], specialRequirements: string | undefined): Promise<string> {
  console.log("[allTabsPrompt] Starting with", tabs.length, "tabs")
  if (tabs.length === 0) {
    throw new Error("tabs is empty")
  }

  console.log("[allTabsPrompt] Getting tab summaries...")
  const summaries = await getTabSummaries(tabs, 100, 800)
  console.log("[allTabsPrompt] Got", summaries.length, "summaries")

  console.log("[allTabsPrompt] Getting prompt config...")
  const promptConfig = await getPromptConfig()
  console.log("[allTabsPrompt] Got prompt config")
  const base = promptConfig.allTabsTemplate
  const prompt = base
    .replace("{specialRequirements}", specialRequirements ?? "No special requirements")
    .replace("{tabsJson}", JSON.stringify(summaries))
  console.log("[allTabsPrompt] Prompt generated, length:", prompt.length)
  return prompt
}


export async function updateGroupsPrompt(
  tabs: chrome.tabs.Tab[],
  existingGroups: chrome.tabGroups.TabGroup[],
  specialRequirements: string | undefined
): Promise<string> {
  if (tabs.length === 0) {
    throw new Error("tabs is empty")
  }

  const limitedTabs = tabs.slice(0, 100)
  const summaries = await getTabSummaries(limitedTabs, 100, 800)
  const modifiedTabs: Array<{ id: number; title: string; url: string; host: string; path: string; context: string; groupId: number }> = []
  for (const tab of limitedTabs) {
    if (tab.title == null || tab.id == null || tab.url == null || tab.groupId == null) {
      continue
    }
    const summary = summaries.find((s) => s.id === tab.id)
    modifiedTabs.push({
      id: tab.id,
      title: tab.title,
      url: tab.url,
      host: summary?.host ?? "",
      path: summary?.path ?? "",
      context: summary?.context ?? "",
      groupId: tab.groupId
    })
  }

  const limitedGroups = existingGroups.slice(0, 100)
  const modifiedGroups: Array<{ id: number; title: string | undefined }> = []
  for (const group of limitedGroups) {
     modifiedGroups.push({
      id: group.id,
      title: group.title
    })
  }

  const promptConfig = await getPromptConfig()
  const base = promptConfig.updateGroupsTemplate
  const prompt = base
    .replace("{specialRequirements}", specialRequirements ?? "No special requirements")
    .replace("{tabsJson}", JSON.stringify(modifiedTabs))
    .replace("{groupsJson}", JSON.stringify(modifiedGroups))
  return prompt
}
