from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
from datetime import datetime
import json
import os
import uuid
import pymysql
from typing import Optional

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
# ============================================
client = Groq(api_key=os.getenv("GROQ_API_KEY", "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"))

# ============================================
# DATABASE CONNECTION — paste Railway credentials
# ============================================
def get_db():
    return pymysql.connect(
        host="maglev.proxy.rlwy.net",
        port=39726,
        user="root",
        password="mveaIqMEyiVVtRkAcMZFvEXBclNWNAEn",
        database="railway",
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor
    )

# ============================================
# REQUEST MODELS
# ============================================
class MessageRequest(BaseModel):
    text: str
    mode: str = "auto"
    tone: str = "polite"
    sensitivity: str = "medium"
    session_id: Optional[str] = None
    user_id: Optional[int] = None

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class LinkSessionRequest(BaseModel):
    session_id: str
    user_id: int

class FeedbackRequest(BaseModel):
    history_id: int
    action: str
    user_id: Optional[int] = None
    session_id: Optional[str] = None

# ============================================
# HELPER: Create session if not exists
# ============================================
def ensure_session(session_id: str, user_id: int = None):
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM sessions WHERE session_id = %s", (session_id,))
        if not cursor.fetchone():
            cursor.execute(
                "INSERT INTO sessions (session_id, user_id) VALUES (%s, %s)",
                (session_id, user_id)
            )
            conn.commit()
    finally:
        conn.close()

# ============================================
# ANALYZE ENDPOINT
# ============================================
@app.post("/analyze")
async def analyze_message(request: MessageRequest):
    text = request.text

    if not text or len(text.strip()) < 3:
        return {"error": "Text too short"}

    session_id = request.session_id or str(uuid.uuid4())
    ensure_session(session_id, request.user_id)

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
                {"role": "system", "content": "You are a JSON-only response bot. Never output anything except valid JSON. No markdown, no backticks, no explanations."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=300
        )

        raw = response.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        result = json.loads(raw)
        needs_rewrite = result.get("needs_rewrite", False)
        detected_tone = result.get("detected_tone", "neutral") if needs_rewrite else "neutral"
        suggestion = result.get("suggestion", None)

        # Save to history table
        conn = get_db()
        try:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO history (user_id, session_id, original_text, rewritten_text, detected_tone, mode, platform)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (request.user_id, session_id, text, suggestion, detected_tone, request.mode, "extension"))
            history_id = cursor.lastrowid
            conn.commit()
        finally:
            conn.close()

        return {
            "original": text,
            "needs_rewrite": needs_rewrite,
            "detected_tone": detected_tone,
            "suggestion": suggestion,
            "mode": request.mode,
            "session_id": session_id,
            "history_id": history_id,
            "timestamp": datetime.now().isoformat()
        }

    except json.JSONDecodeError:
        return {"error": "Failed to parse AI response. Please try again."}
    except Exception as e:
        return {"error": str(e)}

# ============================================
# FEEDBACK ENDPOINT
# ============================================
@app.post("/feedback")
async def save_feedback(request: FeedbackRequest):
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO feedback (history_id, user_id, session_id, action)
            VALUES (%s, %s, %s, %s)
        """, (request.history_id, request.user_id, request.session_id, request.action))
        conn.commit()
        return {"status": "feedback saved"}
    except Exception as e:
        return {"error": str(e)}
    finally:
        conn.close()

# ============================================
# REGISTER ENDPOINT
# ============================================
@app.post("/register")
async def register(request: RegisterRequest):
    if not request.username or not request.email or not request.password:
        raise HTTPException(status_code=400, detail="All fields are required")

    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT user_id FROM users WHERE email = %s", (request.email,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Email already registered")
        cursor.execute("SELECT user_id FROM users WHERE username = %s", (request.username,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Username already taken")

        cursor.execute(
            "INSERT INTO users (username, email, password) VALUES (%s, %s, %s)",
            (request.username, request.email, request.password)
        )
        user_id = cursor.lastrowid
        cursor.execute("INSERT INTO tone_settings (user_id) VALUES (%s)", (user_id,))
        conn.commit()

        return {"status": "success", "message": "Account created!", "user_id": user_id, "username": request.username}
    except HTTPException:
        raise
    except Exception as e:
        return {"error": str(e)}
    finally:
        conn.close()

# ============================================
# LOGIN ENDPOINT
# ============================================
@app.post("/login")
async def login(request: LoginRequest):
    if not request.email or not request.password:
        raise HTTPException(status_code=400, detail="Email and password are required")

    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT user_id, username, email FROM users WHERE email = %s AND password = %s",
            (request.email, request.password)
        )
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        return {"status": "success", "message": f"Welcome back, {user['username']}!", "user_id": user["user_id"], "username": user["username"], "email": user["email"]}
    except HTTPException:
        raise
    except Exception as e:
        return {"error": str(e)}
    finally:
        conn.close()

# ============================================
# LINK SESSION TO USER
# ============================================
@app.post("/link-session")
async def link_session(request: LinkSessionRequest):
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute("UPDATE sessions SET user_id = %s WHERE session_id = %s", (request.user_id, request.session_id))
        cursor.execute("UPDATE history SET user_id = %s WHERE session_id = %s AND user_id IS NULL", (request.user_id, request.session_id))
        conn.commit()
        return {"status": "success", "message": "Previous history linked to your account!"}
    except Exception as e:
        return {"error": str(e)}
    finally:
        conn.close()

# ============================================
# GET HISTORY - logged in user
# ============================================
@app.get("/history/{user_id}")
async def get_history(user_id: int):
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT h.history_id, h.original_text, h.rewritten_text,
                   h.detected_tone, h.mode, h.platform, h.created_at,
                   f.action as feedback_action
            FROM history h
            LEFT JOIN feedback f ON h.history_id = f.history_id
            WHERE h.user_id = %s
            ORDER BY h.created_at DESC
            LIMIT 50
        """, (user_id,))
        return {"history": cursor.fetchall()}
    except Exception as e:
        return {"error": str(e)}
    finally:
        conn.close()

# ============================================
# GET HISTORY - anonymous session
# ============================================
@app.get("/history/session/{session_id}")
async def get_session_history(session_id: str):
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT h.history_id, h.original_text, h.rewritten_text,
                   h.detected_tone, h.mode, h.platform, h.created_at,
                   f.action as feedback_action
            FROM history h
            LEFT JOIN feedback f ON h.history_id = f.history_id
            WHERE h.session_id = %s
            ORDER BY h.created_at DESC
            LIMIT 50
        """, (session_id,))
        return {"history": cursor.fetchall()}
    except Exception as e:
        return {"error": str(e)}
    finally:
        conn.close()

@app.get("/")
async def root():
    return {"status": "ToneEase API is running!", "version": "2.0", "model": "llama-3.3-70b-versatile"}

@app.get("/health")
async def health():
    return {"status": "healthy", "model": "llama-3.3-70b-versatile"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")