/**
 * Utility to load prompt templates from external files
 * This allows for easier editing and version control of prompts
 */

import organizeAllTabsPrompt from "data-text:../prompts/organize-all-tabs.txt"
import updateGroupsPrompt from "data-text:../prompts/update-groups.txt"

/**
 * Get the prompt template for organizing all tabs
 */
export function getOrganizeAllTabsPrompt(): string {
  return organizeAllTabsPrompt
}

/**
 * Get the prompt template for updating existing groups
 */
export function getUpdateGroupsPrompt(): string {
  return updateGroupsPrompt
}

/**
 * Replace template variables in prompt
 */
export function fillPromptTemplate(
  template: string,
  variables: Record<string, string>
): string {
  let result = template
  
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{${key}}`
    result = result.replace(new RegExp(placeholder, 'g'), value)
  }
  
  return result
}
