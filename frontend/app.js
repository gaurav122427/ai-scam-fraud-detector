// API base URL — update this for deployment
const API_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:8000"
  : "";

// ===== Sample Messages =====
const SAMPLES = {
  phishing: `Dear Customer,
Your HDFC Bank account has been temporarily suspended due to suspicious activity.
To restore access immediately, please verify your details by clicking the link below:
http://hdfc-secure-login.xyz/verify?token=xk29a
You must verify within 24 HOURS or your account will be permanently closed.
Enter your: Account Number, Password, and OTP.
Do NOT share this link with anyone.
— HDFC Bank Security Team`,

  otp: `SBI: We noticed unusual login to your NetBanking. To secure your account, share the OTP sent to you with our security officer calling you now. OTP: xxxxxx. Never share OTP with anyone except SBI officials.`,

  job: `🎉 URGENT HIRING! Work from home. Earn ₹50,000/week just by liking YouTube videos on your phone!
No experience needed. We are hiring 500 people TODAY only.
To register, pay ₹999 security deposit to: UPI - scam@paytm
After payment send screenshot to +91-99999-XXXXX.
Limited slots — ACT NOW before offer expires!`,

  lottery: `CONGRATULATIONS! Your phone number has been selected as the winner of our Microsoft Anniversary Lottery!
You have won: £1,500,000 GBP + iPhone 15 Pro.
To claim your prize, contact our claims agent immediately:
Email: claims@microsoft-lottery.net | WhatsApp: +44-7XXX-XXXXXX
Processing fee of $150 required to release funds.
Claim expires in 48 HOURS. Ref: MSL/2024/UK/7721`,

  safe1: `HDFC Bank: INR 5,000 debited from a/c XX1234 on 18-Apr-2026 at Amazon Pay. Available balance: INR 24,350. If not done by you, call 1800-258-3838. -HDFC Bank`,

  safe2: `Your Zomato order #ORD-9182 has been picked up by Rajan and is on the way. Estimated delivery: 25 mins. Track here: zomato.com/track/9182`
};

// ===== State =====
let currentResult = null;

// ===== DOM Elements =====
const messageInput = document.getElementById("messageInput");
const charCount = document.getElementById("charCount");
const analyzeBtn = document.getElementById("analyzeBtn");
const chatInput = document.getElementById("chatInput");
const chatMsgCount = document.getElementById("chatMsgCount");
const analyzeChatBtn = document.getElementById("analyzeChatBtn");
const loading = document.getElementById("loading");
const results = document.getElementById("results");
const errorState = document.getElementById("errorState");
const themeToggle = document.getElementById("themeToggle");

// ===== Theme =====
const savedTheme = localStorage.getItem("theme") || "light";
if (savedTheme === "dark") {
  document.documentElement.setAttribute("data-theme", "dark");
  themeToggle.textContent = "☀️";
}

themeToggle.addEventListener("click", () => {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  if (isDark) {
    document.documentElement.removeAttribute("data-theme");
    themeToggle.textContent = "🌙";
    localStorage.setItem("theme", "light");
  } else {
    document.documentElement.setAttribute("data-theme", "dark");
    themeToggle.textContent = "☀️";
    localStorage.setItem("theme", "dark");
  }
});

// ===== Tabs =====
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById("tab-" + tab.dataset.tab).classList.add("active");
    clearResults();
  });
});

// ===== Character Counter =====
messageInput.addEventListener("input", () => {
  const len = messageInput.value.length;
  charCount.textContent = `${len.toLocaleString()} / 10,000`;
  charCount.style.color = len > 9000 ? "var(--high)" : "var(--text-muted)";
});

// ===== Chat Message Counter =====
chatInput.addEventListener("input", () => {
  const lines = chatInput.value.split("\n").filter(l => l.trim()).length;
  chatMsgCount.textContent = `${lines} message${lines !== 1 ? "s" : ""}`;
});

// ===== Sample Loader =====
function loadSample(key) {
  const text = SAMPLES[key];
  if (!text) return;
  messageInput.value = text;
  charCount.textContent = `${text.length.toLocaleString()} / 10,000`;

  // Switch to single tab
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
  document.querySelector('[data-tab="single"]').classList.add("active");
  document.getElementById("tab-single").classList.add("active");

  clearResults();
}

// ===== Analyze Single Message =====
analyzeBtn.addEventListener("click", async () => {
  const text = messageInput.value.trim();
  if (!text) {
    showError("Please paste a message to analyze.");
    return;
  }

  setLoading(true);

  try {
    const res = await fetch(`${API_BASE}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }

    const data = await res.json();
    currentResult = data;
    renderResults(data);
  } catch (e) {
    showError(e.message || "Failed to connect to the API. Make sure the backend is running.");
  } finally {
    setLoading(false);
  }
});

// ===== Analyze Chat =====
analyzeChatBtn.addEventListener("click", async () => {
  const text = chatInput.value.trim();
  if (!text) {
    showError("Please paste conversation messages.");
    return;
  }

  const messages = text.split("\n").map(l => l.trim()).filter(Boolean);
  if (messages.length < 1) {
    showError("No valid messages found.");
    return;
  }

  setLoading(true);

  try {
    const res = await fetch(`${API_BASE}/api/analyze/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }

    const data = await res.json();
    // Render overall analysis
    const overallResult = {
      risk_level: data.overall_risk_level,
      confidence_score: data.overall_confidence_score,
      category: data.message_analyses[0]?.category || "Unknown",
      explanation: data.summary,
      red_flags: data.message_analyses.flatMap(m => m.red_flags),
      suspicious_phrases: data.message_analyses.flatMap(m => m.suspicious_phrases),
      tone_analysis: data.message_analyses[0]?.tone_analysis || {},
      safe_to_interact: data.overall_risk_level === "Low",
    };
    currentResult = overallResult;
    renderResults(overallResult);
  } catch (e) {
    showError(e.message || "Failed to analyze conversation.");
  } finally {
    setLoading(false);
  }
});

// ===== Render Results =====
function renderResults(data) {
  const riskLower = data.risk_level.toLowerCase();
  const riskBanner = document.getElementById("riskBanner");
  riskBanner.className = `risk-banner ${riskLower}`;

  // Risk icon
  const icons = { low: "✅", medium: "⚠️", high: "🚨" };
  document.getElementById("riskIcon").textContent = icons[riskLower] || "❓";

  // Risk value
  document.getElementById("riskValue").textContent = data.risk_level;

  // Confidence ring
  const score = Math.max(0, Math.min(100, data.confidence_score));
  document.getElementById("confidenceValue").textContent = score;
  const circumference = 251.2;
  const offset = circumference - (score / 100) * circumference;
  document.getElementById("ringFill").style.strokeDashoffset = offset;

  // Category badge
  const categoryIcons = {
    Phishing: "🎣",
    "Job Scam": "💼",
    "OTP Fraud": "🔐",
    "Lottery Scam": "🎰",
    "Romance Scam": "💔",
    "Investment Scam": "📈",
    Impersonation: "🎭",
    Safe: "✅",
    Unknown: "❓",
  };
  document.getElementById("categoryBadge").textContent =
    `${categoryIcons[data.category] || "📋"} ${data.category}`;

  // Safe badge
  const safeBadge = document.getElementById("safeBadge");
  if (data.safe_to_interact) {
    safeBadge.textContent = "✅ Safe to interact";
    safeBadge.className = "safe-badge-inline safe";
  } else {
    safeBadge.textContent = "🚫 Do NOT interact";
    safeBadge.className = "safe-badge-inline unsafe";
  }

  // Explanation
  document.getElementById("explanationText").textContent = data.explanation;

  // Tone Analysis
  const toneData = data.tone_analysis || {};
  const toneLabels = {
    urgent: "Urgent Tone",
    threatening: "Threatening",
    too_good_to_be_true: "Too Good to Be True",
    impersonating: "Impersonation",
    requesting_sensitive_info: "Requests Sensitive Info",
  };
  const toneGrid = document.getElementById("toneGrid");
  toneGrid.innerHTML = "";
  Object.entries(toneLabels).forEach(([key, label]) => {
    const active = toneData[key] === true;
    const item = document.createElement("div");
    item.className = `tone-item ${active ? "active" : "inactive"}`;
    item.innerHTML = `<div class="tone-dot"></div><span>${label}</span>`;
    toneGrid.appendChild(item);
  });

  // Red Flags
  const redFlags = [...new Set(data.red_flags || [])];
  const redFlagsList = document.getElementById("redFlagsList");
  const redFlagsCard = document.getElementById("redFlagsCard");
  if (redFlags.length > 0) {
    redFlagsCard.style.display = "block";
    redFlagsList.innerHTML = redFlags.map(f => `<li>${escapeHtml(f)}</li>`).join("");
  } else {
    redFlagsCard.style.display = "none";
  }

  // Suspicious Phrases
  const phrases = [...new Set(data.suspicious_phrases || [])];
  const phrasesList = document.getElementById("phrasesList");
  const phrasesCard = document.getElementById("phrasesCard");
  if (phrases.length > 0) {
    phrasesCard.style.display = "block";
    phrasesList.innerHTML = phrases.map(p =>
      `<span class="phrase-tag">"${escapeHtml(p)}"</span>`
    ).join("");
  } else {
    phrasesCard.style.display = "none";
  }

  errorState.style.display = "none";
  results.style.display = "flex";
  results.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ===== Helpers =====
function setLoading(on) {
  loading.style.display = on ? "block" : "none";
  analyzeBtn.disabled = on;
  analyzeChatBtn.disabled = on;
  if (on) {
    results.style.display = "none";
    errorState.style.display = "none";
  }
}

function showError(msg) {
  document.getElementById("errorText").textContent = msg;
  errorState.style.display = "block";
  results.style.display = "none";
  errorState.scrollIntoView({ behavior: "smooth" });
}

function clearResults() {
  results.style.display = "none";
  errorState.style.display = "none";
  currentResult = null;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function copyReport() {
  if (!currentResult) return;
  const r = currentResult;
  const report = [
    "=== FRAUDSHIELD AI ANALYSIS REPORT ===",
    `Risk Level: ${r.risk_level}`,
    `Confidence: ${r.confidence_score}%`,
    `Category: ${r.category}`,
    `Safe to Interact: ${r.safe_to_interact ? "Yes" : "No"}`,
    "",
    "--- Analysis ---",
    r.explanation,
    "",
    "--- Red Flags ---",
    ...(r.red_flags || []).map(f => `• ${f}`),
    "",
    "--- Suspicious Phrases ---",
    ...(r.suspicious_phrases || []).map(p => `• "${p}"`),
    "",
    `Generated by FraudShield AI · ${new Date().toLocaleString()}`,
  ].join("\n");

  navigator.clipboard.writeText(report).then(() => {
    const btn = document.querySelector(".action-btn.primary");
    btn.textContent = "✅ Copied!";
    setTimeout(() => (btn.textContent = "📋 Copy Report"), 2000);
  });
}
