import type { PlasmoMessaging } from "@plasmohq/messaging"
import { getPendingPromptRevisions } from "~storage/learningSystem"

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  try {
    const revisions = await getPendingPromptRevisions()
    res.send(revisions)
  } catch (e) {
    res.send({ error: e instanceof Error ? e.message : "Unknown error" })
  }
}

export default handler
