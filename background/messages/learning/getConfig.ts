import type { PlasmoMessaging } from "@plasmohq/messaging"
import { getLearningConfig } from "~storage/learningSystem"

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  try {
    const config = await getLearningConfig()
    res.send(config)
  } catch (e) {
    res.send({ error: e instanceof Error ? e.message : "Unknown error" })
  }
}

export default handler
