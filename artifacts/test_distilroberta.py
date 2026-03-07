from transformers import pipeline

# Load DistilRoBERTa emotion classifier
print("Loading DistilRoBERTa emotion model...")
emotion_classifier = pipeline(
    "text-classification",
    model="j-hartmann/emotion-english-distilroberta-base",
    top_k=None  # Returns all emotion scores
)

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
print("DistilRoBERTa EMOTION DETECTION TEST")
print("="*60 + "\n")

for message in test_messages:
    results = emotion_classifier(message)[0]
    
    # Sort by confidence
    results_sorted = sorted(results, key=lambda x: x['score'], reverse=True)
    
    print(f"Message: '{message}'")
    print(f"Top emotion: {results_sorted[0]['label']} ({results_sorted[0]['score']:.2%})")
    
    # Fixed line - using regular string concatenation instead of nested f-string
    top_three = ', '.join([f"{r['label']}: {r['score']:.0%}" for r in results_sorted[:3]])
    print(f"All emotions: {top_three}")
    print("-" * 60)