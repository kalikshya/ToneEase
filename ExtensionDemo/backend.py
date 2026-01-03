from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import pipeline
import re
from datetime import datetime

app = FastAPI()

# Enable CORS so browser extension can call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load DistilRoBERTa model
print("Loading DistilRoBERTa model...")
emotion_classifier = pipeline(
    "text-classification",
    model="j-hartmann/emotion-english-distilroberta-base",
    top_k=None
)
print("Model loaded successfully!")

# Rule-based rewriter
def rewrite_polite(message):
    message_lower = message.lower().strip()
    
    if re.match(r"why (did|didn't|dont|don't) you", message_lower):
        return re.sub(
            r"Why (did|didn't|dont|don't) you", 
            r"Could you please help me understand why you \1", 
            message, 
            flags=re.IGNORECASE
        )
    
    if message_lower.startswith("you never"):
        return re.sub(
            r"You never", 
            "I've noticed that sometimes you don't", 
            message, 
            flags=re.IGNORECASE
        )
    
    if re.match(r"you're always|you are always", message_lower):
        return re.sub(
            r"You're always|You are always", 
            "I've noticed a pattern where", 
            message, 
            flags=re.IGNORECASE
        )
    
    if "unacceptable" in message_lower:
        return "I'm concerned about this situation and would like to discuss how we can improve it."
    
    if re.search(r"are you (serious|kidding|joking)", message_lower):
        return "I'd like to clarify this situation with you."
    
    if re.match(r"i need (this|that|it)", message_lower):
        return re.sub(
            r"I need (this|that|it)", 
            r"I would appreciate if \1 could be", 
            message, 
            flags=re.IGNORECASE
        ) + " completed when you have a moment."
    
    if re.match(r"(do|finish|complete|send|give me)", message_lower):
        return f"Could you please {message_lower}?"
    
    if message.strip().endswith("?") and not message_lower.startswith(("could", "would", "can", "may")):
        return f"Could you please help me with this: {message}"
    
    return f"I wanted to mention: {message}"

class MessageRequest(BaseModel):
    text: str
    mode: str = "auto"
    tone: str = "polite"
    sensitivity: str = "medium"

@app.post("/analyze")
async def analyze_message(request: MessageRequest):
    text = request.text
    
    if not text or len(text.strip()) < 3:
        return {"error": "Text too short"}
    
    # Detect tone with DistilRoBERTa
    results = emotion_classifier(text)[0]
    results_sorted = sorted(results, key=lambda x: x['score'], reverse=True)
    
    top_emotion = results_sorted[0]['label']
    confidence = results_sorted[0]['score']
    
    # Sensitivity thresholds
    threshold_map = {
        "low": 0.5,
        "medium": 0.3,
        "high": 0.2
    }
    threshold = threshold_map.get(request.sensitivity, 0.4)
    
    # Check if harsh tone
    harsh_emotions = ['anger', 'disgust', 'sadness']
    is_harsh = top_emotion in harsh_emotions and confidence > threshold
    
    # Generate suggestion
    suggestion = None
    if request.mode == "manual" or is_harsh:
        suggestion = rewrite_polite(text)
    
    return {
        "original": text,
        "emotion": top_emotion,
        "confidence": round(confidence, 2),
        "is_harsh": is_harsh,
        "suggestion": suggestion,
        "all_emotions": [
            {"emotion": e['label'], "confidence": round(e['score'], 2)} 
            for e in results_sorted[:3]
        ],
        "timestamp": datetime.now().isoformat()
    }

@app.get("/")
async def root():
    return {"status": "ToneEase API is running!", "version": "1.0"}

@app.get("/health")
async def health():
    return {"status": "healthy", "model": "loaded"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")