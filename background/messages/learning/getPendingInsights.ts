import type { PlasmoMessaging } from "@plasmohq/messaging"
import { getPendingInsights } from "~storage/learningSystem"

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  try {
    const insights = await getPendingInsights()
    res.send(insights)
  } catch (e) {
    res.send({ error: e instanceof Error ? e.message : "Unknown error" })
  }
}

export default handler
