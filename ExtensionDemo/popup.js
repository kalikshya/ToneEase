console.log("ToneEase Popup Loaded");

const API_URL = "http://127.0.0.1:8000";

// DOM Elements - declared at top
const autoToggle = document.getElementById("autoMode");
const manualToggle = document.getElementById("manualMode");
const toneBox = document.getElementById("toneSelectBox");
const toneSelect = document.getElementById("toneSelect");
const suggestionBox = document.getElementById("suggestionBox");
const applyBtn = document.querySelector(".apply-btn");
const rejectBtn = document.querySelector(".reject-btn");

// These will be set after DOM loads
let testInput = null;
let sensitivitySlider = null;
let originalText = null;
let rewrittenText = null;

// Toggle manual tone selector
if (manualToggle) {
    manualToggle.addEventListener("change", () => {
        if (manualToggle.checked) {
            toneBox.classList.remove("hidden");
        } else {
            toneBox.classList.add("hidden");
        }
    });
}

// Settings button
const settingsBtn = document.getElementById("settingsBtn");
if (settingsBtn) {
    settingsBtn.addEventListener("click", () => {
        chrome.tabs.create({
            url: "dashboard.html"
        });
    });
}

// Get sensitivity level from slider
function getSensitivityLevel() {
    if (!sensitivitySlider) return "medium";
    const value = parseInt(sensitivitySlider.value);
    if (value <= 33) return "low";
    if (value <= 66) return "medium";
    return "high";
}

// Analyze text function
async function analyzeText(text) {
    const analyzeBtn = document.getElementById("analyzeBtn");

    try {
        // Disable button temporarily
        if (analyzeBtn) {
            analyzeBtn.disabled = true;
            analyzeBtn.textContent = "Analyzing...";
        }

        console.log("Sending request to backend...");

        const mode = manualToggle && manualToggle.checked ? "manual" : "auto";
        const tone = toneSelect ? toneSelect.value : "polite";
        const sensitivity = getSensitivityLevel();

        const response = await fetch(`${API_URL}/analyze`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                text: text,
                mode: mode,
                tone: tone,
                sensitivity: sensitivity
            })
        });

        if (!response.ok) {
            throw new Error("API request failed");
        }

        const result = await response.json();
        console.log("Backend response:", result);

        // Show suggestion if rewrite is needed
        if (result.needs_rewrite && result.suggestion) {
            showSuggestion(result.original, result.suggestion, result.detected_tone);
        } else {
            hideSuggestion();
            showStatus("Message looks good! No changes needed.", "success");
        }

        return result;

    } catch (error) {
        console.error("Error analyzing text:", error);
        showStatus("Cannot connect to backend. Make sure backend.py is running!", "error");
    } finally {
        // Re-enable button
        if (analyzeBtn) {
            analyzeBtn.disabled = false;
            analyzeBtn.textContent = "Analyze Tone";
        }
    }
}

// Show a status message in the UI (instead of alert)
function showStatus(message, type) {
    let statusEl = document.getElementById("statusMessage");
    if (!statusEl) {
        statusEl = document.createElement("p");
        statusEl.id = "statusMessage";
        statusEl.style.cssText = "margin-top:8px; font-size:13px; text-align:center;";
        suggestionBox && suggestionBox.parentNode.insertBefore(statusEl, suggestionBox);
    }
    statusEl.textContent = message;
    statusEl.style.color = type === "success" ? "green" : "red";

    // Auto hide after 3 seconds
    setTimeout(() => { statusEl.textContent = ""; }, 3000);
}

// Show suggestion box
function showSuggestion(original, suggestion, detectedTone) {
    if (originalText) originalText.textContent = original;
    if (rewrittenText) rewrittenText.textContent = suggestion;
    if (suggestionBox) suggestionBox.classList.remove("hidden");

    // Store current suggestion for apply/reject
    window.currentSuggestion = { original, suggestion, detectedTone };

    console.log("Suggestion shown:", { original, suggestion, detectedTone });
}

// Hide suggestion box
function hideSuggestion() {
    if (suggestionBox) suggestionBox.classList.add("hidden");
}

// Save to localStorage history (will be replaced with database later)
function saveToHistory(action, mode) {
    const history = JSON.parse(localStorage.getItem("toneease_history") || "[]");

    const entry = {
        date: new Date().toLocaleDateString(),
        action: action,
        mode: mode,
        original: window.currentSuggestion?.original || "",
        suggestion: window.currentSuggestion?.suggestion || "",
        detectedTone: window.currentSuggestion?.detectedTone || "",
        timestamp: new Date().toISOString()
    };

    history.unshift(entry); // Add to beginning

    // Keep only last 50 entries
    if (history.length > 50) {
        history.pop();
    }

    localStorage.setItem("toneease_history", JSON.stringify(history));
    console.log("Saved to history:", entry);
}

// Apply button - accept suggestion
if (applyBtn) {
    applyBtn.addEventListener("click", () => {
        console.log("Apply button clicked");
        if (window.currentSuggestion) {
            // Replace text in input
            if (testInput) {
                testInput.value = window.currentSuggestion.suggestion;
            }

            // Save to history
            saveToHistory("Suggestion Accepted", "Automatic");

            showStatus("Suggestion applied!", "success");
            hideSuggestion();
        }
    });
}

// Reject button
if (rejectBtn) {
    rejectBtn.addEventListener("click", () => {
        console.log("Reject button clicked");
        if (window.currentSuggestion) {
            // Save to history
            saveToHistory("Suggestion Rejected", "Automatic");

            showStatus("Suggestion rejected.", "error");
            hideSuggestion();
        }
    });
}

// Initialize after DOM loads
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM Content Loaded - Initializing...");

    // Get all elements that need to be accessed after DOM loads
    testInput = document.getElementById("testInput");
    sensitivitySlider = document.getElementById("sensitivity");
    originalText = document.getElementById("originalText");
    rewrittenText = document.getElementById("rewrittenText");

    const analyzeBtn = document.getElementById("analyzeBtn");

    console.log("Elements found:", {
        testInput: !!testInput,
        analyzeBtn: !!analyzeBtn,
        sensitivitySlider: !!sensitivitySlider,
        originalText: !!originalText,
        rewrittenText: !!rewrittenText
    });

    // Analyze button click
    if (analyzeBtn && testInput) {
        analyzeBtn.addEventListener("click", () => {
            console.log("Analyze button clicked!");
            const text = testInput.value.trim();
            if (text.length > 0) {
                console.log("Analyzing:", text);
                analyzeText(text);
            } else {
                showStatus("Please enter some text to analyze.", "error");
            }
        });

        // Auto-analyze on typing (for auto mode only)
        let typingTimer;
        testInput.addEventListener("input", () => {
            clearTimeout(typingTimer);
            if (autoToggle && autoToggle.checked) {
                typingTimer = setTimeout(() => {
                    const text = testInput.value.trim();
                    if (text.length > 3) {
                        console.log("Auto-analyzing:", text);
                        analyzeText(text);
                    }
                }, 1500); // Wait 1.5 seconds after user stops typing
            }
        });
    } else {
        console.error("Analyze button or test input not found!");
    }

    // Sensitivity slider update
    if (sensitivitySlider) {
        sensitivitySlider.addEventListener("input", () => {
            const level = getSensitivityLevel();
            console.log("Sensitivity changed to:", level);
        });
    }

    console.log("ToneEase functionality loaded successfully!");
});