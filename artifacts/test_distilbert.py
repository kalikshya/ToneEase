from transformers import pipeline

# Load a pre-trained sentiment/emotion model
print("Loading model... (this might take a minute the first time)")
classifier = pipeline("sentiment-analysis", model="distilbert-base-uncased-finetuned-sst-2-english")

# Test messages - mix of harsh, neutral, friendly
test_messages = [
    "Why did you leave the task incomplete?",
    "You never help me.",
    "Could you please help me when you have time?",
    "I need this done today.",
    "lol you're the worst",
    "Thanks for your help!",
    "Are you serious right now?",
    "I'm really frustrated with this situation.",
    "Can we talk about this?",
    "This is unacceptable."
]

print("\n" + "="*60)
print("TONE DETECTION TEST RESULTS")
print("="*60 + "\n")

for message in test_messages:
    result = classifier(message)[0]
    label = result['label']
    confidence = result['score']
    
    print(f"Message: '{message}'")
    print(f"Detected: {label} (confidence: {confidence:.2%})")
    print("-" * 60)
    