import json
import re
import os
from google import genai
from google.genai import types
from backend.models.schemas import (
    AnalyzeResponse, RiskLevel, ScamCategory, ToneAnalysis
)

MODEL = "gemini-2.5-pro"


def _get_client() -> genai.Client:
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        raise RuntimeError("GEMINI_API_KEY environment variable is not set.")
    return genai.Client(api_key=key)


SYSTEM_PROMPT = """You are an elite cybersecurity expert specializing in scam, phishing, and fraud detection.
Your task is to analyze text messages, emails, SMS, WhatsApp messages, or website content for signs of fraud.

Analyze for:
1. Phishing patterns (fake links, credential harvesting, urgency tactics)
2. Job scams (unrealistic salaries, advance fee requests, suspicious recruitment)
3. OTP/banking fraud (requests for OTPs, PINs, passwords, banking details)
4. Lottery/prize scams (you've won, claim your prize)
5. Romance scams (emotional manipulation, requests for money)
6. Investment scams (guaranteed returns, crypto schemes)
7. Impersonation (fake banks, government agencies, tech support)
8. Safe legitimate communications

Detection signals to look for:
- Urgency and pressure tactics ("Act NOW", "Limited time", "Your account will be suspended")
- Threats and fear ("Legal action", "Arrest warrant", "Account blocked")
- Suspicious links or domains (misspelled, unusual TLDs)
- Requests for sensitive info (OTP, password, SSN, bank details, credit card)
- Grammar/spelling errors characteristic of scams
- Too-good-to-be-true offers
- Vague sender identity or impersonation attempts
- Unusual payment requests (gift cards, wire transfers, crypto)
- Fake authority claims

You MUST respond with ONLY valid JSON matching this exact schema (no markdown, no extra text):
{
  "risk_level": "Low" | "Medium" | "High",
  "confidence_score": <integer 0-100>,
  "category": "Phishing" | "Job Scam" | "OTP Fraud" | "Lottery Scam" | "Romance Scam" | "Investment Scam" | "Impersonation" | "Safe" | "Unknown",
  "explanation": "<clear human-readable explanation of your analysis>",
  "red_flags": ["<flag1>", "<flag2>", ...],
  "suspicious_phrases": ["<exact phrase from text>", ...],
  "tone_analysis": {
    "urgent": <true|false>,
    "threatening": <true|false>,
    "too_good_to_be_true": <true|false>,
    "impersonating": <true|false>,
    "requesting_sensitive_info": <true|false>
  },
  "safe_to_interact": <true|false>
}

Be precise. If the message is genuinely safe, say so clearly. Avoid false positives.
"""

CONVERSATION_SYSTEM_PROMPT = """You are an elite cybersecurity expert analyzing a WhatsApp/SMS conversation for scam patterns.
Analyze the conversation holistically — scammers often build trust gradually before striking.

Look for:
- Gradual trust-building followed by requests for money/info
- Escalating urgency over multiple messages
- Inconsistencies in identity claims
- Sudden pivots to financial requests
- Grooming patterns in romance/investment scams

Respond with ONLY valid JSON:
{
  "risk_level": "Low" | "Medium" | "High",
  "confidence_score": <integer 0-100>,
  "category": "Phishing" | "Job Scam" | "OTP Fraud" | "Lottery Scam" | "Romance Scam" | "Investment Scam" | "Impersonation" | "Safe" | "Unknown",
  "explanation": "<clear explanation>",
  "red_flags": ["<flag1>", ...],
  "suspicious_phrases": ["<phrase>", ...],
  "tone_analysis": {
    "urgent": <true|false>,
    "threatening": <true|false>,
    "too_good_to_be_true": <true|false>,
    "impersonating": <true|false>,
    "requesting_sensitive_info": <true|false>
  },
  "safe_to_interact": <true|false>
}
"""


def _parse_response(raw: str) -> dict:
    raw = raw.strip()
    match = re.search(r"```(?:json)?\s*([\s\S]*?)```", raw)
    if match:
        raw = match.group(1).strip()
    return json.loads(raw)


def _build_response(data: dict) -> AnalyzeResponse:
    tone_data = data.get("tone_analysis", {})
    tone = ToneAnalysis(
        urgent=tone_data.get("urgent", False),
        threatening=tone_data.get("threatening", False),
        too_good_to_be_true=tone_data.get("too_good_to_be_true", False),
        impersonating=tone_data.get("impersonating", False),
        requesting_sensitive_info=tone_data.get("requesting_sensitive_info", False),
    )
    return AnalyzeResponse(
        risk_level=RiskLevel(data.get("risk_level", "Unknown")),
        confidence_score=max(0, min(100, int(data.get("confidence_score", 50)))),
        category=ScamCategory(data.get("category", "Unknown")),
        explanation=data.get("explanation", "Analysis unavailable."),
        red_flags=data.get("red_flags", []),
        suspicious_phrases=data.get("suspicious_phrases", []),
        tone_analysis=tone,
        safe_to_interact=bool(data.get("safe_to_interact", False)),
    )


async def analyze_text(text: str) -> AnalyzeResponse:
    client = _get_client()
    response = await client.aio.models.generate_content(
        model=MODEL,
        contents=f"Analyze this message for scam/fraud:\n\n{text}",
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            temperature=1,
            max_output_tokens=8192,
        ),
    )
    data = _parse_response(response.text)
    return _build_response(data)


async def analyze_conversation(messages: list[str]) -> AnalyzeResponse:
    client = _get_client()
    conversation_text = "\n".join(
        f"[Message {i+1}]: {msg}" for i, msg in enumerate(messages)
    )
    response = await client.aio.models.generate_content(
        model=MODEL,
        contents=f"Analyze this conversation:\n\n{conversation_text}",
        config=types.GenerateContentConfig(
            system_instruction=CONVERSATION_SYSTEM_PROMPT,
            temperature=1,
            max_output_tokens=8192,
        ),
    )
    data = _parse_response(response.text)
    return _build_response(data)
