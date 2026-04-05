// ToneEase Content Script
// Runs on: WhatsApp Web, Facebook Messenger, Instagram

const API_URL = "https://kalikshya-toneease-backend.hf.space";

// ============================================
// PLATFORM SELECTORS
// ============================================
const PLATFORM_SELECTORS = {
    test: [
        '#toneease-test-input',
        'textarea'
    ],
    whatsapp: [
        'div[contenteditable="true"][data-tab="10"]',
        'div[contenteditable="true"][data-tab="1"]',
        'footer div[contenteditable="true"]'
    ],
    facebook: [
        'div[contenteditable="true"][role="textbox"]',
        'div[aria-label="Message"][contenteditable="true"]',
        'div[aria-placeholder="Aa"][contenteditable="true"]'
    ],
    instagram: [
        'div[contenteditable="true"][role="textbox"]',
        'textarea[placeholder="Message..."]',
        'div[aria-label="Message"][contenteditable="true"]'
    ]
};

// ============================================
// DETECT PLATFORM
// ============================================
function detectPlatform() {
    const url = window.location.href;
    if (url.includes("localhost")) return "test";
    if (url.includes("web.whatsapp.com")) return "whatsapp";
    if (url.includes("facebook.com") || url.includes("messenger.com")) return "facebook";
    if (url.includes("instagram.com")) return "instagram";
    return null;
}

// ============================================
// GET TEXT FROM INPUT
// ============================================
function getTextFromInput(input) {
    if (input.tagName === "TEXTAREA" || input.tagName === "INPUT") {
        return input.value;
    }
    return input.innerText || input.textContent || "";
}

// ============================================
// SET TEXT IN INPUT
// ============================================
function setTextInInput(input, text) {
    if (input.tagName === "TEXTAREA" || input.tagName === "INPUT") {
        input.value = text;
        input.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
        input.innerText = text;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(input);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
    }
}

// ============================================
// REMOVE SUGGESTION BOX
// ============================================
function removeSuggestionBox() {
    const existing = document.getElementById("toneease-suggestion");
    if (existing) existing.remove();
}

// ============================================
// CREATE SUGGESTION BOX
// ============================================
function createSuggestionBox(suggestion, input) {
    removeSuggestionBox();

    const box = document.createElement("div");
    box.id = "toneease-suggestion";

    const rect = input.getBoundingClientRect();
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const scrollX = window.scrollX || document.documentElement.scrollLeft;

    box.style.cssText = `
        position: absolute;
        top: ${rect.top + scrollY - 170}px;
        left: ${rect.left + scrollX}px;
        z-index: 999999;
        background: #FFF8F0;
        border: 1px solid #C08552;
        border-radius: 10px;
        padding: 12px 14px;
        box-shadow: 0 4px 20px rgba(75,46,43,0.15);
        font-family: Arial, sans-serif;
        font-size: 13px;
        max-width: 420px;
        min-width: 280px;
    `;

    box.innerHTML = `
        <div style="display:flex; align-items:center; margin-bottom:8px;">
            <span style="color:#4B2E2B; font-weight:600; font-size:12px;">✨ ToneEase Suggestion</span>
            <button id="toneease-close" style="margin-left:auto; background:none; border:none; cursor:pointer; color:#8C5A3C; font-size:18px; line-height:1;">×</button>
        </div>
        <div style="color:#8C5A3C; font-size:12px; margin-bottom:10px; line-height:1.5;">
            <strong style="color:#4B2E2B;">Rewritten:</strong> ${suggestion}
        </div>
        <div style="display:flex; gap:8px;">
            <button id="toneease-accept" style="flex:1; padding:7px; background:#C08552; color:white; border:none; border-radius:6px; cursor:pointer; font-size:12px; font-weight:600;">
                Accept
            </button>
            <button id="toneease-reject" style="flex:1; padding:7px; background:#F8F3E1; color:#4B2E2B; border:1px solid #E3DBBB; border-radius:6px; cursor:pointer; font-size:12px;">
                Reject
            </button>
        </div>
    `;

    document.body.appendChild(box);

    document.getElementById("toneease-accept").addEventListener("click", () => {
        setTextInInput(input, suggestion);
        removeSuggestionBox();
        saveFeedback("accepted");
    });

    document.getElementById("toneease-reject").addEventListener("click", () => {
        removeSuggestionBox();
        saveFeedback("rejected");
    });

    document.getElementById("toneease-close").addEventListener("click", () => {
        removeSuggestionBox();
    });
}

// ============================================
// SAVE FEEDBACK
// ============================================
function saveFeedback(action) {
    if (!window.toneEaseCurrentHistoryId) return;
    chrome.runtime.sendMessage({ type: "GET_USER_STATE" }, async (response) => {
        try {
            await fetch(`${API_URL}/feedback`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    history_id: window.toneEaseCurrentHistoryId,
                    action: action,
                    user_id: response?.user_id || null,
                    session_id: response?.session_id || null
                })
            });
        } catch (e) {
            console.error("ToneEase feedback error:", e);
        }
    });
}

// ============================================
// ANALYZE TEXT
// ============================================
function analyzeText(text, input) {
    if (!text || text.trim().length < 3) return;

    try {
        chrome.runtime.sendMessage({ type: "GET_USER_STATE" }, (response) => {
            if (chrome.runtime.lastError) {
                console.log("ToneEase: background not ready, retrying...");
                // Just use null values and continue anyway
                doAnalyze(text, input, null, null);
                return;
            }
            doAnalyze(text, input, response?.user_id || null, response?.session_id || null);
        });
    } catch (e) {
        doAnalyze(text, input, null, null);
    }
}

async function doAnalyze(text, input, userId, sessionId) {
    try {
        const res = await fetch(`${API_URL}/analyze`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text: text.trim(),
                mode: "auto",
                tone: "polite",
                sensitivity: "medium",
                session_id: sessionId,
                user_id: userId
            })
        });

        const result = await res.json();
        console.log("ToneEase result:", result);

        if (result.needs_rewrite && result.suggestion) {
            window.toneEaseCurrentHistoryId = result.history_id || null;
            createSuggestionBox(result.suggestion, input);
        }
    } catch (e) {
        console.error("ToneEase analyze error:", e);
    }
}

// ============================================
// ATTACH TO INPUT
// ============================================
function attachToInput(input) {
    if (input.dataset.toneEaseAttached) return;
    input.dataset.toneEaseAttached = "true";

    let typingTimer;
    input.addEventListener("input", () => {
        clearTimeout(typingTimer);
        removeSuggestionBox();
        const text = getTextFromInput(input);
        if (text.trim().length > 3) {
            typingTimer = setTimeout(() => {
                analyzeText(text, input);
            }, 1500);
        }
    });

    console.log("ToneEase: Attached to input on", detectPlatform());
}

// ============================================
// FIND AND ATTACH TO ALL INPUTS
// ============================================
function findAndAttachInputs() {
    const platform = detectPlatform();
    if (!platform) return;

    const selectors = PLATFORM_SELECTORS[platform];
    selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(input => attachToInput(input));
    });
}

// ============================================
// OBSERVE DOM FOR DYNAMIC INPUTS
// ============================================
const observer = new MutationObserver(() => {
    findAndAttachInputs();
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

findAndAttachInputs();
console.log("ToneEase content script loaded on:", window.location.href);