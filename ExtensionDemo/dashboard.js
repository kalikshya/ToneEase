console.log("Dashboard loaded");

const API_URL = "http://127.0.0.1:8000";

// Clear old localStorage history once and for all
localStorage.removeItem("toneease_history");

// Tab switching logic
document.addEventListener("DOMContentLoaded", () => {
    const navItems = document.querySelectorAll(".nav-item");
    const sections = document.querySelectorAll(".section-content");

    navItems.forEach(item => {
        item.addEventListener("click", () => {
            navItems.forEach(nav => nav.classList.remove("active"));
            sections.forEach(section => section.classList.remove("active"));

            item.classList.add("active");

            const target = item.getAttribute("data-target");
            const targetSection = document.getElementById(target);
            if (targetSection) {
                targetSection.classList.add("active");
                if (target === "history") loadHistory();
            }
        });
    });

    // Clear history button
    const clearBtn = document.getElementById("clearHistoryBtn");
    if (clearBtn) {
        clearBtn.addEventListener("click", clearHistory);
    }

    // Load history if already on history tab
    const activeSection = document.querySelector(".section-content.active");
    if (activeSection && activeSection.id === "history") loadHistory();
});

// ============================================
// LOAD HISTORY FROM DATABASE
// ============================================
async function loadHistory() {
    const historyContainer = document.getElementById("historyContainer");
    const historyStatus = document.getElementById("historyStatus");
    if (!historyContainer) return;

    historyContainer.innerHTML = '<p style="color: #666;">Loading history...</p>';

    chrome.storage.local.get(["user_id", "username", "is_logged_in", "session_id"], async (data) => {
        try {
            let records = [];

            if (data.is_logged_in && data.user_id) {
                // Logged in — fetch by user_id
                if (historyStatus) historyStatus.textContent = "Showing history for: " + (data.username || "your account");
                const response = await fetch(`${API_URL}/history/${data.user_id}`);
                const result = await response.json();
                records = result.history || [];
            } else if (data.session_id) {
                // Guest — fetch by session_id
                if (historyStatus) historyStatus.textContent = "Guest mode — sign in to save history permanently";
                const response = await fetch(`${API_URL}/history/session/${data.session_id}`);
                const result = await response.json();
                records = result.history || [];
            } else {
                historyContainer.innerHTML = '<p style="color: #666;">No history yet. Start using ToneEase!</p>';
                return;
            }

            if (records.length === 0) {
                historyContainer.innerHTML = '<p style="color: #666;">No history yet. Start using ToneEase to see your activity here!</p>';
                return;
            }

            let tableHTML = `
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f5f5f5; text-align: left;">
                            <th style="padding: 12px; border-bottom: 2px solid #ddd;">Date</th>
                            <th style="padding: 12px; border-bottom: 2px solid #ddd;">Action</th>
                            <th style="padding: 12px; border-bottom: 2px solid #ddd;">Original</th>
                            <th style="padding: 12px; border-bottom: 2px solid #ddd;">Rewritten</th>
                            <th style="padding: 12px; border-bottom: 2px solid #ddd;">Tone</th>
                            <th style="padding: 12px; border-bottom: 2px solid #ddd;">Mode</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            records.forEach((entry, index) => {
                const bgColor = index % 2 === 0 ? "#fff" : "#f9f9f9";
                const action = entry.feedback_action || "Pending";
                const actionColor = action === "accepted" ? "#4CAF50" : action === "rejected" ? "#f44336" : "#999";
                const date = new Date(entry.created_at).toLocaleDateString();

                tableHTML += `
                    <tr style="background: ${bgColor};">
                        <td style="padding: 10px; border-bottom: 1px solid #eee;">${date}</td>
                        <td style="padding: 10px; border-bottom: 1px solid #eee;">
                            <span style="color: ${actionColor}; font-weight: 600; text-transform: capitalize;">
                                ${action}
                            </span>
                        </td>
                        <td style="padding: 10px; border-bottom: 1px solid #eee; max-width: 200px; word-wrap: break-word;">
                            "${entry.original_text || "N/A"}"
                        </td>
                        <td style="padding: 10px; border-bottom: 1px solid #eee; max-width: 200px; word-wrap: break-word;">
                            "${entry.rewritten_text || "N/A"}"
                        </td>
                        <td style="padding: 10px; border-bottom: 1px solid #eee; text-transform: capitalize;">
                            ${entry.detected_tone || "neutral"}
                        </td>
                        <td style="padding: 10px; border-bottom: 1px solid #eee; text-transform: capitalize;">
                            ${entry.mode || "auto"}
                        </td>
                    </tr>
                `;
            });

            tableHTML += `</tbody></table>`;
            historyContainer.innerHTML = tableHTML;

        } catch (error) {
            console.error("Error loading history:", error);
            historyContainer.innerHTML = '<p style="color: red;">Failed to load history. Make sure backend is running!</p>';
        }
    });
}

// ============================================
// CLEAR HISTORY
// ============================================
function clearHistory() {
    if (confirm("Are you sure you want to clear all history?")) {
        const historyContainer = document.getElementById("historyContainer");
        if (historyContainer) {
            historyContainer.innerHTML = '<p style="color: #666;">History cleared.</p>';
        }
        const historyStatus = document.getElementById("historyStatus");
        if (historyStatus) historyStatus.textContent = "";
    }
}