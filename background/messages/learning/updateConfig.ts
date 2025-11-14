import type { PlasmoMessaging } from "@plasmohq/messaging"
import { updateLearningConfig, type LearningConfig } from "~storage/learningSystem"

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  try {
    const updates = req.body as Partial<LearningConfig>
    await updateLearningConfig(updates)
    res.send({ success: true })
  } catch (e) {
    res.send({ success: false, error: e instanceof Error ? e.message : "Unknown error" })
  }
}

export default handler
