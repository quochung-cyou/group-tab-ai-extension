import { Storage } from "@plasmohq/storage"
import { getOrganizeAllTabsPrompt, getUpdateGroupsPrompt } from "./promptLoader"

const storage = new Storage({
  area: "local"
})

/**
 * User customizations that get appended to base prompts
 * This allows extension prompt updates while preserving user preferences
 */
export interface UserPromptCustomizations {
  allTabsCustomInstructions: string
  updateGroupsCustomInstructions: string
}

/**
 * Full prompt configuration with base templates + user customizations
 */
export interface PromptConfig {
  allTabsTemplate: string
  updateGroupsTemplate: string
}

const defaultCustomizations: UserPromptCustomizations = {
  allTabsCustomInstructions: "",
  updateGroupsCustomInstructions: ""
}

/**
 * Get user's custom instructions (stored separately from base prompts)
 */
export async function getUserCustomizations(): Promise<UserPromptCustomizations> {
  const customizations = await storage.get<UserPromptCustomizations>("userPromptCustomizations")
  return customizations ?? defaultCustomizations
}

/**
 * Save user's custom instructions
 */
export async function setUserCustomizations(customizations: UserPromptCustomizations): Promise<void> {
  await storage.set("userPromptCustomizations", customizations)
}

/**
 * Get complete prompt config with latest base templates + user customizations
 * This ensures extension updates are always applied
 */
export async function getPromptConfig(): Promise<PromptConfig> {
  // Always load latest base prompts from extension
  const baseAllTabsTemplate = getOrganizeAllTabsPrompt()
  const baseUpdateGroupsTemplate = getUpdateGroupsPrompt()
  
  // Get user customizations
  const customizations = await getUserCustomizations()
  
  // Append user customizations to base templates
  const allTabsTemplate = customizations.allTabsCustomInstructions
    ? `${baseAllTabsTemplate}\n\n═══════════════════════════════════════════════════════════════════════════════\nADDITIONAL USER INSTRUCTIONS\n═══════════════════════════════════════════════════════════════════════════════\n\n${customizations.allTabsCustomInstructions}`
    : baseAllTabsTemplate
    
  const updateGroupsTemplate = customizations.updateGroupsCustomInstructions
    ? `${baseUpdateGroupsTemplate}\n\n═══════════════════════════════════════════════════════════════════════════════\nADDITIONAL USER INSTRUCTIONS\n═══════════════════════════════════════════════════════════════════════════════\n\n${customizations.updateGroupsCustomInstructions}`
    : baseUpdateGroupsTemplate
  
  return {
    allTabsTemplate,
    updateGroupsTemplate
  }
}
