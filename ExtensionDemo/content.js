// ToneEase Content Script
const API_URL = "https://kalikshya-toneease-backend.hf.space";

let isAccepting = false;

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
    ],
    gmail: [
        'div[contenteditable="true"][role="textbox"]',
        'div[aria-label="Message Body"][contenteditable="true"]',
        'div.Am.Al.editable[contenteditable="true"]'
    ],
    twitter: [
        'div[contenteditable="true"][data-testid="tweetTextarea_0"]',
        'div[contenteditable="true"][role="textbox"]'
    ],
    linkedin: [
        'div[contenteditable="true"][role="textbox"]',
        'div.msg-form__contenteditable[contenteditable="true"]',
        'div.ql-editor[contenteditable="true"]'
    ],
    discord: [
        'div[contenteditable="true"][role="textbox"]',
        'div[data-slate-editor="true"]'
    ],
    slack: [
        'div[contenteditable="true"][role="textbox"]',
        'div.ql-editor[contenteditable="true"]'
    ],
    reddit: [
        'div[contenteditable="true"]',
        'textarea[placeholder="What are your thoughts?"]',
        'div[data-testid="comment-submission-form-richtext"] div[contenteditable="true"]'
    ],
    youtube: [
        'div#contenteditable-root[contenteditable="true"]',
        'yt-formatted-string[contenteditable="true"]'
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
    if (url.includes("mail.google.com")) return "gmail";
    if (url.includes("twitter.com") || url.includes("x.com")) return "twitter";
    if (url.includes("linkedin.com")) return "linkedin";
    if (url.includes("discord.com")) return "discord";
    if (url.includes("slack.com")) return "slack";
    if (url.includes("reddit.com")) return "reddit";
    if (url.includes("youtube.com")) return "youtube";
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
async function setTextInInput(input, text) {
    isAccepting = true;

    try {
        if (input.tagName === "TEXTAREA" || input.tagName === "INPUT") {
            input.value = text;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            setTimeout(() => { isAccepting = false; }, 2000);
        } else {
            input.focus();
            setTimeout(async () => {
                try {
                    await navigator.clipboard.writeText(text);
                    await new Promise(r => setTimeout(r, 50));
                    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true }));
                    await new Promise(r => setTimeout(r, 50));
                    document.execCommand('paste');
                } catch (err) {
                    console.error("Failed:", err);
                }
                setTimeout(() => { isAccepting = false; }, 2000);
            }, 100);
        }
    } catch (e) {
        console.error("ToneEase setTextInInput error:", e);
        isAccepting = false;
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
// REMOVE TONE PICKER
// ============================================
function removeTonePicker() {
    const existing = document.getElementById("toneease-tone-picker");
    if (existing) existing.remove();
}

// ============================================
// SHOW/HIDE LOADING INDICATOR
// ============================================
function showLoading(input) {
    hideLoading();
    const loader = document.createElement("div");
    loader.id = "toneease-loading";

    const rect = input.getBoundingClientRect();
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const scrollX = window.scrollX || document.documentElement.scrollLeft;

    loader.style.cssText = `
        position: absolute;
        top: ${rect.top + scrollY - 30}px;
        left: ${rect.left + scrollX}px;
        z-index: 999999;
        background: #4B2E2B;
        color: white;
        padding: 4px 12px;
        border-radius: 6px;
        font-family: Arial, sans-serif;
        font-size: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        animation: toneeasePulse 1.2s infinite;
    `;
    loader.textContent = "Analyzing tone...";

    if (!document.getElementById("toneease-style")) {
        const style = document.createElement("style");
        style.id = "toneease-style";
        style.textContent = `
            @keyframes toneeasePulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(loader);
}

function hideLoading() {
    const existing = document.getElementById("toneease-loading");
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

    const spaceAbove = rect.top;
    const topPos = spaceAbove > 180
        ? rect.top + scrollY - 170
        : rect.bottom + scrollY + 8;

    box.style.cssText = `
        position: absolute;
        top: ${topPos}px;
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
            <span style="color:#4B2E2B; font-weight:600; font-size:12px;">ToneEase Suggestion</span>
            <button id="toneease-close" style="margin-left:auto; background:none; border:none; cursor:pointer; color:#8C5A3C; font-size:18px; line-height:1;">x</button>
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

    document.getElementById("toneease-accept").addEventListener("click", async (e) => {
        e.stopPropagation();
        removeSuggestionBox();
        await setTextInInput(input, suggestion);
        saveFeedback("accepted");
    });

    document.getElementById("toneease-reject").addEventListener("click", (e) => {
        e.stopPropagation();
        removeSuggestionBox();
        saveFeedback("rejected");
    });

    document.getElementById("toneease-close").addEventListener("click", (e) => {
        e.stopPropagation();
        removeSuggestionBox();
    });
}

// ============================================
// CREATE FLOATING MANUAL ICON
// ============================================
function createManualIcon(input) {
    if (input.dataset.toneEaseIconAttached) return;
    input.dataset.toneEaseIconAttached = "true";

    const icon = document.createElement("div");
    icon.className = "toneease-manual-icon";
    icon.innerHTML = "&#9999;&#65039;";
    icon.title = "ToneEase - Rewrite in your preferred tone";
    icon.style.cssText = `
        position: absolute;
        z-index: 999998;
        width: 30px;
        height: 30px;
        background: #FFF8F0;
        border: 1px solid #C08552;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 14px;
        box-shadow: 0 2px 8px rgba(75,46,43,0.2);
        transition: transform 0.15s, box-shadow 0.15s;
        user-select: none;
    `;

    function positionIcon() {
        const rect = input.getBoundingClientRect();
        const scrollY = window.scrollY || document.documentElement.scrollTop;
        const scrollX = window.scrollX || document.documentElement.scrollLeft;
        icon.style.top = (rect.top + scrollY - 35) + "px";
        icon.style.left = (rect.right + scrollX - 35) + "px";
    }

    positionIcon();
    document.body.appendChild(icon);

    const repositionHandler = () => positionIcon();
    window.addEventListener("scroll", repositionHandler, true);
    window.addEventListener("resize", repositionHandler);
    setInterval(positionIcon, 2000);

    icon.addEventListener("mouseenter", () => {
        icon.style.transform = "scale(1.15)";
        icon.style.boxShadow = "0 3px 12px rgba(75,46,43,0.3)";
    });
    icon.addEventListener("mouseleave", () => {
        icon.style.transform = "scale(1)";
        icon.style.boxShadow = "0 2px 8px rgba(75,46,43,0.2)";
    });

    icon.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        showTonePicker(input, icon);
    });
}

// ============================================
// SHOW TONE PICKER DROPDOWN
// ============================================
function showTonePicker(input, iconEl) {
    removeTonePicker();
    removeSuggestionBox();

    const text = getTextFromInput(input);
    if (!text || text.trim().length < 2) {
        showFloatingStatus("Type a message first!", input);
        return;
    }

    const picker = document.createElement("div");
    picker.id = "toneease-tone-picker";

    const iconRect = iconEl.getBoundingClientRect();
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const scrollX = window.scrollX || document.documentElement.scrollLeft;

    const spaceBelow = window.innerHeight - iconRect.bottom;
    const pickerHeight = 220;

    let topPos;
    if (spaceBelow < pickerHeight) {
        topPos = iconRect.top + scrollY - pickerHeight + 30;
    } else {
        topPos = iconRect.bottom + scrollY + 6;
    }

    let leftPos = iconRect.left + scrollX - 120;
    if (leftPos < 10) leftPos = 10;

    picker.style.cssText = `
        position: absolute;
        top: ${topPos}px;
        left: ${leftPos}px;
        z-index: 999999;
        background: #FFF8F0;
        border: 1px solid #C08552;
        border-radius: 10px;
        padding: 10px 0;
        box-shadow: 0 4px 20px rgba(75,46,43,0.2);
        font-family: Arial, sans-serif;
        min-width: 160px;
    `;

    const tones = [
        { value: "polite", label: "Polite", emoji: "&#129309;" },
        { value: "kind", label: "Kind", emoji: "&#128155;" },
        { value: "friendly", label: "Friendly", emoji: "&#128522;" },
        { value: "professional", label: "Professional", emoji: "&#128188;" },
        { value: "confident", label: "Confident", emoji: "&#128170;" }
    ];

    picker.innerHTML = `
        <div style="padding: 4px 14px 8px; color:#4B2E2B; font-weight:600; font-size:12px; border-bottom: 1px solid #E3DBBB; margin-bottom: 4px;">
            Rewrite as...
        </div>
    `;

    tones.forEach(tone => {
        const option = document.createElement("div");
        option.style.cssText = `
            padding: 8px 14px;
            cursor: pointer;
            font-size: 13px;
            color: #4B2E2B;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: background 0.1s;
        `;
        option.innerHTML = `<span>${tone.emoji}</span> <span>${tone.label}</span>`;

        option.addEventListener("mouseenter", () => {
            option.style.background = "#F5E6D3";
        });
        option.addEventListener("mouseleave", () => {
            option.style.background = "none";
        });

        option.addEventListener("click", async (e) => {
            e.stopPropagation();
            e.preventDefault();
            removeTonePicker();

            const originalIcon = iconEl.innerHTML;
            iconEl.innerHTML = "&#9203;";

            try {
                await doManualRewrite(text, input, tone.value);
            } catch (err) {
                console.error("ToneEase manual rewrite error:", err);
            }

            iconEl.innerHTML = originalIcon;
        });

        picker.appendChild(option);
    });

    document.body.appendChild(picker);

    setTimeout(() => {
        document.addEventListener("click", function closePicker(e) {
            if (!picker.contains(e.target) && e.target !== iconEl) {
                removeTonePicker();
                document.removeEventListener("click", closePicker);
            }
        });
    }, 100);
}

// ============================================
// FLOATING STATUS MESSAGE
// ============================================
function showFloatingStatus(message, input) {
    const existing = document.getElementById("toneease-float-status");
    if (existing) existing.remove();

    const status = document.createElement("div");
    status.id = "toneease-float-status";

    const rect = input.getBoundingClientRect();
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const scrollX = window.scrollX || document.documentElement.scrollLeft;

    status.style.cssText = `
        position: absolute;
        top: ${rect.top + scrollY - 40}px;
        left: ${rect.left + scrollX}px;
        z-index: 999999;
        background: #4B2E2B;
        color: white;
        padding: 6px 12px;
        border-radius: 6px;
        font-family: Arial, sans-serif;
        font-size: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;
    status.textContent = message;
    document.body.appendChild(status);

    setTimeout(() => status.remove(), 2000);
}

// ============================================
// MANUAL REWRITE (called from tone picker)
// ============================================
async function doManualRewrite(text, input, tone) {
    if (isAccepting) return;
    showLoading(input);

    try {
        let userId = null;
        let sessionId = null;
        try {
            const response = await new Promise((resolve) => {
                chrome.runtime.sendMessage({ type: "GET_USER_STATE" }, (res) => {
                    if (chrome.runtime.lastError) resolve(null);
                    else resolve(res);
                });
            });
            userId = response?.user_id || null;
            sessionId = response?.session_id || null;
        } catch (e) { /* ignore */ }

        const sensitivity = await new Promise((resolve) => {
            chrome.storage.local.get(["toneease_sensitivity"], (data) => {
                resolve(data.toneease_sensitivity || "medium");
            });
        });

        const res = await fetch(`${API_URL}/analyze`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text: text.trim(),
                mode: "manual",
                tone: tone,
                sensitivity: sensitivity,
                session_id: sessionId,
                user_id: userId
            })
        });

        const result = await res.json();
        console.log("ToneEase manual result:", result);

        if (result.suggestion && !isAccepting) {
            window.toneEaseCurrentHistoryId = result.history_id || null;
            createSuggestionBox(result.suggestion, input);
        }
    } catch (e) {
        console.error("ToneEase manual rewrite error:", e);
    }

    hideLoading();
}

// ============================================
// SAVE FEEDBACK
// ============================================
function saveFeedback(action) {
    if (!window.toneEaseCurrentHistoryId) return;
    try {
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
    } catch (e) {
        console.error("ToneEase runtime error:", e);
    }
}

// ============================================
// ANALYZE TEXT (auto mode)
// ============================================
function analyzeText(text, input) {
    if (!text || text.trim().length < 3) return;
    if (isAccepting) return;

    if (!chrome?.storage?.local) {
        console.log("ToneEase: Extension context lost. Please refresh the page.");
        return;
    }

    chrome.storage.local.get(["toneease_enabled", "toneease_mode"], (data) => {
        if (chrome.runtime.lastError) {
            console.log("ToneEase: Extension context lost.");
            return;
        }
        if (data.toneease_enabled === false) return;
        if (data.toneease_mode === "manual") return;

        try {
            chrome.runtime.sendMessage({ type: "GET_USER_STATE" }, async (response) => {
                if (chrome.runtime.lastError) {
                    doAnalyze(text, input, null, null);
                    return;
                }
                doAnalyze(text, input, response?.user_id || null, response?.session_id || null);
            });
        } catch (e) {
            doAnalyze(text, input, null, null);
        }
    });
}

async function doAnalyze(text, input, userId, sessionId) {
    if (isAccepting) return;
    showLoading(input);

    try {
        const settings = await new Promise((resolve) => {
            chrome.storage.local.get(["toneease_tone", "toneease_sensitivity"], (data) => {
                resolve({
                    tone: data.toneease_tone || "polite",
                    sensitivity: data.toneease_sensitivity || "medium"
                });
            });
        });

        const res = await fetch(`${API_URL}/analyze`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text: text.trim(),
                mode: "auto",
                tone: settings.tone,
                sensitivity: settings.sensitivity,
                session_id: sessionId,
                user_id: userId
            })
        });

        const result = await res.json();
        console.log("ToneEase result:", result);

        if (result.needs_rewrite && result.suggestion && !isAccepting) {
            window.toneEaseCurrentHistoryId = result.history_id || null;
            createSuggestionBox(result.suggestion, input);
        }
    } catch (e) {
        console.error("ToneEase analyze error:", e);
    }

    hideLoading();
}

// ============================================
// ATTACH TO INPUT
// ============================================
function attachToInput(input) {
    if (input.dataset.toneEaseAttached) return;
    input.dataset.toneEaseAttached = "true";

    createManualIcon(input);

    let typingTimer;
    input.addEventListener("input", () => {
        if (isAccepting) return;
        clearTimeout(typingTimer);
        removeSuggestionBox();
        const text = getTextFromInput(input);
        if (text.trim().length > 3) {
            typingTimer = setTimeout(() => {
                if (!isAccepting) {
                    analyzeText(text, input);
                }
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
    if (!selectors) return;
    selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(input => attachToInput(input));
    });
}

// ============================================
// OBSERVE DOM
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