console.log("Dashboard loaded");

const API_URL = "http://127.0.0.1:8000";

localStorage.removeItem("toneease_history");

let allRecords = [];

// ============================================
// TAB SWITCHING
// ============================================
document.addEventListener("DOMContentLoaded", () => {
    const navItems = document.querySelectorAll(".nav-item");
    const sections = document.querySelectorAll(".section-content");

    navItems.forEach(item => {
        item.addEventListener("click", () => {
            navItems.forEach(n => n.classList.remove("active"));
            sections.forEach(s => s.classList.remove("active"));
            item.classList.add("active");
            const target = item.getAttribute("data-target");
            const section = document.getElementById(target);
            if (section) {
                section.classList.add("active");
                if (target === "history") loadHistory();
            }
        });
    });

    // Filter buttons
    document.querySelectorAll(".filter-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            renderTable(btn.getAttribute("data-filter"));
        });
    });

    // Clear button
    const clearBtn = document.getElementById("clearHistoryBtn");
    if (clearBtn) clearBtn.addEventListener("click", clearHistory);

    // Sign out button
    const signoutBtn = document.getElementById("signoutBtn");
    if (signoutBtn) {
        signoutBtn.addEventListener("click", () => {
            chrome.storage.local.set({
                user_id: null, username: null, email: null, is_logged_in: false
            }, () => { window.close(); });
        });
    }

    // Tone option selection
    document.querySelectorAll(".tone-option").forEach(opt => {
        opt.addEventListener("click", () => {
            document.querySelectorAll(".tone-option").forEach(o => o.classList.remove("active"));
            opt.classList.add("active");
        });
    });

    loadUserInfo();
});

// ============================================
// LOAD USER INFO
// ============================================
function loadUserInfo() {
    chrome.storage.local.get(["user_id", "username", "email", "is_logged_in"], (data) => {
        const username = data.is_logged_in && data.username ? data.username : "Guest";
        const email = data.is_logged_in && data.email ? data.email : "Not signed in";
        const initials = username !== "Guest" ? username.substring(0, 2).toUpperCase() : "?";

        const els = {
            sidebarAvatar: document.getElementById("sidebarAvatar"),
            sidebarUsername: document.getElementById("sidebarUsername"),
            sidebarEmail: document.getElementById("sidebarEmail"),
            prefAvatar: document.getElementById("prefAvatar"),
            prefUsername: document.getElementById("prefUsername"),
            prefEmail: document.getElementById("prefEmail"),
        };

        if (els.sidebarAvatar) els.sidebarAvatar.textContent = initials;
        if (els.sidebarUsername) els.sidebarUsername.textContent = username;
        if (els.sidebarEmail) els.sidebarEmail.textContent = email;
        if (els.prefAvatar) els.prefAvatar.textContent = initials;
        if (els.prefUsername) els.prefUsername.textContent = username;
        if (els.prefEmail) els.prefEmail.textContent = email;
    });
}

// ============================================
// LOAD HISTORY
// ============================================
async function loadHistory() {
    const historyContainer = document.getElementById("historyContainer");
    const historyStatus = document.getElementById("historyStatus");
    if (!historyContainer) return;

    historyContainer.innerHTML = `
        <div class="history-empty">
            <div class="history-empty-icon">⏳</div>
            <p>Loading your history...</p>
        </div>`;

    chrome.storage.local.get(["user_id", "username", "is_logged_in", "session_id"], async (data) => {
        try {
            let records = [];

            if (data.is_logged_in && data.user_id) {
                if (historyStatus) historyStatus.textContent = "Showing history for: " + (data.username || "your account");
                const response = await fetch(`${API_URL}/history/${data.user_id}`);
                const result = await response.json();
                records = result.history || [];
            } else if (data.session_id) {
                if (historyStatus) historyStatus.textContent = "Guest mode — sign in to save history permanently";
                const response = await fetch(`${API_URL}/history/session/${data.session_id}`);
                const result = await response.json();
                records = result.history || [];
            } else {
                historyContainer.innerHTML = `
                    <div class="history-empty">
                        <div class="history-empty-icon">📭</div>
                        <p>No history yet. Start using ToneEase!</p>
                    </div>`;
                return;
            }

            allRecords = records;
            updateStats(records);
            renderTable("all");

        } catch (error) {
            console.error("Error loading history:", error);
            historyContainer.innerHTML = `
                <div class="history-empty">
                    <div class="history-empty-icon">⚠️</div>
                    <p>Failed to load history. Make sure backend is running!</p>
                </div>`;
        }
    });
}

// ============================================
// UPDATE STATS
// ============================================
function updateStats(records) {
    const total = records.length;
    const accepted = records.filter(r => r.feedback_action === "accepted").length;
    const rate = total > 0 ? Math.round((accepted / total) * 100) + "%" : "—";

    const statTotal = document.getElementById("statTotal");
    const statAccepted = document.getElementById("statAccepted");
    const statRate = document.getElementById("statRate");

    if (statTotal) statTotal.textContent = total || "0";
    if (statAccepted) statAccepted.textContent = accepted || "0";
    if (statRate) statRate.textContent = rate;
}

// ============================================
// RENDER TABLE
// ============================================
function renderTable(filter) {
    const historyContainer = document.getElementById("historyContainer");
    if (!historyContainer) return;

    let records = allRecords;
    if (filter === "accepted") records = allRecords.filter(r => r.feedback_action === "accepted");
    if (filter === "rejected") records = allRecords.filter(r => r.feedback_action === "rejected");

    if (records.length === 0) {
        historyContainer.innerHTML = `
            <div class="history-empty">
                <div class="history-empty-icon">📭</div>
                <p>No records found.</p>
            </div>`;
        return;
    }

    let tableHTML = `
        <div class="table-wrapper">
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Original</th>
                    <th>Rewritten</th>
                    <th>Tone</th>
                    <th>Mode</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>`;

    records.forEach(entry => {
        const action = entry.feedback_action || "pending";
        const actionClass = action === "accepted" ? "action-accepted" :
                            action === "rejected" ? "action-rejected" : "action-pending";
        const date = new Date(entry.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

        tableHTML += `
            <tr>
                <td style="white-space:nowrap; color:var(--text-light);">${date}</td>
                <td>${entry.original_text || "N/A"}</td>
                <td>${entry.rewritten_text || "—"}</td>
                <td><span class="tone-pill">${entry.detected_tone || "neutral"}</span></td>
                <td style="text-transform:capitalize; color:var(--text-light);">${entry.mode || "auto"}</td>
                <td><span class="${actionClass}">${action}</span></td>
            </tr>`;
    });

    tableHTML += `</tbody></table></div>`;
    historyContainer.innerHTML = tableHTML;
}

// ============================================
// CLEAR HISTORY
// ============================================
function clearHistory() {
    if (confirm("Are you sure you want to clear all displayed history?")) {
        allRecords = [];
        renderTable("all");
        updateStats([]);
        const historyStatus = document.getElementById("historyStatus");
        if (historyStatus) historyStatus.textContent = "";
    }
}