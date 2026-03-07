"""
ToneEase - GPT-4o-mini Test File
Put this in your artifacts/ folder for reference
Run: python test_gpt4omini.py
"""

from openai import OpenAI
import json

# ============================================
# API KEY
# ============================================
API_KEY = "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"


client = OpenAI(api_key=API_KEY)
# ============================================

def analyze_tone(text, mode="auto", tone="polite", sensitivity="medium"):
    sensitivity_map = {
        "low": "Only flag very obviously rude or aggressive messages.",
        "medium": "Flag messages that are somewhat harsh, blunt, or passive-aggressive.",
        "high": "Flag even slightly negative, cold, or emotionally charged messages."
    }
    sensitivity_instruction = sensitivity_map.get(sensitivity, sensitivity_map["medium"])

    prompt = f"""You are ToneEase, an AI assistant that analyzes emotional tone of messages and rewrites them more professionally when needed. You support English and Nepali (including Romanized Nepali like "timi kasto cha").

Analyze this message and respond ONLY with JSON (no extra text, no markdown):

Message: "{text}"

Instructions:
1. Detect primary emotion (choose one: joy, anger, sadness, fear, disgust, surprise, neutral, sarcasm, frustration, passive-aggressive)
2. Confidence score (0.0 to 1.0)
3. Top 3 emotions with confidence scores
4. Sensitivity rule: {sensitivity_instruction}
5. Decide if message is harsh (is_harsh: true/false)
6. If is_harsh is true OR mode is "manual" (mode="{mode}"), rewrite to be more {tone} and professional. Keep same meaning.
7. Suggest 1-3 relevant emojis matching the emotional context
8. If no rewrite needed, set suggestion to null

Respond with this exact JSON:
{{
  "emotion": "string",
  "confidence": 0.00,
  "is_harsh": true/false,
  "suggestion": "rewritten message or null",
  "emojis": ["emoji1", "emoji2"],
  "all_emotions": [
    {{"emotion": "string", "confidence": 0.00}},
    {{"emotion": "string", "confidence": 0.00}},
    {{"emotion": "string", "confidence": 0.00}}
  ]
}}"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=500
    )

    raw = response.choices[0].message.content.strip()

    # Clean markdown if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    return json.loads(raw)


def print_result(text, result):
    print("\n" + "="*50)
    print(f"📝 Original:   {text}")
    print(f"😊 Emotion:    {result['emotion']} ({result['confidence']*100:.0f}% confident)")
    print(f"🚨 Is Harsh:   {result['is_harsh']}")
    print(f"🎯 Emojis:     {' '.join(result['emojis'])}")
    if result['suggestion']:
        print(f"✏️  Rewritten:  {result['suggestion']}")
    else:
        print(f"✏️  Rewritten:  (not needed)")
    print(f"📊 All Emotions:")
    for e in result['all_emotions']:
        print(f"   - {e['emotion']}: {e['confidence']*100:.0f}%")
    print("="*50)


# ============================================
# TEST CASES
# ============================================
test_messages = [
    # English - harsh
    "Why didn't you finish this? It's been days!",
    # English - sarcasm
    "Oh great, another meeting. Just what I needed.",
    # English - normal
    "Hey, could you send me the report when you get a chance?",
    # English - passive aggressive
    "Fine. I'll just do it myself like always.",
    # Nepali Romanized
    "timi le kina garina yo kaam? ekdam irritating cha!",
    # Happy
    "Thank you so much! You're amazing!",
]

if __name__ == "__main__":
    print(" ToneEase - GPT-4o-mini Test")
    print("Testing tone detection + rewriting + emoji suggestions...")

    for msg in test_messages:
        try:
            result = analyze_tone(msg, mode="auto", sensitivity="medium")
            print_result(msg, result)
        except Exception as e:
            print(f"\n Error for '{msg}': {e}")

    print("\n Test complete!")