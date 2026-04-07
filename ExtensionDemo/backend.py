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
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# ============================================
# DATABASE CONNECTION — Clever Cloud
# ============================================
def get_db():
    return pymysql.connect(
        host=os.getenv("DB_HOST"),
        port=3306,
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME"),
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        init_command="SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
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
        "low":    "Only flag messages that are clearly rude, hostile, or contain insults/profanity. Positive, neutral, and mildly blunt messages should NOT be flagged.",
        "medium": "Flag messages that are rude, aggressive, dismissive, passive-aggressive, or sarcastic. Do NOT flag positive, friendly, or neutral messages.",
        "high":   "Flag messages that are even slightly negative, cold, or could be misinterpreted as rude. But still do NOT flag clearly positive or kind messages."
    }
    sensitivity_instruction = sensitivity_map.get(request.sensitivity, sensitivity_map["medium"])

    if request.mode == "manual":
        rewrite_instruction = f'Since the user selected manual mode, ALWAYS rewrite the message in a {request.tone} tone regardless of whether it is harsh or not. Set needs_rewrite to true.'
    else:
        rewrite_instruction = f'Sensitivity rule: {sensitivity_instruction}. Important: Do NOT flag messages that are positive, kind, friendly, complimentary, or neutral. Only flag genuinely problematic messages.'

    prompt = f"""You are ToneEase, an AI assistant that helps people communicate better by detecting harsh or rude messages and rewriting them professionally.

Analyze this message and respond ONLY with valid JSON, nothing else:

Message: "{text}"

Instructions:
1. Decide if this message needs rewriting (needs_rewrite: true or false)
   - {rewrite_instruction}
   - Messages like compliments, appreciation, love, encouragement, greetings, and friendly chat should NEVER be flagged.
   - Examples of messages that should NOT be flagged: "you are so precious", "great job!", "thank you so much", "I love this", "have a nice day", "you're amazing"
   - Examples of messages that SHOULD be flagged: "you're useless", "this is garbage", "shut up", "nobody asked you", "do your job properly"
2. If needs_rewrite is true: rewrite the message to sound {request.tone} and professional. Keep the same meaning. Do NOT include any emojis.
3. If needs_rewrite is false: set suggestion to null.
4. Detect the tone of the original message in 1-2 words (e.g. "frustrated", "sarcastic", "angry", "passive-aggressive", "neutral", "polite", "friendly", "positive")

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
                {"role": "system", "content": "You are a tone detection bot that responds only in JSON. You help identify genuinely harsh or rude messages. You do NOT flag positive, kind, friendly, or neutral messages. Never output anything except valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
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
    uvicorn.run(app, host="0.0.0.0", port=7860, log_level="info")