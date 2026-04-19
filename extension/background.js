// Background service worker — handles context menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "fraudshield-analyze",
    title: "🛡️ Analyze with FraudShield",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "fraudshield-analyze" && info.selectionText) {
    // Store selected text for popup to pick up
    await chrome.storage.local.set({
      pendingText: info.selectionText,
      pendingTabId: tab.id,
    });
    // Open popup (user must click extension icon)
    chrome.action.openPopup?.().catch(() => {
      // openPopup not available in all contexts — notify via badge
      chrome.action.setBadgeText({ text: "NEW", tabId: tab.id });
      chrome.action.setBadgeBackgroundColor({ color: "#6366f1", tabId: tab.id });
    });
  }
});
