import type { PlasmoMessaging } from "@plasmohq/messaging"
import { generatePromptRevision } from "~background/learningAnalyzer"

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  try {
    const revision = await generatePromptRevision()
    res.send({ success: true, revisionId: revision.id })
  } catch (e) {
    res.send({ success: false, error: e instanceof Error ? e.message : "Unknown error" })
  }
}

export default handler
