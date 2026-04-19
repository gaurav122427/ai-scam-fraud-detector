from pydantic import BaseModel, field_validator
from typing import List, Optional
from enum import Enum


class RiskLevel(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"


class ScamCategory(str, Enum):
    PHISHING = "Phishing"
    JOB_SCAM = "Job Scam"
    OTP_FRAUD = "OTP Fraud"
    LOTTERY_SCAM = "Lottery Scam"
    ROMANCE_SCAM = "Romance Scam"
    INVESTMENT_SCAM = "Investment Scam"
    IMPERSONATION = "Impersonation"
    SAFE = "Safe"
    UNKNOWN = "Unknown"


class AnalyzeRequest(BaseModel):
    text: str

    @field_validator("text")
    @classmethod
    def validate_text(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Text cannot be empty")
        if len(v) > 10000:
            raise ValueError("Text exceeds maximum length of 10,000 characters")
        # Basic prompt injection prevention
        injection_patterns = ["ignore previous instructions", "ignore all instructions", "system prompt"]
        lower = v.lower()
        for pattern in injection_patterns:
            if pattern in lower:
                raise ValueError("Invalid input detected")
        return v


class ToneAnalysis(BaseModel):
    urgent: bool = False
    threatening: bool = False
    too_good_to_be_true: bool = False
    impersonating: bool = False
    requesting_sensitive_info: bool = False


class AnalyzeResponse(BaseModel):
    risk_level: RiskLevel
    confidence_score: int  # 0-100
    category: ScamCategory
    explanation: str
    red_flags: List[str]
    suspicious_phrases: List[str]
    tone_analysis: ToneAnalysis
    safe_to_interact: bool


class ChatAnalyzeRequest(BaseModel):
    messages: List[str]

    @field_validator("messages")
    @classmethod
    def validate_messages(cls, v: List[str]) -> List[str]:
        if not v:
            raise ValueError("Messages list cannot be empty")
        if len(v) > 50:
            raise ValueError("Cannot analyze more than 50 messages at once")
        return [m.strip() for m in v if m.strip()]


class ChatAnalyzeResponse(BaseModel):
    overall_risk_level: RiskLevel
    overall_confidence_score: int
    summary: str
    message_analyses: List[AnalyzeResponse]
