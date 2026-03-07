from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

print("Loading FLAN-T5-Base model (this will take a few minutes)...")
model_name = "google/flan-t5-base"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSeq2SeqLM.from_pretrained(model_name)

def rewrite_polite(message):
    """Rewrite message to sound polite and professional"""
    prompt = f"Rewrite this message to be polite and respectful: {message}"
    
    inputs = tokenizer(prompt, return_tensors="pt", max_length=512, truncation=True)
    outputs = model.generate(
        inputs.input_ids,
        max_length=100,
        num_return_sequences=1,
        temperature=0.7,
        do_sample=True,
        top_p=0.9
    )
    
    rewritten = tokenizer.decode(outputs[0], skip_special_tokens=True)
    return rewritten

# Critical test cases for demo
test_messages = [
    "Why did you leave the task incomplete?",
    "You never help me.",
    "This is unacceptable.",
    "Are you serious right now?",
    "I need this done today.",
    "You're always late."
]

print("\n" + "="*70)
print("FLAN-T5-BASE TEXT REWRITING TEST")
print("="*70 + "\n")

for msg in test_messages:
    rewritten = rewrite_polite(msg)
    print(f"Original:  '{msg}'")
    print(f"Rewritten: '{rewritten}'")
    print("-" * 70)