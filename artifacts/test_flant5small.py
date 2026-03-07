from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

# Load FLAN-T5 Small model (lightweight enough for browser)
print("Loading FLAN-T5-Small model...")
model_name = "google/flan-t5-small"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSeq2SeqLM.from_pretrained(model_name)

def rewrite_message(message, target_tone):
    """Rewrite a message in the specified tone"""
    prompt = f"Rewrite this message to sound {target_tone}: {message}"
    
    inputs = tokenizer(prompt, return_tensors="pt", max_length=512, truncation=True)
    outputs = model.generate(
        inputs.input_ids,
        max_length=100,
        num_return_sequences=1,
        temperature=0.7,
        do_sample=True
    )
    
    rewritten = tokenizer.decode(outputs[0], skip_special_tokens=True)
    return rewritten

# Test messages with different target tones
test_cases = [
    {
        "original": "Why did you leave the task incomplete?",
        "target_tone": "polite"
    },
    {
        "original": "You never help me.",
        "target_tone": "kind"
    },
    {
        "original": "I need this done today.",
        "target_tone": "respectful"
    },
    {
        "original": "This is unacceptable.",
        "target_tone": "calm"
    },
    {
        "original": "Are you serious right now?",
        "target_tone": "professional"
    },
    {
        "original": "You're always late.",
        "target_tone": "friendly"
    }
]

print("\n" + "="*70)
print("FLAN-T5 TEXT REWRITING TEST")
print("="*70 + "\n")

for case in test_cases:
    original = case["original"]
    tone = case["target_tone"]
    
    print(f"Original: '{original}'")
    print(f"Target tone: {tone}")
    
    rewritten = rewrite_message(original, tone)
    
    print(f"Rewritten: '{rewritten}'")
    print("-" * 70)

# Test multiple rewrites of the same message
print("\n" + "="*70)
print("TESTING MULTIPLE TONES FOR SAME MESSAGE")
print("="*70 + "\n")

test_message = "Why didn't you finish this?"
tones = ["polite", "friendly", "professional", "calm", "kind"]

print(f"Original: '{test_message}'\n")

for tone in tones:
    rewritten = rewrite_message(test_message, tone)
    print(f"{tone.upper()}: '{rewritten}'")

print("\n" + "="*70)