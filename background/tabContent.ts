type TabSummary = {
  id: number
  title: string
  url: string
  host: string
  path: string
  context: string
  description?: string
  keywords?: string
  ogType?: string
}

function buildSummaryFromDom(maxLength: number): { context: string; description?: string; keywords?: string; ogType?: string } {
  const pieces: string[] = []
  const title = document.title ?? ""
  if (title.length > 0) pieces.push(`title: ${title}`)
  
  const metaDesc = document.querySelector('meta[name="description"]') as HTMLMetaElement | null
  const description = metaDesc?.content ?? ""
  if (description.length > 0) pieces.push(`description: ${description}`)
  
  const ogDesc = document.querySelector('meta[property="og:description"]') as HTMLMetaElement | null
  if (ogDesc?.content !== undefined && description.length === 0) pieces.push(`description: ${ogDesc.content}`)
  
  const metaKeywords = document.querySelector('meta[name="keywords"]') as HTMLMetaElement | null
  const keywords = metaKeywords?.content ?? ""
  
  const ogType = (document.querySelector('meta[property="og:type"]') as HTMLMetaElement | null)?.content ?? ""
  
  const h1 = document.querySelector("h1")
  if (h1?.textContent !== null && h1?.textContent !== undefined) pieces.push(`h1: ${h1.textContent.trim()}`)
  
  const h2Elements = document.querySelectorAll("h2")
  const h2Texts: string[] = []
  h2Elements.forEach((h2, idx) => {
    if (idx < 3 && h2.textContent !== null && h2.textContent !== undefined) h2Texts.push(h2.textContent.trim())
  })
  if (h2Texts.length > 0) pieces.push(`h2: ${h2Texts.join(", ")}`)
  
  const articleContent = document.querySelector("article, main, [role='main']")
  const contentRoot = articleContent ?? document.body ?? document.documentElement
  
  let bodyText = ""
  const walker = document.createTreeWalker(contentRoot, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentElement
      if (!parent) return NodeFilter.FILTER_REJECT
      const tagName = parent.tagName.toLowerCase()
      if (["script", "style", "noscript", "iframe"].includes(tagName)) {
        return NodeFilter.FILTER_REJECT
      }
      return NodeFilter.FILTER_ACCEPT
    }
  })
  
  while (walker.nextNode() && bodyText.length < maxLength * 2) {
    const node = walker.currentNode as Text
    const text = node.textContent?.trim()
    if (text === undefined || text.length < 15) continue
    bodyText += (bodyText.length > 0 ? " " : "") + text
    if (bodyText.length >= maxLength * 2) break
  }
  
  if (bodyText.length > 0) pieces.push(`content: ${bodyText}`)
  
  let joined = pieces.join(" | ")
  if (joined.length > maxLength) joined = joined.slice(0, maxLength)
  
  return {
    context: joined,
    description: description.length > 0 ? description : undefined,
    keywords: keywords.length > 0 ? keywords : undefined,
    ogType: ogType.length > 0 ? ogType : undefined
  }
}

export async function getTabSummaries(tabs: chrome.tabs.Tab[], maxTabs: number = 40, maxContextLength: number = 800): Promise<TabSummary[]> {
  console.log("[getTabSummaries] Starting with", tabs.length, "tabs, max:", maxTabs)
  const limited = tabs.slice(0, maxTabs)
  const results: TabSummary[] = []
  console.log("[getTabSummaries] Creating promises for", limited.length, "tabs")
  const promises = limited.map(async (tab, index) => {
    console.log("[getTabSummaries] Processing tab", index, ":", tab.title)
    if (tab.id == null || tab.url == null || tab.title == null) return
    let host = ""
    let path = ""
    try {
      const u = new URL(tab.url)
      host = u.host
      path = u.pathname
    } catch {
      host = ""
      path = ""
    }
    let context = ""
    let description: string | undefined
    let keywords: string | undefined
    let ogType: string | undefined
    
    try {
      console.log("[getTabSummaries] Executing script on tab", index, tab.id)
      
      // Add timeout to prevent hanging
      const scriptPromise = chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: buildSummaryFromDom,
        args: [maxContextLength]
      })
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Script execution timeout")), 5000)
      )
      
      const [res] = await Promise.race([scriptPromise, timeoutPromise]) as any
      console.log("[getTabSummaries] Script executed on tab", index)
      const value = (res as { result: unknown } | undefined)?.result
      if (value && typeof value === "object") {
        const summary = value as { context: string; description?: string; keywords?: string; ogType?: string }
        context = summary.context || ""
        description = summary.description
        keywords = summary.keywords
        ogType = summary.ogType
      }
    } catch (e) {
      console.log("[getTabSummaries] Failed to execute script on tab", index, ":", e)
      context = ""
    }
    
    results.push({ id: tab.id, title: tab.title, url: tab.url, host, path, context, description, keywords, ogType })
  })
  console.log("[getTabSummaries] Waiting for all promises...")
  await Promise.all(promises)
  console.log("[getTabSummaries] All promises resolved, returning", results.length, "results")
  return results
}
