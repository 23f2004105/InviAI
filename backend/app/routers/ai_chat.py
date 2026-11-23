"""
AI Chat Router - Investment advisor chatbot using Gemini AI
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import List, Optional
import os
import asyncio
import logging

# Import Gemini AI
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

from app.database import get_db
from app.routers.auth_local import get_current_user, LocalUser

logger = logging.getLogger(__name__)
router = APIRouter()

# ========================================
# Request/Response Models
# ========================================

class ChatMessage(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    context: Optional[dict] = None  # Can include budget, investment_period, risk_tolerance, etc.
    history: Optional[List[ChatMessage]] = None  # Earlier turns, oldest first (excluding `message`)

# Only the most recent turns are sent to the model, to bound prompt size
MAX_HISTORY_TURNS = 12
MAX_TURN_CHARS = 2000

# Gemini can take 10-20s; past this the offline advisor answers instead of leaving the chat spinning
GEMINI_TIMEOUT_SECONDS = float(os.getenv("GEMINI_TIMEOUT_SECONDS", "30"))


async def generate(model, prompt: str):
    """Run the blocking Gemini call in a worker thread so the event loop (and every other request) keeps running."""
    return await asyncio.wait_for(asyncio.to_thread(model.generate_content, prompt), timeout=GEMINI_TIMEOUT_SECONDS)

class ChatResponse(BaseModel):
    response: str
    suggestions: Optional[List[str]] = None

# ========================================
# Gemini AI Configuration
# ========================================

def get_gemini_model():
    """Initialize and return Gemini model"""
    if not GEMINI_AVAILABLE:
        raise HTTPException(status_code=500, detail="Gemini AI not available. Install google-generativeai package.")
    
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")
    
    genai.configure(api_key=api_key)
    # Use gemini-2.5-flash (latest available model)
    model = genai.GenerativeModel('gemini-2.5-flash')
    return model

# ========================================
# System Prompt for Investment Advisor
# ========================================

INVESTMENT_ADVISOR_PROMPT = """You are an intelligent investment advisor AI assistant for Envi AI, a portfolio management platform focused on the Indian market.

Your role:
- Help users make informed investment decisions
- Suggest stocks, mutual funds, ETFs, and other investment options suitable for the Indian market
- Consider user's budget, investment period, and risk tolerance
- Provide practical, actionable advice
- Focus on Indian stocks (NSE/BSE), Indian mutual funds, and Indian market instruments
- Use INR (₹) for currency
- Keep responses concise, friendly, and professional

Important guidelines:
- Read the whole conversation: details the user gave in earlier messages (budget, investment period, risk tolerance) still apply, so never ask for them again
- If budget, investment period or risk tolerance is still missing, ask for it once; if the user doesn't answer, give advice anyway using a stated assumption (e.g. moderate risk) instead of repeating the question
- Suggest diversified portfolios
- Mention tax implications when relevant (Indian tax laws)
- Recommend popular Indian stocks like Reliance, TCS, Infosys, HDFC Bank, etc.
- Consider Indian mutual funds and index funds like Nifty 50, Sensex funds
- Warn about risks appropriately
- Never guarantee returns

Current conversation context will be provided with each message.
"""

# ========================================
# Offline Fallback Advisor
# ========================================

def offline_advice(message: str, context: Optional[dict] = None) -> str:
    """
    Rule-based answer used when Gemini is unavailable (no key, bad key, no internet),
    so the chat never shows a raw error to the user.
    """
    text = message.lower()
    context = context or {}
    risk = (context.get("risk_tolerance") or "").lower()
    if not risk:
        if any(w in text for w in ["safe", "low risk", "conservative", "fd", "fixed deposit"]):
            risk = "conservative"
        elif any(w in text for w in ["aggressive", "high risk", "high return", "small cap"]):
            risk = "aggressive"
        else:
            risk = "moderate"

    allocations = {
        "conservative": ("20% equity (Nifty 50 index fund), 60% debt (PPF, short-duration debt funds, FDs), 10% gold (SGB/Gold ETF), 10% liquid fund",
                         "HDFC Bank, TCS, ITC, Hindustan Unilever"),
        "moderate": ("50% equity (Nifty 50 + Nifty Next 50 index funds, flexi-cap fund), 30% debt (PPF, corporate bond funds), 10% gold, 10% liquid fund",
                     "Reliance Industries, HDFC Bank, Infosys, ICICI Bank, Larsen & Toubro"),
        "aggressive": ("75% equity (flexi-cap, mid-cap and small-cap funds plus direct stocks), 15% debt, 10% gold",
                       "Bajaj Finance, Titan, Tata Motors, Bharti Airtel, Sun Pharma"),
    }
    allocation, stocks = allocations[risk]

    lines = [f"Here's a {risk} plan for the Indian market:", "",
             f"Suggested allocation: {allocation}.",
             f"Quality large-cap stocks to research: {stocks}.", ""]
    if any(w in text for w in ["tax", "80c", "elss", "ltcg", "stcg"]):
        lines.append("Tax tip: ELSS funds qualify for Section 80C deductions (up to Rs 1.5 lakh) with a 3-year lock-in. "
                     "Equity gains above Rs 1.25 lakh a year held over 12 months are taxed as LTCG at 12.5%.")
    if any(w in text for w in ["sip", "monthly"]):
        lines.append("A monthly SIP in an index fund is a simple way to average out market volatility.")
    if context.get("budget"):
        lines.append(f"With a budget of Rs {context['budget']}, keep 3-6 months of expenses in an emergency fund before investing the rest.")
    lines.append("Investments are subject to market risk; returns are never guaranteed.")
    return "\n".join(lines)


def recent_history(history: Optional[List[ChatMessage]]) -> List[ChatMessage]:
    """Last MAX_HISTORY_TURNS valid turns, oldest first."""
    turns = [m for m in (history or []) if m.role in ("user", "assistant") and m.content.strip()]
    return turns[-MAX_HISTORY_TURNS:]


def format_history(history: Optional[List[ChatMessage]]) -> str:
    """Render earlier turns as a transcript so the model remembers what was already said."""
    lines = []
    for m in recent_history(history):
        speaker = "User" if m.role == "user" else "Assistant"
        lines.append(f"{speaker}: {m.content[:MAX_TURN_CHARS]}\n")
    return "Conversation so far:\n" + "\n".join(lines) + "\n" if lines else ""


# ========================================
# Chat Endpoints
# ========================================

@router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(
    request: ChatRequest,
    current_user: LocalUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Chat with AI investment advisor
    """
    try:
        model = get_gemini_model()
        
        # Build the full prompt with context
        context_info = ""
        if request.context:
            if request.context.get('budget'):
                context_info += f"\nUser's Budget: ₹{request.context['budget']}"
            if request.context.get('investment_period'):
                context_info += f"\nInvestment Period: {request.context['investment_period']}"
            if request.context.get('risk_tolerance'):
                context_info += f"\nRisk Tolerance: {request.context['risk_tolerance']}"
        
        full_prompt = (
            f"{INVESTMENT_ADVISOR_PROMPT}\n\n{context_info}\n\n"
            f"{format_history(request.history)}User: {request.message}\n\nAssistant:"
        )
        
        # Generate response
        response = await generate(model, full_prompt)

        logger.info(f"AI Chat - User: {current_user.email}, Message: {request.message[:50]}...")
        
        return ChatResponse(
            response=response.text,
            suggestions=None  # Can add stock suggestions later
        )
        
    except Exception as e:
        logger.error(f"AI Chat error, using offline advisor: {type(e).__name__}")
        # Include earlier user turns so a risk level stated before ("something safe") is honoured
        earlier = " ".join(m.content for m in recent_history(request.history) if m.role == "user")
        return ChatResponse(response=offline_advice(f"{earlier} {request.message}", request.context), suggestions=None)


@router.post("/quick-advice")
async def get_quick_advice(
    budget: float,
    investment_period: str,
    risk_tolerance: str,
    current_user: LocalUser = Depends(get_current_user)
):
    """
    Get quick investment advice based on user parameters
    """
    try:
        model = get_gemini_model()
        
        prompt = f"""{INVESTMENT_ADVISOR_PROMPT}

User Profile:
- Budget: ₹{budget}
- Investment Period: {investment_period}
- Risk Tolerance: {risk_tolerance}

Please provide:
1. A brief investment strategy (2-3 sentences)
2. 3-5 specific stock recommendations with Indian stocks
3. Asset allocation suggestion (stocks/mutual funds/fixed income)

Keep it concise and actionable.
"""
        
        response = await generate(model, prompt)

        return {
            "advice": response.text,
            "budget": budget,
            "investment_period": investment_period,
            "risk_tolerance": risk_tolerance
        }
        
    except Exception as e:
        logger.error(f"Quick advice error, using offline advisor: {type(e).__name__}")
        return {
            "advice": offline_advice(f"{risk_tolerance} investment", {"budget": budget, "risk_tolerance": risk_tolerance}),
            "budget": budget,
            "investment_period": investment_period,
            "risk_tolerance": risk_tolerance
        }
