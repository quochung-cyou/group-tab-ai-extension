import type { ReactElement, ChangeEvent } from "react"
import { useState, useEffect } from "react"

import type { UserPromptCustomizations } from "~storage/promptConfig"
import { getUserCustomizations, setUserCustomizations } from "~storage/promptConfig"

function PromptEditor(): ReactElement {
  const [customizations, setCustomizations] = useState<UserPromptCustomizations>({
    allTabsCustomInstructions: "",
    updateGroupsCustomInstructions: ""
  })
  
  useEffect(() => {
    void (async () => {
      const loaded = await getUserCustomizations()
      setCustomizations(loaded)
    })()
  }, [])
  
  const handleSaveCustomizations = async (newCustomizations: UserPromptCustomizations): Promise<void> => {
    await setUserCustomizations(newCustomizations)
    setCustomizations(newCustomizations)
  }

  const handleChangeAllTabs = (e: ChangeEvent<HTMLTextAreaElement>): void => {
    void handleSaveCustomizations({
      ...customizations,
      allTabsCustomInstructions: e.target.value
    })
  }

  const handleChangeUpdateGroups = (e: ChangeEvent<HTMLTextAreaElement>): void => {
    void handleSaveCustomizations({
      ...customizations,
      updateGroupsCustomInstructions: e.target.value
    })
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        padding: 24,
        gap: 24,
        background: "#050816",
        color: "#f9fafb",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif"
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 820,
          display: "flex",
          flexDirection: "column",
          gap: 8
        }}
      >
        <h1
          style={{
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: 0.4
          }}
        >
          Prompt customization
        </h1>
        <p
          style={{
            fontSize: 13,
            lineHeight: 1.6,
            color: "#9ca3af"
          }}
        >
          Add your own custom instructions to enhance the AI's behavior. These will be
          appended to the base prompts, which are automatically updated with each extension release.
          Your customizations are preserved across updates.
        </p>
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: 820,
          display: "flex",
          flexDirection: "column",
          gap: 16
        }}
      >
        <div
          style={{
            borderRadius: 16,
            border: "1px solid #111827",
            background:
              "radial-gradient(circle at top, rgba(55,65,81,0.3), transparent 60%), #020617",
            padding: 18,
            display: "flex",
            flexDirection: "column",
            gap: 8
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 2
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  letterSpacing: 0.3
                }}
              >
                All tabs prompt - Custom instructions
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: "#9ca3af"
                }}
              >
                Add custom requirements for organizing all tabs from scratch (optional).
              </span>
            </div>
          </div>
          <textarea
            style={{
              marginTop: 10,
              width: "100%",
              minHeight: 180,
              resize: "vertical",
              background: "#020617",
              borderRadius: 12,
              border: "1px solid #111827",
              padding: 10,
              fontSize: 12,
              color: "#e5e7eb",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas"
            }}
            placeholder="e.g., Always group tabs by project name, prefer specific technical terms, keep work and personal separate..."
            value={customizations.allTabsCustomInstructions}
            onChange={handleChangeAllTabs}
          />
        </div>

        <div
          style={{
            borderRadius: 16,
            border: "1px solid #111827",
            background:
              "radial-gradient(circle at top, rgba(55,65,81,0.3), transparent 60%), #020617",
            padding: 18,
            display: "flex",
            flexDirection: "column",
            gap: 8
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 2
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  letterSpacing: 0.3
                }}
              >
                Update groups prompt - Custom instructions
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: "#9ca3af"
                }}
              >
                Add custom requirements for refining existing groups (optional).
              </span>
            </div>
          </div>
          <textarea
            style={{
              marginTop: 10,
              width: "100%",
              minHeight: 180,
              resize: "vertical",
              background: "#020617",
              borderRadius: 12,
              border: "1px solid #111827",
              padding: 10,
              fontSize: 12,
              color: "#e5e7eb",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas"
            }}
            placeholder="e.g., Preserve my existing group names when possible, be more aggressive with merging similar groups..."
            value={customizations.updateGroupsCustomInstructions}
            onChange={handleChangeUpdateGroups}
          />
        </div>
      </div>
    </div>
  )
}

export default PromptEditor
