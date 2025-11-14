import { Storage } from "@plasmohq/storage"

const storage = new Storage({
  area: "local"
})

export interface LearningEvent {
  id: string
  timestamp: number
  type: "ai_group" | "manual_move" | "manual_ungroup" | "group_rename" | "group_delete"
  tabInfo: {
    id: number
    title: string
    url: string
    domain: string
  }
  action: {
    fromGroup: string | null
    toGroup: string | null
    aiSuggested: boolean
  }
}

export interface GeneratedInsight {
  id: string
  generatedAt: number
  status: "pending" | "accepted" | "rejected"
  confidence: number
  preferenceText: string
  category: "domain_preference" | "topic_preference" | "workflow_pattern" | "anti_pattern"
  evidenceIds: string[]
  reasoning: string
}

export interface PromptRevision {
  id: string
  generatedAt: number
  status: "pending" | "accepted" | "rejected"
  currentPrompt: string
  revisedPrompt: string
  changes: string[]
  reasoning: string
  basedOnInsights: string[]
}

export interface LearningConfig {
  enabled: boolean
  autoAnalyzeEnabled: boolean
  analyzeAfterEveryNActions: number
  analyzeIntervalDays: number
  maxHistoryEvents: number
  maxHistoryDays: number
  minConfidenceThreshold: number
}

export interface LearningSystemData {
  events: LearningEvent[]
  insights: GeneratedInsight[]
  promptRevisions: PromptRevision[]
  config: LearningConfig
  lastAnalysisTimestamp: number
  eventCountSinceLastAnalysis: number
}

const defaultLearningConfig: LearningConfig = {
  enabled: true,
  autoAnalyzeEnabled: false,
  analyzeAfterEveryNActions: 30,
  analyzeIntervalDays: 7,
  maxHistoryEvents: 500,
  maxHistoryDays: 90,
  minConfidenceThreshold: 0.7
}

const defaultLearningSystemData: LearningSystemData = {
  events: [],
  insights: [],
  promptRevisions: [],
  config: defaultLearningConfig,
  lastAnalysisTimestamp: 0,
  eventCountSinceLastAnalysis: 0
}

export async function getLearningSystemData(): Promise<LearningSystemData> {
  const data = await storage.get<LearningSystemData>("learningSystem")
  if (data === undefined) {
    await setLearningSystemData(defaultLearningSystemData)
    return defaultLearningSystemData
  }
  return data
}

export async function setLearningSystemData(data: LearningSystemData): Promise<void> {
  await storage.set("learningSystem", data)
}

export async function recordLearningEvent(event: Omit<LearningEvent, "id">): Promise<void> {
  const data = await getLearningSystemData()
  
  if (!data.config.enabled) return
  
  const newEvent: LearningEvent = {
    ...event,
    id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  data.events.push(newEvent)
  data.eventCountSinceLastAnalysis++
  
  await cleanupOldEvents(data)
  await setLearningSystemData(data)
  
  await checkAnalysisTriggers(data)
}

async function cleanupOldEvents(data: LearningSystemData): Promise<void> {
  const now = Date.now()
  const maxAge = data.config.maxHistoryDays * 24 * 60 * 60 * 1000
  
  data.events = data.events
    .filter(e => now - e.timestamp < maxAge)
    .slice(-data.config.maxHistoryEvents)
  
  const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000)
  data.insights = data.insights.filter(i => 
    i.status === "accepted" || i.generatedAt > thirtyDaysAgo
  )
  
  data.promptRevisions = data.promptRevisions.filter(r =>
    r.status === "accepted" || r.generatedAt > thirtyDaysAgo
  )
}

async function checkAnalysisTriggers(data: LearningSystemData): Promise<void> {
  if (!data.config.autoAnalyzeEnabled) return
  
  const now = Date.now()
  const daysSinceLastAnalysis = (now - data.lastAnalysisTimestamp) / (24 * 60 * 60 * 1000)
  
  const shouldAnalyze = 
    data.eventCountSinceLastAnalysis >= data.config.analyzeAfterEveryNActions ||
    daysSinceLastAnalysis >= data.config.analyzeIntervalDays
  
  if (shouldAnalyze && data.events.length >= 10) {
    await notifyUserAboutPendingAnalysis()
  }
}

async function notifyUserAboutPendingAnalysis(): Promise<void> {
  await chrome.action.setBadgeText({ text: "📊" })
  await chrome.action.setBadgeBackgroundColor({ color: "#3b82f6" })
}

export async function clearLearningBadge(): Promise<void> {
  await chrome.action.setBadgeText({ text: "" })
}

export async function getAcceptedInsights(): Promise<GeneratedInsight[]> {
  const data = await getLearningSystemData()
  return data.insights.filter(i => i.status === "accepted")
}

export async function getActivePromptRevision(): Promise<string | null> {
  const data = await getLearningSystemData()
  const accepted = data.promptRevisions
    .filter(r => r.status === "accepted")
    .sort((a, b) => b.generatedAt - a.generatedAt)
  
  return accepted.length > 0 ? accepted[0].revisedPrompt : null
}

export async function getPendingInsights(): Promise<GeneratedInsight[]> {
  const data = await getLearningSystemData()
  return data.insights.filter(i => i.status === "pending")
}

export async function getPendingPromptRevisions(): Promise<PromptRevision[]> {
  const data = await getLearningSystemData()
  return data.promptRevisions.filter(r => r.status === "pending")
}

export async function updateInsightStatus(
  insightId: string,
  status: "accepted" | "rejected"
): Promise<void> {
  const data = await getLearningSystemData()
  const insight = data.insights.find(i => i.id === insightId)
  if (insight !== undefined) {
    insight.status = status
    await setLearningSystemData(data)
  }
}

export async function updatePromptRevisionStatus(
  revisionId: string,
  status: "accepted" | "rejected"
): Promise<void> {
  const data = await getLearningSystemData()
  const revision = data.promptRevisions.find(r => r.id === revisionId)
  if (revision !== undefined) {
    revision.status = status
    await setLearningSystemData(data)
  }
}

export async function getLearningConfig(): Promise<LearningConfig> {
  const data = await getLearningSystemData()
  return data.config
}

export async function updateLearningConfig(config: Partial<LearningConfig>): Promise<void> {
  const data = await getLearningSystemData()
  data.config = { ...data.config, ...config }
  await setLearningSystemData(data)
}

export async function getAnalysisReadyStatus(): Promise<{
  ready: boolean
  eventCount: number
  daysSinceLastAnalysis: number
  minEventsNeeded: number
}> {
  const data = await getLearningSystemData()
  const now = Date.now()
  const daysSinceLastAnalysis = data.lastAnalysisTimestamp > 0
    ? (now - data.lastAnalysisTimestamp) / (24 * 60 * 60 * 1000)
    : 999
  
  const minEventsNeeded = 10
  const ready = data.events.length >= minEventsNeeded
  
  return {
    ready,
    eventCount: data.events.length,
    daysSinceLastAnalysis,
    minEventsNeeded
  }
}

export async function clearAllLearningData(): Promise<void> {
  await setLearningSystemData(defaultLearningSystemData)
}

export async function exportLearningData(): Promise<string> {
  const data = await getLearningSystemData()
  return JSON.stringify(data, null, 2)
}
