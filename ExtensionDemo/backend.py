from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
from datetime import datetime
import json
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# GROQ API KEY
# =======================================
client = Groq(api_key=os.getenv("GROQ_API_KEY", "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"))

class MessageRequest(BaseModel):
    text: str
    mode: str = "auto"           # "auto" or "manual"
    tone: str = "polite"         # target tone: polite, kind, calm, respectful
    sensitivity: str = "medium"  # "low", "medium", "high"

@app.post("/analyze")
async def analyze_message(request: MessageRequest):
    text = request.text

    if not text or len(text.strip()) < 3:
        return {"error": "Text too short"}

    sensitivity_map = {
        "low":    "Only flag very obviously rude or aggressive messages. Ignore mildly blunt ones.",
        "medium": "Flag messages that are harsh, blunt, passive-aggressive, or emotionally charged.",
        "high":   "Flag even slightly negative, cold, or emotionally tense messages."
    }
    sensitivity_instruction = sensitivity_map.get(request.sensitivity, sensitivity_map["medium"])

    if request.mode == "manual":
        rewrite_instruction = f'Since the user selected manual mode, ALWAYS rewrite the message in a {request.tone} tone regardless of whether it is harsh or not. Set needs_rewrite to true.'
    else:
        rewrite_instruction = f'Only rewrite if the message is harsh/rude/not normal. Sensitivity rule: {sensitivity_instruction}'

    prompt = f"""You are ToneEase, an AI assistant that helps people communicate better by detecting harsh or rude messages and rewriting them professionally.

Analyze this message and respond ONLY with valid JSON, nothing else:

Message: "{text}"

Instructions:
1. Decide if this message needs rewriting (needs_rewrite: true or false)
   - {rewrite_instruction}
2. If needs_rewrite is true: rewrite the message to sound {request.tone} and professional. Keep the same meaning. You may naturally include 1-2 relevant emojis in the rewrite ONLY if they genuinely fit.
3. If needs_rewrite is false: set suggestion to null.
4. Detect the tone of the original message in 1-2 words (e.g. "frustrated", "sarcastic", "angry", "passive-aggressive", "neutral", "polite")

Respond with this exact JSON only:
{{
  "needs_rewrite": true,
  "detected_tone": "string",
  "suggestion": "rewritten message or null"
}}"""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": "You are a JSON-only response bot. Never output anything except valid JSON. No markdown, no backticks, no explanations."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.3,
            max_tokens=300
        )

        raw = response.choices[0].message.content.strip()

        # Clean markdown if model adds it
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        result = json.loads(raw)

        return {
            "original": text,
            "needs_rewrite": result.get("needs_rewrite", False),
            "detected_tone": result.get("detected_tone", "neutral") if result.get("needs_rewrite") else "neutral",
            "suggestion": result.get("suggestion", None),
            "mode": request.mode,
            "timestamp": datetime.now().isoformat()
        }

    except json.JSONDecodeError:
        return {"error": "Failed to parse AI response. Please try again."}
    except Exception as e:
        return {"error": str(e)}


@app.get("/")
async def root():
    return {"status": "ToneEase API is running!", "version": "2.0", "model": "llama-3.3-70b-versatile"}

@app.get("/health")
async def health():
    return {"status": "healthy", "model": "llama-3.3-70b-versatile"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")