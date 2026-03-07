import re

def rewrite_polite(message):
    """
    Smart rule-based message rewriter
    Uses pattern matching and templates for consistent results
    """
    original = message
    message_lower = message.lower().strip()
    
    # Pattern 1: "Why did/didn't you..." questions
    if re.match(r"why (did|didn't) you", message_lower):
        return re.sub(
            r"Why (did|didn't) you", 
            r"Could you please help me understand why you \1", 
            message, 
            flags=re.IGNORECASE
        )
    
    # Pattern 2: "You never..." accusations
    if message_lower.startswith("you never"):
        return re.sub(
            r"You never", 
            "I've noticed that sometimes you don't", 
            message, 
            flags=re.IGNORECASE
        )
    
    # Pattern 3: "You always..." complaints
    if re.match(r"you're always|you are always", message_lower):
        return re.sub(
            r"You're always|You are always", 
            "I've noticed a pattern where", 
            message, 
            flags=re.IGNORECASE
        )
    
    # Pattern 4: Unacceptable/unacceptable variations
    if "unacceptable" in message_lower:
        return "I'm concerned about this situation and would like to discuss how we can improve it."
    
    # Pattern 5: "Are you serious/kidding" expressions
    if re.search(r"are you (serious|kidding|joking)", message_lower):
        return "I'd like to clarify this situation with you."
    
    # Pattern 6: "I need this" demands
    if re.match(r"i need (this|that|it)", message_lower):
        return re.sub(
            r"I need (this|that|it)", 
            r"I would appreciate if \1 could be", 
            message, 
            flags=re.IGNORECASE
        ) + " completed when you have a moment."
    
    # Pattern 7: Direct "Do this" commands
    if re.match(r"(do|finish|complete|send|give me)", message_lower):
        return f"Could you please {message_lower}?"
    
    # Pattern 8: Questions that sound harsh
    if message.strip().endswith("?") and any(word in message_lower for word in ["what", "when", "where", "how"]):
        # Already a question, just soften it
        if not message_lower.startswith(("could", "would", "can", "may")):
            return f"Could you please help me with this: {message}"
    
    # Default: Add polite framing
    if message.strip().endswith("?"):
        return message  # Already a question, leave it
    else:
        return f"I wanted to mention: {message}"


def rewrite_with_tone(message, tone):
    """
    Rewrite message based on selected tone
    """
    if tone.lower() == "polite":
        return rewrite_polite(message)
    
    elif tone.lower() == "professional":
        # More formal version
        result = rewrite_polite(message)
        result = result.replace("I've noticed", "I have observed")
        result = result.replace("Could you please", "Would you kindly")
        return result
    
    elif tone.lower() == "friendly":
        # Casual but nice
        result = rewrite_polite(message)
        result = result.replace("Could you please", "Hey, could you")
        result = result.replace("I would appreciate", "I'd really appreciate")
        return result
    
    elif tone.lower() == "calm":
        # Remove urgency
        result = rewrite_polite(message)
        result = result.replace("need", "would like")
        result = result.replace("must", "should")
        return result
    
    else:
        return rewrite_polite(message)


# Test all patterns
test_cases = [
    ("Why did you leave the task incomplete?", "polite"),
    ("You never help me.", "polite"),
    ("This is unacceptable.", "polite"),
    ("Are you serious right now?", "polite"),
    ("I need this done today.", "polite"),
    ("You're always late.", "polite"),
    ("Finish this now.", "polite"),
    ("What were you thinking?", "polite"),
    ("Send me the file.", "professional"),
    ("You never listen to me.", "friendly"),
]

print("\n" + "="*70)
print("RULE-BASED REWRITING TEST")
print("="*70 + "\n")

for msg, tone in test_cases:
    rewritten = rewrite_with_tone(msg, tone)
    print(f"Original:  '{msg}'")
    print(f"Tone: {tone}")
    print(f"Rewritten: '{rewritten}'")
    print("-" * 70)