// Toast notification system for showing messages to users
export async function showToast(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info', duration: number = 3000): Promise<void> {
  try {
    // Create a notification
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('assets/icon.png'),
      title: 'Group Tab AI',
      message: message,
      priority: 2
    })
    
    // Auto-clear after duration
    if (duration > 0) {
      setTimeout(() => {
        // Notifications auto-clear, no need to manually clear
      }, duration)
    }
  } catch (e) {
    console.error('[Toast] Failed to show notification:', e)
  }
}

export async function showGroupingStarted(): Promise<void> {
  await showToast('🔄 Grouping tabs...', 'info', 0) // 0 = don't auto-clear
}

export async function showGroupingSuccess(): Promise<void> {
  await showToast('✅ Tabs grouped successfully!', 'success', 3000)
}

export async function showGroupingCancelled(): Promise<void> {
  await showToast('⊗ Grouping cancelled', 'warning', 2000)
}

export async function showGroupingError(error: string): Promise<void> {
  await showToast(`❌ Grouping failed: ${error}`, 'error', 5000)
}
