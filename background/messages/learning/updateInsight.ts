import type { PlasmoMessaging } from "@plasmohq/messaging"
import { updateInsightStatus } from "~storage/learningSystem"

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  try {
    const { insightId, status } = req.body as { insightId: string; status: "accepted" | "rejected" }
    await updateInsightStatus(insightId, status)
    res.send({ success: true })
  } catch (e) {
    res.send({ success: false, error: e instanceof Error ? e.message : "Unknown error" })
  }
}

export default handler
