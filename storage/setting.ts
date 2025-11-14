import { Storage } from "@plasmohq/storage"

const storage = new Storage({
  area: "local"
})

export interface Settings {
  showName: boolean
  specialRequirements: string
  keepMiscTab: boolean
  keepExistingGroups: boolean
}

export const defaultSettings: Settings = {
  showName: true,
  specialRequirements: "",
  keepMiscTab: false,
  keepExistingGroups: false
}

export async function getSettings(): Promise<Settings> {
  const settings = await storage.get<Settings>("settings")
  if (settings === undefined) {
    console.log("settings not found, use default settings")
    void setSettings(defaultSettings)
    return defaultSettings
  }
  return settings
}

export async function setSettings(settings: Settings): Promise<void> {
  await storage.set("settings", settings)
}
