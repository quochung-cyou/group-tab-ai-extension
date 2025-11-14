import type { PlasmoMessaging } from "@plasmohq/messaging"

import { mergeTabGroups } from "~background/command/mergeTabGroups"

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const { groupIds, newGroupName } = req.body as { groupIds: number[]; newGroupName: string }
  
  try {
    await mergeTabGroups(groupIds, newGroupName)
    res.send({ success: true })
  } catch (error) {
    console.error("[MergeTabGroups] Error:", error)
    res.send({ 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to merge groups" 
    })
  }
}

export default handler
