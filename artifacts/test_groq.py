"""
ToneEase - Groq Test File
Run: python test_groq.py
"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from groq import Groq
import json

# ============================================
# GROQ API KEY
# ============================================
API_KEY = "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"
client = Groq(api_key=API_KEY)
# ============================================


def analyze_tone(text, mode="auto", tone="polite", sensitivity="medium"):
    sensitivity_map = {
        "low":    "Only flag very obviously rude or aggressive messages. Ignore mildly blunt ones.",
        "medium": "Flag messages that are harsh, blunt, passive-aggressive, or emotionally charged.",
        "high":   "Flag even slightly negative, cold, or emotionally tense messages."
    }
    sensitivity_instruction = sensitivity_map.get(sensitivity, sensitivity_map["medium"])

    if mode == "manual":
        rewrite_instruction = f'Since the user selected manual mode, ALWAYS rewrite the message in a {tone} tone regardless of whether it is harsh or not. Set needs_rewrite to true.'
    else:
        rewrite_instruction = f'Only rewrite if the message is harsh/rude/not normal. Sensitivity rule: {sensitivity_instruction}'

    prompt = f"""You are ToneEase, an AI assistant that helps people communicate better by detecting harsh or rude messages and rewriting them professionally.

Analyze this message and respond ONLY with valid JSON, nothing else:

Message: "{text}"

Instructions:
1. Decide if this message needs rewriting (needs_rewrite: true or false)
   - {rewrite_instruction}
2. If needs_rewrite is true: rewrite the message to sound {tone} and professional. Keep the same meaning. You may naturally include 1-2 relevant emojis in the rewrite ONLY if they genuinely fit.
3. If needs_rewrite is false: set suggestion to null.
4. Detect the tone of the original message in 1-2 words (e.g. "frustrated", "sarcastic", "angry", "passive-aggressive", "neutral", "polite")

Respond with this exact JSON only:
{{
  "needs_rewrite": true,
  "detected_tone": "string",
  "suggestion": "rewritten message or null"
}}"""

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
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    return json.loads(raw)


def print_result(text, result, mode, sensitivity):
    print("\n" + "="*55)
    print(f"Mode:          {mode} | Sensitivity: {sensitivity}")
    print(f"Original:      {text}")
    print(f"Detected Tone: {result['detected_tone']}")
    print(f"Needs Rewrite: {result['needs_rewrite']}")
    if result['suggestion']:
        print(f"Rewritten:     {result['suggestion']}")
    else:
        print(f"Rewritten:     (not needed - message is fine!)")
    print("="*55)


if __name__ == "__main__":
    print("ToneEase - Groq Test")
    print("Model: Llama 3.3 70B")
    print()

    # --- AUTO MODE TESTS ---
    print(">>> AUTO MODE TESTS")

    auto_tests = [
        ("Why didn't you finish this? It's been days!",    "medium"),
        ("Oh great, another meeting. Just what I needed.", "medium"),
        ("Fine. I'll just do it myself like always.",      "medium"),
        ("Hey, could you send me the report?",             "medium"),
        ("Thank you so much! You did an amazing job!",     "medium"),
        # Same message tested across all 3 sensitivity levels
        ("This isn't what I asked for.",                   "low"),
        ("This isn't what I asked for.",                   "medium"),
        ("This isn't what I asked for.",                   "high"),
    ]

    for msg, sensitivity in auto_tests:
        try:
            result = analyze_tone(msg, mode="auto", sensitivity=sensitivity)
            print_result(msg, result, "auto", sensitivity)
        except Exception as e:
            print(f"\nError for '{msg}': {e}")

    # --- MANUAL MODE TESTS ---
    print("\n>>> MANUAL MODE TESTS")

    manual_tests = [
        ("You never help me.",       "polite"),
        ("This is taking too long.", "calm"),
        ("I need this done now.",    "respectful"),
        ("Hey how are you?",         "kind"),
    ]

    for msg, tone in manual_tests:
        try:
            result = analyze_tone(msg, mode="manual", tone=tone, sensitivity="medium")
            print_result(msg, result, f"manual ({tone})", "medium")
        except Exception as e:
            print(f"\nError for '{msg}': {e}")

    print("\nAll tests complete!")