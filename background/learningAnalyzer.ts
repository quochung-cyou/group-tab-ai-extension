import { getProvider } from "~background/providers"
import type { LearningEvent, GeneratedInsight, PromptRevision } from "~storage/learningSystem"
import { getLearningSystemData, setLearningSystemData } from "~storage/learningSystem"
import { getPromptConfig } from "~storage/promptConfig"

async function loadPromptTemplate(filename: string): Promise<string> {
  const url = chrome.runtime.getURL(`background/prompts/${filename}`)
  const response = await fetch(url)
  return await response.text()
}

interface InsightAnalysisResult {
  insights: Array<{
    preferenceText: string
    confidence: number
    category: "domain_preference" | "topic_preference" | "workflow_pattern" | "anti_pattern"
    evidenceIds: string[]
    reasoning: string
  }>
}

interface PromptRevisionResult {
  revisedPrompt: string
  changes: string[]
  reasoning: string
}

async function getInsightAnalysisPrompt(eventsJson: string, existingInsightsJson: string): Promise<string> {
  const template = await loadPromptTemplate("insightAnalysis.txt")
  return template
    .replace("{eventsJson}", eventsJson)
    .replace("{existingInsightsJson}", existingInsightsJson)
}

async function getPromptRevisionPrompt(currentPrompt: string, insightsJson: string): Promise<string> {
  const template = await loadPromptTemplate("promptRevision.txt")
  return template
    .replace("{currentPrompt}", currentPrompt)
    .replace("{insightsJson}", insightsJson)
}

const OLD_INSIGHT_ANALYSIS_PROMPT = `You are an expert at analyzing user behavior patterns to understand their preferences for browser tab organization.

# YOUR TASK
Analyze the provided user actions and identify meaningful patterns that reveal their organizational preferences.

# INPUT DATA
You will receive a list of events showing:
- AI-suggested groupings (what the AI decided)
- Manual user corrections (when user moved tabs after AI grouping)
- Tab information (title, URL, domain)
- Group names involved

# ANALYSIS GUIDELINES

## What to Look For:
1. **Contradictions**: AI grouped tabs one way, user consistently moves them elsewhere
2. **Repetitive Patterns**: User performs same action 3+ times (strong signal)
3. **Domain Preferences**: Specific domains always go to specific groups
4. **Topic Clustering**: User groups by topic/project rather than domain
5. **Anti-Patterns**: What user actively avoids or breaks apart

## Confidence Scoring:
- 0.9-1.0: 5+ consistent actions, no contradictions
- 0.7-0.89: 3-4 consistent actions, minimal contradictions
- 0.5-0.69: 2-3 actions, some contradictions (don't report these)
- <0.5: Insufficient evidence (ignore)

## Categories:
- **domain_preference**: Specific domains → specific groups (e.g., "github.com always in Development")
- **topic_preference**: Content-based grouping (e.g., "AI/ML articles together")
- **workflow_pattern**: Work habits (e.g., "separates research from implementation")
- **anti_pattern**: What to avoid (e.g., "never groups social media with work")

# OUTPUT FORMAT
Return ONLY valid JSON:
{
  "insights": [
    {
      "preferenceText": "Clear, actionable statement about user preference",
      "confidence": 0.85,
      "category": "domain_preference",
      "evidenceIds": ["evt_123", "evt_456"],
      "reasoning": "Brief explanation of why this pattern was identified"
    }
  ]
}

# RULES
- Minimum confidence 0.7 to report
- Minimum 3 supporting events
- Be specific: mention actual domains, group names, topics
- Use natural language that can guide future AI decisions
- If no strong patterns found, return empty insights array

# EVENTS TO ANALYZE
{eventsJson}

# EXISTING ACCEPTED INSIGHTS (avoid duplicates)
{existingInsightsJson}

Analyze and return insights:`

const PROMPT_REVISION_PROMPT = `You are an expert prompt engineer specializing in browser tab organization systems.

# YOUR TASK
Revise the current AI prompt to incorporate newly discovered user preferences while maintaining its core structure and effectiveness.

# CURRENT PROMPT
{currentPrompt}

# USER PREFERENCES TO INCORPORATE
{insightsJson}

# REVISION GUIDELINES

## What to Do:
1. **Preserve Structure**: Keep the existing format, sections, and instructions
2. **Add Preferences**: Integrate user preferences into relevant sections
3. **Be Specific**: Use exact domains, group names, and patterns from insights
4. **Maintain Balance**: Don't let preferences override core grouping logic
5. **Natural Integration**: Preferences should feel like part of original prompt

## Where to Add Preferences:
- In "GROUPING STRATEGY" section as additional priority rules
- In "SPECIAL USER REQUIREMENTS" section
- As specific examples in relevant sections

## What NOT to Do:
- Don't remove existing instructions
- Don't make prompt significantly longer (max 20% increase)
- Don't create contradictions with existing rules
- Don't use vague language

# OUTPUT FORMAT
Return ONLY valid JSON:
{
  "revisedPrompt": "The complete revised prompt text",
  "changes": [
    "Added preference: GitHub/GitLab domains to Development group",
    "Updated grouping priority to favor user's workflow patterns"
  ],
  "reasoning": "Brief explanation of how preferences were integrated"
}

# RULES
- Revised prompt must be immediately usable
- All user preferences must be incorporated
- Changes list should be clear and specific
- Reasoning should explain the integration strategy

Generate the revised prompt:`

export async function analyzeUserBehavior(): Promise<GeneratedInsight[]> {
  const data = await getLearningSystemData()
  
  if (data.events.length < 10) {
    throw new Error("Insufficient events for analysis. Need at least 10 events.")
  }
  
  const recentEvents = data.events.slice(-100)
  const existingInsights = data.insights.filter(i => i.status === "accepted")
  
  const eventsForAnalysis = recentEvents.map(e => ({
    id: e.id,
    timestamp: e.timestamp,
    type: e.type,
    tab: {
      title: e.tabInfo.title,
      domain: e.tabInfo.domain,
      url: e.tabInfo.url
    },
    action: {
      from: e.action.fromGroup,
      to: e.action.toGroup,
      wasAISuggested: e.action.aiSuggested
    }
  }))
  
  const existingInsightsForPrompt = existingInsights.map(i => ({
    text: i.preferenceText,
    category: i.category
  }))
  
  const prompt = await getInsightAnalysisPrompt(
    JSON.stringify(eventsForAnalysis, null, 2),
    JSON.stringify(existingInsightsForPrompt, null, 2)
  )
  
  console.log("[Learning] Analyzing user behavior...")
  
  const provider = await getProvider()
  const response = await provider.generate(prompt)
  
  let result: InsightAnalysisResult
  try {
    result = JSON.parse(response)
  } catch (e) {
    console.error("[Learning] Failed to parse analysis result:", response)
    throw new Error("Failed to parse AI analysis response")
  }
  
  const newInsights: GeneratedInsight[] = result.insights.map(insight => ({
    id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    generatedAt: Date.now(),
    status: "pending" as const,
    confidence: insight.confidence,
    preferenceText: insight.preferenceText,
    category: insight.category,
    evidenceIds: insight.evidenceIds,
    reasoning: insight.reasoning
  }))
  
  data.insights.push(...newInsights)
  data.lastAnalysisTimestamp = Date.now()
  data.eventCountSinceLastAnalysis = 0
  
  await setLearningSystemData(data)
  
  console.log(`[Learning] Generated ${newInsights.length} new insights`)
  
  return newInsights
}

export async function generatePromptRevision(): Promise<PromptRevision> {
  const data = await getLearningSystemData()
  const acceptedInsights = data.insights.filter(i => i.status === "accepted")
  
  if (acceptedInsights.length === 0) {
    throw new Error("No accepted insights to incorporate into prompt")
  }
  
  const promptConfig = await getPromptConfig()
  const currentPrompt = promptConfig.allTabsTemplate
  
  const insightsForPrompt = acceptedInsights.map(i => ({
    preference: i.preferenceText,
    confidence: i.confidence,
    category: i.category,
    reasoning: i.reasoning
  }))
  
  const prompt = await getPromptRevisionPrompt(
    currentPrompt,
    JSON.stringify(insightsForPrompt, null, 2)
  )
  
  console.log("[Learning] Generating prompt revision...")
  
  const provider = await getProvider()
  const response = await provider.generate(prompt)
  
  let result: PromptRevisionResult
  try {
    result = JSON.parse(response)
  } catch (e) {
    console.error("[Learning] Failed to parse revision result:", response)
    throw new Error("Failed to parse AI revision response")
  }
  
  const revision: PromptRevision = {
    id: `revision_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    generatedAt: Date.now(),
    status: "pending",
    currentPrompt,
    revisedPrompt: result.revisedPrompt,
    changes: result.changes,
    reasoning: result.reasoning,
    basedOnInsights: acceptedInsights.map(i => i.id)
  }
  
  data.promptRevisions.push(revision)
  await setLearningSystemData(data)
  
  console.log("[Learning] Generated prompt revision")
  
  return revision
}

export async function getEventsForReview(limit: number = 50): Promise<LearningEvent[]> {
  const data = await getLearningSystemData()
  return data.events.slice(-limit)
}
