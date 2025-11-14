import type { PlasmoMessaging } from "@plasmohq/messaging"
import { getAnalysisReadyStatus } from "~storage/learningSystem"

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  try {
    const status = await getAnalysisReadyStatus()
    res.send(status)
  } catch (e) {
    res.send({ error: e instanceof Error ? e.message : "Unknown error" })
  }
}

export default handler
