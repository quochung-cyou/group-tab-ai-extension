import type { PlasmoMessaging } from "@plasmohq/messaging"

import { groupAllTabs } from "~background/command/groupAllTabs"

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  console.log("[Message Handler] groupAllTabs message received", req.body)
  try {
    console.log("[Message Handler] Calling groupAllTabs function")
    const ok = await groupAllTabs(req.body.windowId)
    console.log("[Message Handler] groupAllTabs returned:", ok)
    res.send({ success: ok })
  } catch (e) {
    console.error("[Message Handler] Error in groupAllTabs:", e)
    const message = e instanceof Error ? e.message : "Unknown error"
    res.send({ success: false, error: message })
  }
}

export default handler
