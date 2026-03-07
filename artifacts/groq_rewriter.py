from groq import Groq

# Initialize Groq client
groq_client = Groq(api_key="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") 

def rewrite_with_groq(message, tone="polite"):
    """
    Test Groq API for rewriting messages in different tones
    """
    try:
        prompt = f"""Rewrite this message to sound {tone} and clear, keeping the same meaning.

Original: {message}

Rewritten (respond with ONLY the rewritten message):"""
        
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that rewrites messages to be clearer and more polite. Return only the rewritten message."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=150
        )
        
        rewritten = response.choices[0].message.content.strip()
        
        # Remove quotes if present
        if rewritten.startswith('"') and rewritten.endswith('"'):
            rewritten = rewritten[1:-1]
        
        return rewritten
        
    except Exception as e:
        return f"Error: {e}"

# Test cases
test_messages = [
    ("Why did you leave the task incomplete?", "polite"),
    ("You never help me.", "kind"),
    ("This is unacceptable.", "calm"),
    ("Are you serious right now?", "professional"),
    ("I need this done today.", "friendly"),
    ("You're always late.", "respectful")
]

print("="*70)
print("GROQ API REWRITING TEST")
print("="*70)
print()

for original, tone in test_messages:
    print(f"Original:  '{original}'")
    print(f"Tone:      {tone}")
    rewritten = rewrite_with_groq(original, tone)
    print(f"Rewritten: '{rewritten}'")
    print("-" * 70)