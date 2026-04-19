// Default API URL — user can change via settings
const DEFAULT_API = "http://localhost:8000";

// ===== State =====
let apiBase = DEFAULT_API;

// ===== Init =====
document.addEventListener("DOMContentLoaded", async () => {
  // Load stored API URL
  const stored = await chrome.storage.local.get("apiBase");
  apiBase = stored.apiBase || DEFAULT_API;
  document.getElementById("apiUrlInput").value = apiBase;

  // Show current tab URL
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url) {
    const url = tab.url.length > 55 ? tab.url.substring(0, 55) + "..." : tab.url;
    document.getElementById("pageUrl").textContent = url;
  }
});

// ===== Tab Switching =====
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById("tab-" + tab.dataset.tab).classList.add("active");
    clearResult();
  });
});

// ===== Settings =====
document.getElementById("settingsBtn").addEventListener("click", () => {
  document.getElementById("settings-panel").style.display = "block";
});

document.getElementById("backBtn").addEventListener("click", () => {
  document.getElementById("settings-panel").style.display = "none";
});

document.getElementById("saveSettingsBtn").addEventListener("click", async () => {
  const url = document.getElementById("apiUrlInput").value.trim().replace(/\/$/, "");
  apiBase = url || DEFAULT_API;
  await chrome.storage.local.set({ apiBase });
  const notice = document.getElementById("saveNotice");
  notice.style.display = "block";
  setTimeout(() => {
    notice.style.display = "none";
    document.getElementById("settings-panel").style.display = "none";
  }, 1200);
});

// ===== Scan Page =====
document.getElementById("scanPageBtn").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => document.body.innerText.substring(0, 8000),
    });
    if (!result || result.trim().length < 20) {
      showError("Not enough text found on this page to analyze.");
      return;
    }
    await analyze(result);
  } catch (e) {
    const url = tab?.url || "";
    if (url.includes("mail.google.com") || url.includes("google.com") || url.startsWith("chrome://")) {
      showError("Gmail & Google pages block extensions. Copy the email text and use the ✏️ Manual Input tab instead.");
    } else {
      showError("Cannot access this page. Copy the content and use the ✏️ Manual Input tab instead.");
    }
  }
});

// ===== Scan Selected Text =====
document.getElementById("scanSelectionBtn").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection()?.toString() || "",
    });
    if (!result || result.trim().length < 10) {
      showError("No text selected. Please select text on the page first.");
      return;
    }
    await analyze(result);
  } catch (e) {
    showError("Cannot read selection from this page.");
  }
});

// ===== Manual Analyze =====
document.getElementById("analyzeManualBtn").addEventListener("click", async () => {
  const text = document.getElementById("manualInput").value.trim();
  if (!text) {
    showError("Please enter a message to analyze.");
    return;
  }
  await analyze(text);
});

// ===== Core Analyze Function =====
async function analyze(text) {
  clearResult();
  setLoading(true);

  try {
    const res = await fetch(`${apiBase}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.substring(0, 10000) }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Server error ${res.status}`);
    }

    const data = await res.json();
    renderResult(data);
  } catch (e) {
    if (e.name === "TypeError") {
      showError("Cannot connect to API. Check Settings → API URL.");
    } else {
      showError(e.message || "Analysis failed. Try again.");
    }
  } finally {
    setLoading(false);
  }
}

// ===== Render Result =====
function renderResult(data) {
  const riskLower = data.risk_level.toLowerCase();
  const emojis = { low: "✅", medium: "⚠️", high: "🚨" };

  const riskCard = document.getElementById("riskCard");
  riskCard.className = `risk-card ${riskLower}`;

  document.getElementById("riskEmoji").textContent = emojis[riskLower] || "❓";
  document.getElementById("riskLevel").textContent = data.risk_level;
  document.getElementById("confidencePill").textContent = `${data.confidence_score}% confident`;

  const categoryIcons = {
    Phishing: "🎣", "Job Scam": "💼", "OTP Fraud": "🔐",
    "Lottery Scam": "🎰", "Romance Scam": "💔",
    "Investment Scam": "📈", Impersonation: "🎭", Safe: "✅", Unknown: "❓",
  };
  document.getElementById("categoryTag").textContent =
    `${categoryIcons[data.category] || "📋"} ${data.category}`;

  const safeTag = document.getElementById("safeTag");
  if (data.safe_to_interact) {
    safeTag.textContent = "✅ Safe";
    safeTag.className = "safe-tag safe";
  } else {
    safeTag.textContent = "🚫 Dangerous";
    safeTag.className = "safe-tag unsafe";
  }

  document.getElementById("explanationText").textContent = data.explanation;

  const flags = data.red_flags || [];
  const flagsSection = document.getElementById("flagsSection");
  if (flags.length > 0) {
    flagsSection.style.display = "block";
    document.getElementById("flagsList").innerHTML =
      flags.slice(0, 5).map(f => `<li>${escHtml(f)}</li>`).join("");
  }

  document.getElementById("result").style.display = "block";
}

// ===== Helpers =====
function setLoading(on) {
  document.getElementById("loading").style.display = on ? "block" : "none";
  document.getElementById("scanPageBtn").disabled = on;
  document.getElementById("scanSelectionBtn").disabled = on;
  document.getElementById("analyzeManualBtn").disabled = on;
}

function showError(msg) {
  const box = document.getElementById("errorBox");
  box.textContent = "⚠️ " + msg;
  box.style.display = "block";
}

function clearResult() {
  document.getElementById("result").style.display = "none";
  document.getElementById("errorBox").style.display = "none";
  document.getElementById("flagsSection").style.display = "none";
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
