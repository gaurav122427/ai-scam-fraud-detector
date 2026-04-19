from fastapi import APIRouter, HTTPException
from pydantic import ValidationError
from backend.models.schemas import (
    AnalyzeRequest, AnalyzeResponse,
    ChatAnalyzeRequest, ChatAnalyzeResponse,
    RiskLevel
)
from backend.services.ai_service import analyze_text, analyze_conversation
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["analysis"])


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_message(request: AnalyzeRequest):
    """Analyze a single message for scam/fraud indicators."""
    try:
        result = await analyze_text(request.text)
        return result
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Analysis error: {e}")
        raise HTTPException(status_code=500, detail="Analysis failed. Please try again.")


@router.post("/analyze/chat", response_model=ChatAnalyzeResponse)
async def analyze_chat(request: ChatAnalyzeRequest):
    """Analyze a WhatsApp/SMS conversation for scam patterns."""
    try:
        # Analyze full conversation context
        full_result = await analyze_conversation(request.messages)

        # Analyze each individual message
        individual_results = []
        for msg in request.messages[:10]:  # Cap at 10 individual analyses
            try:
                result = await analyze_text(msg)
                individual_results.append(result)
            except Exception:
                pass  # Skip failed individual analyses

        # Determine overall risk (max of individual + conversation analysis)
        risk_scores = {"Low": 1, "Medium": 2, "High": 3}
        max_risk = full_result.risk_level

        for r in individual_results:
            if risk_scores.get(r.risk_level, 0) > risk_scores.get(max_risk, 0):
                max_risk = r.risk_level

        return ChatAnalyzeResponse(
            overall_risk_level=max_risk,
            overall_confidence_score=full_result.confidence_score,
            summary=full_result.explanation,
            message_analyses=individual_results,
        )
    except Exception as e:
        logger.error(f"Chat analysis error: {e}")
        raise HTTPException(status_code=500, detail="Chat analysis failed. Please try again.")


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "Fraud Detector API"}
