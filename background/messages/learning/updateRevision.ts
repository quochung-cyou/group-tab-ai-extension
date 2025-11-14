import type { PlasmoMessaging } from "@plasmohq/messaging"
import { updatePromptRevisionStatus } from "~storage/learningSystem"

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  try {
    const { revisionId, status } = req.body as { revisionId: string; status: "accepted" | "rejected" }
    await updatePromptRevisionStatus(revisionId, status)
    res.send({ success: true })
  } catch (e) {
    res.send({ success: false, error: e instanceof Error ? e.message : "Unknown error" })
  }
}

export default handler
