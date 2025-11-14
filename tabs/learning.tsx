import type { ReactElement } from "react"
import { useState, useEffect } from "react"
import { Brain, TrendingUp, Check, X, Clock, AlertCircle } from "tabler-icons-react"

import { sendToBackground } from "@plasmohq/messaging"

import type { GeneratedInsight, PromptRevision, LearningConfig } from "~storage/learningSystem"

interface AnalysisStatus {
  ready: boolean
  eventCount: number
  daysSinceLastAnalysis: number
  minEventsNeeded: number
}

function LearningPage(): ReactElement {
  const [pendingInsights, setPendingInsights] = useState<GeneratedInsight[]>([])
  const [pendingRevisions, setPendingRevisions] = useState<PromptRevision[]>([])
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isGeneratingRevision, setIsGeneratingRevision] = useState(false)
  const [config, setConfig] = useState<LearningConfig | null>(null)
  const [selectedRevision, setSelectedRevision] = useState<PromptRevision | null>(null)

  useEffect(() => {
    void loadData()
  }, [])

  const loadData = async (): Promise<void> => {
    const insights = await sendToBackground({ name: "learning/getPendingInsights" }) as GeneratedInsight[]
    const revisions = await sendToBackground({ name: "learning/getPendingRevisions" }) as PromptRevision[]
    const status = await sendToBackground({ name: "learning/getAnalysisStatus" }) as AnalysisStatus
    const learningConfig = await sendToBackground({ name: "learning/getConfig" }) as LearningConfig
    
    setPendingInsights(insights)
    setPendingRevisions(revisions)
    setAnalysisStatus(status)
    setConfig(learningConfig)
  }

  const handleAnalyze = async (): Promise<void> => {
    setIsAnalyzing(true)
    try {
      await sendToBackground({ name: "learning/analyze" })
      await loadData()
    } catch (e) {
      alert(e instanceof Error ? e.message : "Analysis failed")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleGenerateRevision = async (): Promise<void> => {
    setIsGeneratingRevision(true)
    try {
      await sendToBackground({ name: "learning/generateRevision" })
      await loadData()
    } catch (e) {
      alert(e instanceof Error ? e.message : "Revision generation failed")
    } finally {
      setIsGeneratingRevision(false)
    }
  }

  const handleInsightAction = async (insightId: string, status: "accepted" | "rejected"): Promise<void> => {
    await sendToBackground({ 
      name: "learning/updateInsight",
      body: { insightId, status }
    })
    await loadData()
  }

  const handleRevisionAction = async (revisionId: string, status: "accepted" | "rejected"): Promise<void> => {
    await sendToBackground({
      name: "learning/updateRevision",
      body: { revisionId, status }
    })
    await loadData()
    setSelectedRevision(null)
  }

  const handleConfigUpdate = async (updates: Partial<LearningConfig>): Promise<void> => {
    await sendToBackground({
      name: "learning/updateConfig",
      body: updates
    })
    await loadData()
  }

  return (
    <div style={{ minHeight: "100vh", padding: "32px 20px", background: "#020617", color: "#f9fafb", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
          <Brain size={32} color="#3b82f6" />
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 600, margin: 0 }}>Learning System</h1>
            <p style={{ fontSize: 14, color: "#9ca3af", margin: "4px 0 0 0" }}>
              AI learns from your tab organization patterns to improve grouping over time
            </p>
          </div>
        </div>

        {analysisStatus !== null && (
          <div style={{ padding: 20, borderRadius: 12, border: "1px solid #1f2937", background: "#111827", marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 8px 0" }}>Analysis Status</h2>
                <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>
                  {analysisStatus.eventCount} events tracked • {analysisStatus.daysSinceLastAnalysis.toFixed(0)} days since last analysis
                </p>
              </div>
              <button
                onClick={() => { void handleAnalyze() }}
                disabled={!analysisStatus.ready || isAnalyzing}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "none",
                  background: analysisStatus.ready && !isAnalyzing ? "#3b82f6" : "#374151",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: analysisStatus.ready && !isAnalyzing ? "pointer" : "not-allowed",
                  opacity: analysisStatus.ready && !isAnalyzing ? 1 : 0.6
                }}
              >
                {isAnalyzing ? "Analyzing..." : "Analyze Behavior"}
              </button>
            </div>
            {!analysisStatus.ready && (
              <div style={{ padding: 12, borderRadius: 8, background: "#1f2937", display: "flex", gap: 8, alignItems: "center" }}>
                <AlertCircle size={16} color="#f59e0b" />
                <span style={{ fontSize: 12, color: "#f59e0b" }}>
                  Need at least {analysisStatus.minEventsNeeded} events to analyze (currently {analysisStatus.eventCount})
                </span>
              </div>
            )}
          </div>
        )}

        {pendingInsights.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Pending Insights ({pendingInsights.length})</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {pendingInsights.map(insight => (
                <div key={insight.id} style={{ padding: 16, borderRadius: 12, border: "1px solid #1f2937", background: "#111827" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{insight.preferenceText}</div>
                      <div style={{ fontSize: 12, color: "#9ca3af" }}>
                        Confidence: {(insight.confidence * 100).toFixed(0)}% • {insight.category.replace("_", " ")}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => { void handleInsightAction(insight.id, "accepted") }}
                        style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #10b981", background: "transparent", color: "#10b981", fontSize: 12, cursor: "pointer" }}
                      >
                        <Check size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />
                        Accept
                      </button>
                      <button
                        onClick={() => { void handleInsightAction(insight.id, "rejected") }}
                        style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #ef4444", background: "transparent", color: "#ef4444", fontSize: 12, cursor: "pointer" }}
                      >
                        <X size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />
                        Reject
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280", padding: 12, borderRadius: 6, background: "#1f2937" }}>
                    {insight.reasoning}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {pendingInsights.filter(i => i.status === "accepted").length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Generate Prompt Revision</h2>
              <button
                onClick={() => { void handleGenerateRevision() }}
                disabled={isGeneratingRevision}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "none",
                  background: isGeneratingRevision ? "#374151" : "#8b5cf6",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: isGeneratingRevision ? "not-allowed" : "pointer"
                }}
              >
                {isGeneratingRevision ? "Generating..." : "Generate Revision"}
              </button>
            </div>
            <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 16 }}>
              Create a new prompt that incorporates your accepted preferences
            </p>
          </div>
        )}

        {pendingRevisions.length > 0 && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Pending Prompt Revisions ({pendingRevisions.length})</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {pendingRevisions.map(revision => (
                <div key={revision.id} style={{ padding: 16, borderRadius: 12, border: "1px solid #1f2937", background: "#111827" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Prompt Revision</div>
                      <div style={{ fontSize: 12, color: "#9ca3af" }}>
                        Generated {new Date(revision.generatedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={() => { setSelectedRevision(selectedRevision?.id === revision.id ? null : revision) }}
                      style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #3b82f6", background: "transparent", color: "#3b82f6", fontSize: 12, cursor: "pointer" }}
                    >
                      {selectedRevision?.id === revision.id ? "Hide" : "View Comparison"}
                    </button>
                  </div>
                  
                  <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>Changes:</div>
                  <ul style={{ fontSize: 12, color: "#e5e7eb", margin: "0 0 12px 0", paddingLeft: 20 }}>
                    {revision.changes.map((change, idx) => (
                      <li key={idx}>{change}</li>
                    ))}
                  </ul>
                  
                  {selectedRevision?.id === revision.id && (
                    <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: "#1f2937" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: "#9ca3af" }}>Current Prompt</div>
                          <pre style={{ fontSize: 11, color: "#e5e7eb", whiteSpace: "pre-wrap", margin: 0, maxHeight: 300, overflow: "auto" }}>
                            {revision.currentPrompt.substring(0, 500)}...
                          </pre>
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: "#10b981" }}>Revised Prompt</div>
                          <pre style={{ fontSize: 11, color: "#e5e7eb", whiteSpace: "pre-wrap", margin: 0, maxHeight: 300, overflow: "auto" }}>
                            {revision.revisedPrompt.substring(0, 500)}...
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button
                      onClick={() => { void handleRevisionAction(revision.id, "accepted") }}
                      style={{ flex: 1, padding: "8px", borderRadius: 6, border: "none", background: "#10b981", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                    >
                      Accept & Use This Prompt
                    </button>
                    <button
                      onClick={() => { void handleRevisionAction(revision.id, "rejected") }}
                      style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #ef4444", background: "transparent", color: "#ef4444", fontSize: 13, cursor: "pointer" }}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {config !== null && (
          <div style={{ marginTop: 32, padding: 20, borderRadius: 12, border: "1px solid #1f2937", background: "#111827" }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Learning Configuration</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => { void handleConfigUpdate({ enabled: e.target.checked }) }}
                />
                <span style={{ fontSize: 14 }}>Enable learning system</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={config.autoAnalyzeEnabled}
                  onChange={(e) => { void handleConfigUpdate({ autoAnalyzeEnabled: e.target.checked }) }}
                  disabled={!config.enabled}
                />
                <span style={{ fontSize: 14 }}>Auto-analyze behavior (notify when ready)</span>
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ fontSize: 12, color: "#9ca3af", display: "block", marginBottom: 4 }}>
                    Analyze after N actions
                  </label>
                  <input
                    type="number"
                    value={config.analyzeAfterEveryNActions}
                    onChange={(e) => { void handleConfigUpdate({ analyzeAfterEveryNActions: parseInt(e.target.value) }) }}
                    disabled={!config.enabled}
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #374151", background: "#1f2937", color: "#fff", fontSize: 13 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "#9ca3af", display: "block", marginBottom: 4 }}>
                    Analyze interval (days)
                  </label>
                  <input
                    type="number"
                    value={config.analyzeIntervalDays}
                    onChange={(e) => { void handleConfigUpdate({ analyzeIntervalDays: parseInt(e.target.value) }) }}
                    disabled={!config.enabled}
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #374151", background: "#1f2937", color: "#fff", fontSize: 13 }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default LearningPage
