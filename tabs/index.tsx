import type { ReactElement } from "react"
import { useState, useEffect } from "react"
import { Folders } from "tabler-icons-react"

import { sendToBackground } from "@plasmohq/messaging"

import AutoSaveInput from "~components/autoSaveInput"
import {
  type ProviderConfigs,
  ProviderType,
  defaultProviderConfigs,
  getProviderConfigs,
  setProviderConfigs
} from "~storage/config"
import styles from "./index.module.css"

function IndexPage(): ReactElement {
  const [config, setConfig] = useState<ProviderConfigs>(defaultProviderConfigs)
  
  useEffect(() => {
    void (async () => {
      const loadedConfig = await getProviderConfigs()
      setConfig(loadedConfig)
    })()
  }, [])
  
  const handleSetConfig = async (newConfig: ProviderConfigs): Promise<void> => {
    await setProviderConfigs(newConfig)
    setConfig(newConfig)
  }

  const provider = config?.provider ?? ProviderType.OpenAI
  const openaiConfig = config?.configs[ProviderType.OpenAI] ?? defaultProviderConfigs.configs.openai
  const geminiConfig = config?.configs[ProviderType.Gemini] ?? defaultProviderConfigs.configs.gemini

  return (
    <div className={styles.container}>
      <div className={styles.contentWrapper}>
        <div className={styles.leftColumn}>
          <div className={styles.header}>
            <span className={styles.headerLabel}>
              Welcome
            </span>
            <h1 className={styles.headerTitle}>
              Turn tab chaos into clean project groups.
            </h1>
            <p className={styles.headerDescription}>
              Group Tab AI reads your open tabs and asks OpenAI or Gemini to
              cluster them into small, focused tab groups. Configure your
              provider once, then trigger grouping from the toolbar or a
              keyboard shortcut.
            </p>
          </div>

          <ol className={styles.stepsList}>
            <li>
              <span className={styles.stepTitle}>
                Choose an AI provider.
              </span>
              <span className={styles.stepDescription}>
                Open the extension popup, pick either OpenAI or Gemini, and paste
                in your API key. You can also pick which model you want to use
                for grouping.
              </span>
            </li>
            <li>
              <span className={styles.stepTitle}>
                Get your keys.
              </span>
              <span className={styles.stepDescription}>
                For OpenAI, create a key at
                {" "}
                <a
                  href="https://platform.openai.com/account/api-keys"
                  target="_blank"
                  rel="noreferrer"
                  className={styles.stepLink}
                >
                  platform.openai.com
                </a>
                . For Gemini, create a key at
                {" "}
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className={styles.stepLink}
                >
                  Google AI Studio
                </a>
                .
              </span>
            </li>
            <li>
              <span className={styles.stepTitle}>
                Tune the grouping behaviour.
              </span>
              <span className={styles.stepDescription}>
                In the popup, set your rough requirements and toggle options
                like auto-group, keeping existing groups, and whether to keep a
                Misc group for leftovers.
              </span>
            </li>
            <li>
              <span className={styles.stepTitle}>
                Trigger grouping.
              </span>
              <span className={styles.stepDescription}>
                Click the extension icon and press Group, or go to
                {" "}
                <code className={styles.stepCode}>
                  chrome://extensions/shortcuts
                </code>
                {" "}
                to bind a shortcut. The extension will ask the AI to return a
                final set of groups and apply them.
              </span>
            </li>
            <li>
              <span className={styles.stepTitle}>
                Optional: customise the prompts.
              </span>
              <span className={styles.stepDescription}>
                Open the popup and click &quot;Edit full prompt templates&quot; to adjust
                the instructions the AI sees when it groups your tabs.
              </span>
            </li>
          </ol>
        </div>

        <div className={styles.rightColumn}>
          <div className={styles.providerCard}>
            <div className={styles.providerHeader}>
              <div className={styles.providerInfo}>
                <span className={styles.providerLabel}>
                  Current provider
                </span>
                <span className={styles.providerName}>
                  {provider === ProviderType.OpenAI ? "OpenAI" : "Gemini"}
                </span>
              </div>
            </div>

            {provider === ProviderType.OpenAI && (
              <div className={styles.inputSection}>
                <span className={styles.inputLabel}>
                  OpenAI secret key
                </span>
                <AutoSaveInput
                  value={openaiConfig?.token ?? ""}
                  onChange={(token) => {
                    void handleSetConfig({
                      ...(config ?? defaultProviderConfigs),
                      configs: {
                        ...(config?.configs ?? defaultProviderConfigs.configs),
                        openai: {
                          ...(openaiConfig ?? defaultProviderConfigs.configs.openai),
                          token
                        }
                      }
                    })
                  }}
                />
              </div>
            )}

            {provider === ProviderType.Gemini && (
              <div className={styles.inputSection}>
                <span className={styles.inputLabel}>
                  Gemini API key
                </span>
                <AutoSaveInput
                  value={geminiConfig?.apiKey ?? ""}
                  onChange={(apiKey) => {
                    void handleSetConfig({
                      ...(config ?? defaultProviderConfigs),
                      configs: {
                        ...(config?.configs ?? defaultProviderConfigs.configs),
                        gemini: {
                          ...(geminiConfig ?? defaultProviderConfigs.configs.gemini),
                          apiKey
                        }
                      }
                    })
                  }}
                />
              </div>
            )}

            <button
              onClick={() => {
                void sendToBackground({ name: "groupAllTabs" })
              }}
              className={styles.groupButton}
            >
              <Folders size={16} />
              Group current window now
            </button>
          </div>

          <div className={styles.shortcutsCard}>
            <span className={styles.shortcutsTitle}>
              Shortcuts
            </span>
            <p className={styles.shortcutsParagraph}>
              Open
              {" "}
              <code className={styles.stepCode}>
                chrome://extensions/shortcuts
              </code>
              {" "}
              and bind a key to:
            </p>
            <ul className={styles.shortcutsList}>
              <li>Regroup all tabs</li>
              <li>Ungroup all tabs</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default IndexPage
