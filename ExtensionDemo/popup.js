console.log("ToneEase Popup Loaded");

const API_URL = "http://127.0.0.1:8000";

// DOM Elements
const autoToggle = document.getElementById("autoMode");
const manualToggle = document.getElementById("manualMode");
const toneBox = document.getElementById("toneSelectBox");
const toneSelect = document.getElementById("toneSelect");
const suggestionBox = document.getElementById("suggestionBox");
const applyBtn = document.querySelector(".apply-btn");
const rejectBtn = document.querySelector(".reject-btn");

let testInput = null;
let sensitivitySlider = null;
let originalText = null;
let rewrittenText = null;

// Current user state
let currentUser = null;       // { user_id, username, email } or null
let currentSessionId = null;  // always exists (for anonymous tracking)

// ============================================
// INITIALIZE: Load user state + session
// ============================================
function initUserState() {
    chrome.storage.local.get(["user_id", "username", "email", "is_logged_in", "session_id"], (data) => {

        // Set or create session ID
        if (data.session_id) {
            currentSessionId = data.session_id;
        } else {
            currentSessionId = generateSessionId();
            chrome.storage.local.set({ session_id: currentSessionId });
        }

        // Set user state
        if (data.is_logged_in && data.user_id) {
            currentUser = {
                user_id: data.user_id,
                username: data.username,
                email: data.email
            };
            showUserBar();
        } else {
            currentUser = null;
            showLoginBar();
        }
    });
}

// Generate a unique session ID
function generateSessionId() {
    return 'sess_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

// Show logged in user bar
function showUserBar() {
    document.getElementById("userBar").style.display = "flex";
    document.getElementById("loginBar").style.display = "none";
    document.getElementById("usernameDisplay").textContent = currentUser.username;
}

// Show guest/login bar
function showLoginBar() {
    document.getElementById("userBar").style.display = "none";
    document.getElementById("loginBar").style.display = "flex";
}

// ============================================
// LOGIN BUTTON
// ============================================
document.getElementById("loginBtn") && document.getElementById("loginBtn").addEventListener("click", () => {
    chrome.tabs.create({ url: "login.html" });
});

// ============================================
// LOGOUT BUTTON
// ============================================
document.getElementById("logoutBtn") && document.getElementById("logoutBtn").addEventListener("click", () => {
    chrome.storage.local.set({
        user_id: null,
        username: null,
        email: null,
        is_logged_in: false
    }, () => {
        currentUser = null;
        showLoginBar();
        showStatus("Signed out successfully.", "success");
    });
});

// ============================================
// MANUAL MODE TOGGLE
// ============================================
if (manualToggle) {
    manualToggle.addEventListener("change", () => {
        toneBox.classList.toggle("hidden", !manualToggle.checked);
    });
}

// ============================================
// SETTINGS BUTTON
// ============================================
const settingsBtn = document.getElementById("settingsBtn");
if (settingsBtn) {
    settingsBtn.addEventListener("click", () => {
        chrome.tabs.create({ url: "dashboard.html" });
    });
}

// ============================================
// SENSITIVITY
// ============================================
function getSensitivityLevel() {
    if (!sensitivitySlider) return "medium";
    const value = parseInt(sensitivitySlider.value);
    if (value <= 33) return "low";
    if (value <= 66) return "medium";
    return "high";
}

// ============================================
// ANALYZE TEXT
// ============================================
async function analyzeText(text) {
    const analyzeBtn = document.getElementById("analyzeBtn");

    try {
        if (analyzeBtn) {
            analyzeBtn.disabled = true;
            analyzeBtn.textContent = "Analyzing...";
        }

        const mode = manualToggle && manualToggle.checked ? "manual" : "auto";
        const tone = toneSelect ? toneSelect.value : "polite";
        const sensitivity = getSensitivityLevel();

        const response = await fetch(`${API_URL}/analyze`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text: text,
                mode: mode,
                tone: tone,
                sensitivity: sensitivity,
                session_id: currentSessionId,
                user_id: currentUser ? currentUser.user_id : null
            })
        });

        if (!response.ok) throw new Error("API request failed");

        const result = await response.json();
        console.log("Backend response:", result);

        if (result.needs_rewrite && result.suggestion) {
            showSuggestion(result.original, result.suggestion, result.detected_tone, result.history_id);
        } else {
            hideSuggestion();
            showStatus("Message looks good! No changes needed. ✓", "success");
        }

        return result;

    } catch (error) {
        console.error("Error:", error);
        showStatus("Cannot connect to backend. Make sure backend.py is running!", "error");
    } finally {
        if (analyzeBtn) {
            analyzeBtn.disabled = false;
            analyzeBtn.textContent = "Analyze Tone";
        }
    }
}

// ============================================
// SHOW/HIDE SUGGESTION
// ============================================
function showSuggestion(original, suggestion, detectedTone, historyId) {
    if (originalText) originalText.textContent = original;
    if (rewrittenText) rewrittenText.textContent = suggestion;
    if (suggestionBox) suggestionBox.classList.remove("hidden");

    window.currentSuggestion = { original, suggestion, detectedTone, historyId };
}

function hideSuggestion() {
    if (suggestionBox) suggestionBox.classList.add("hidden");
}

// ============================================
// STATUS MESSAGE (no more alert popups)
// ============================================
function showStatus(message, type) {
    let statusEl = document.getElementById("statusMessage");
    if (!statusEl) {
        statusEl = document.createElement("p");
        statusEl.id = "statusMessage";
        statusEl.style.cssText = "margin-top:8px; font-size:12px; text-align:center; padding: 6px; border-radius: 4px;";
        const testSection = document.getElementById("testSection");
        if (testSection) testSection.appendChild(statusEl);
    }
    statusEl.textContent = message;
    statusEl.style.background = type === "success" ? "#e8f5e9" : "#ffebee";
    statusEl.style.color = type === "success" ? "#2e7d32" : "#c62828";
    setTimeout(() => { if (statusEl) statusEl.textContent = ""; }, 3000);
}

// ============================================
// APPLY BUTTON
// ============================================
if (applyBtn) {
    applyBtn.addEventListener("click", async () => {
        if (window.currentSuggestion) {
            if (testInput) testInput.value = window.currentSuggestion.suggestion;

            // Save feedback to database
            if (window.currentSuggestion.historyId) {
                await saveFeedback(window.currentSuggestion.historyId, "accepted");
            }

            showStatus("Suggestion applied! ✓", "success");
            hideSuggestion();
        }
    });
}

// ============================================
// REJECT BUTTON
// ============================================
if (rejectBtn) {
    rejectBtn.addEventListener("click", async () => {
        if (window.currentSuggestion) {
            if (window.currentSuggestion.historyId) {
                await saveFeedback(window.currentSuggestion.historyId, "rejected");
            }
            showStatus("Suggestion rejected.", "error");
            hideSuggestion();
        }
    });
}

// ============================================
// SAVE FEEDBACK TO DATABASE
// ============================================
async function saveFeedback(historyId, action) {
    try {
        await fetch(`${API_URL}/feedback`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                history_id: historyId,
                action: action,
                user_id: currentUser ? currentUser.user_id : null,
                session_id: currentSessionId
            })
        });
    } catch (e) {
        console.error("Feedback save failed:", e);
    }
}

// ============================================
// DOM READY
// ============================================
document.addEventListener("DOMContentLoaded", () => {
    testInput = document.getElementById("testInput");
    sensitivitySlider = document.getElementById("sensitivity");
    originalText = document.getElementById("originalText");
    rewrittenText = document.getElementById("rewrittenText");

    const analyzeBtn = document.getElementById("analyzeBtn");

    // Initialize user state (login/guest)
    initUserState();

    // Analyze button
    if (analyzeBtn && testInput) {
        analyzeBtn.addEventListener("click", () => {
            const text = testInput.value.trim();
            if (text.length > 0) {
                analyzeText(text);
            } else {
                showStatus("Please enter some text to analyze.", "error");
            }
        });

        // Auto-analyze while typing (auto mode only)
        let typingTimer;
        testInput.addEventListener("input", () => {
            clearTimeout(typingTimer);
            if (autoToggle && autoToggle.checked) {
                typingTimer = setTimeout(() => {
                    const text = testInput.value.trim();
                    if (text.length > 3) analyzeText(text);
                }, 1500);
            }
        });
    }

    if (sensitivitySlider) {
        sensitivitySlider.addEventListener("input", () => {
            console.log("Sensitivity:", getSensitivityLevel());
        });
    }

    console.log("ToneEase ready!");
});