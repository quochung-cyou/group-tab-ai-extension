import { Storage } from "@plasmohq/storage"

const storage = new Storage({
  area: "local"
})

export interface TabGroupingEvent {
  timestamp: number
  tabId: number
  tabTitle: string
  tabUrl: string
  groupName: string
  groupId: number
  source: "ai" | "manual"
}

export interface TabMoveEvent {
  timestamp: number
  tabId: number
  tabTitle: string
  tabUrl: string
  fromGroupName: string | null
  toGroupName: string | null
  fromGroupId: number
  toGroupId: number
  source: "ai" | "manual"
}

export interface UserLearningData {
  groupingHistory: TabGroupingEvent[]
  moveHistory: TabMoveEvent[]
  preferences: {
    commonDomainGroups: Record<string, string>
    manualOverrides: Array<{
      pattern: string
      preferredGroup: string
    }>
  }
}

const defaultUserLearningData: UserLearningData = {
  groupingHistory: [],
  moveHistory: [],
  preferences: {
    commonDomainGroups: {},
    manualOverrides: []
  }
}

export async function getUserLearningData(): Promise<UserLearningData> {
  const data = await storage.get<UserLearningData>("userLearningData")
  if (data === undefined) {
    await setUserLearningData(defaultUserLearningData)
    return defaultUserLearningData
  }
  return data
}

export async function setUserLearningData(data: UserLearningData): Promise<void> {
  await storage.set("userLearningData", data)
}

export async function recordGroupingEvent(event: TabGroupingEvent): Promise<void> {
  const data = await getUserLearningData()
  data.groupingHistory.push(event)
  if (data.groupingHistory.length > 1000) {
    data.groupingHistory = data.groupingHistory.slice(-1000)
  }
  await setUserLearningData(data)
}

export async function recordMoveEvent(event: TabMoveEvent): Promise<void> {
  const data = await getUserLearningData()
  data.moveHistory.push(event)
  if (data.moveHistory.length > 500) {
    data.moveHistory = data.moveHistory.slice(-500)
  }
  
  try {
    const url = new URL(event.tabUrl)
    const domain = url.hostname
    
    if (event.toGroupName !== null && event.source === "manual") {
      const existingCount = data.moveHistory.filter(
        m => m.tabUrl.includes(domain) && m.toGroupName === event.toGroupName
      ).length
      
      if (existingCount >= 3) {
        data.preferences.commonDomainGroups[domain] = event.toGroupName
      }
    }
  } catch {}
  
  await setUserLearningData(data)
}

export async function generateLearningInsights(): Promise<string> {
  const data = await getUserLearningData()
  
  if (data.moveHistory.length < 5 && data.groupingHistory.length < 10) {
    return ""
  }
  
  const insights: string[] = []
  
  const recentMoves = data.moveHistory.slice(-50)
  const manualMoves = recentMoves.filter(m => m.source === "manual")
  
  if (manualMoves.length > 0) {
    insights.push("## User Manual Adjustments Detected")
    
    const movePatterns: Record<string, { from: string | null; to: string | null; count: number }> = {}
    manualMoves.forEach(move => {
      const fromName = move.fromGroupName ?? "Ungrouped"
      const toName = move.toGroupName ?? "Ungrouped"
      const key = `${fromName}->${toName}`
      if (movePatterns[key] === undefined) {
        movePatterns[key] = { from: move.fromGroupName, to: move.toGroupName, count: 0 }
      }
      movePatterns[key].count++
    })
    
    const significantPatterns = Object.values(movePatterns).filter(p => p.count >= 2)
    if (significantPatterns.length > 0) {
      insights.push("User frequently moves tabs:")
      significantPatterns.forEach(p => {
        const fromLabel = p.from ?? "Ungrouped"
        const toLabel = p.to ?? "Ungrouped"
        insights.push(`- From "${fromLabel}" to "${toLabel}" (${p.count} times)`)
      })
    }
  }
  
  if (Object.keys(data.preferences.commonDomainGroups).length > 0) {
    insights.push("\n## Learned Domain Preferences")
    Object.entries(data.preferences.commonDomainGroups).forEach(([domain, group]) => {
      insights.push(`- ${domain} → "${group}"`)
    })
  }
  
  if (data.preferences.manualOverrides.length > 0) {
    insights.push("\n## Manual Override Rules")
    data.preferences.manualOverrides.forEach(override => {
      insights.push(`- Pattern: "${override.pattern}" → "${override.preferredGroup}"`)
    })
  }
  
  return insights.join("\n")
}

export async function clearUserLearningData(): Promise<void> {
  await setUserLearningData(defaultUserLearningData)
}
