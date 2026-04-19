// Content script — injects a floating badge when page is flagged as high risk
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "SHOW_RISK_BADGE") {
    showBadge(msg.data);
  }
});

function showBadge(data) {
  // Remove existing badge
  document.getElementById("fraudshield-badge")?.remove();

  const colors = { Low: "#22c55e", Medium: "#f59e0b", High: "#ef4444" };
  const icons = { Low: "✅", Medium: "⚠️", High: "🚨" };

  const badge = document.createElement("div");
  badge.id = "fraudshield-badge";
  badge.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 999999;
    background: #0f172a;
    border: 2px solid ${colors[data.risk_level] || "#6366f1"};
    border-radius: 12px;
    padding: 12px 16px;
    font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
    font-size: 13px;
    color: #f1f5f9;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    max-width: 280px;
    cursor: pointer;
    transition: transform 0.2s;
  `;

  badge.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
      <span style="font-size:18px">${icons[data.risk_level] || "🛡️"}</span>
      <div>
        <div style="font-weight:700;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px">FraudShield</div>
        <div style="font-weight:800;font-size:16px;color:${colors[data.risk_level]};">${data.risk_level} Risk</div>
      </div>
      <div style="margin-left:auto;font-weight:700;color:${colors[data.risk_level]}">${data.confidence_score}%</div>
    </div>
    <div style="font-size:11px;color:#94a3b8;line-height:1.5">${data.explanation.substring(0, 120)}${data.explanation.length > 120 ? "..." : ""}</div>
    <div style="margin-top:8px;font-size:10px;color:#475569;text-align:right">Click to dismiss</div>
  `;

  badge.addEventListener("click", () => badge.remove());
  badge.addEventListener("mouseenter", () => badge.style.transform = "translateY(-2px)");
  badge.addEventListener("mouseleave", () => badge.style.transform = "translateY(0)");

  document.body.appendChild(badge);

  // Auto-dismiss after 15 seconds
  setTimeout(() => badge?.remove(), 15000);
}
