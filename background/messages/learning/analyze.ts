import type { PlasmoMessaging } from "@plasmohq/messaging"
import { analyzeUserBehavior } from "~background/learningAnalyzer"
import { clearLearningBadge } from "~storage/learningSystem"

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  try {
    const insights = await analyzeUserBehavior()
    await clearLearningBadge()
    res.send({ success: true, insightsCount: insights.length })
  } catch (e) {
    res.send({ success: false, error: e instanceof Error ? e.message : "Unknown error" })
  }
}

export default handler
