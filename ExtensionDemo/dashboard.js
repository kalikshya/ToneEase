console.log("Dashboard loaded");

// Tab switching logic
document.addEventListener("DOMContentLoaded", () => {
    const navItems = document.querySelectorAll(".nav-item");
    const sections = document.querySelectorAll(".section-content");
    
    navItems.forEach(item => {
        item.addEventListener("click", () => {
            // Remove active class from all items
            navItems.forEach(nav => nav.classList.remove("active"));
            sections.forEach(section => section.classList.remove("active"));
            
         // Add active class to clicked item
            item.classList.add("active");
            
            // Show corresponding section
            const target = item.getAttribute("data-target");
            const targetSection = document.getElementById(target);
            if (targetSection) {
                targetSection.classList.add("active");
                
                // Load history only when History tab is clicked
                if (target === "history") {
                    loadHistory();
                }
            }
        });
    });
    
    // Load history on initial page load if history is active
    const activeSection = document.querySelector(".section-content.active");
    if (activeSection && activeSection.id === "history") {
        loadHistory();
    }
});

// Load history from localStorage
function loadHistory() {
    const historyContainer = document.getElementById("historyContainer");
    
    if (!historyContainer) {
        console.log("History container not found");
        return;
    }
    
    const history = JSON.parse(localStorage.getItem("toneease_history") || "[]");
    
    if (history.length === 0) {
        historyContainer.innerHTML = '<p style="color: #666;">No history yet. Start using ToneEase to see your activity here!</p>';
        return;
    }
    
    // Create table
    let tableHTML = `
        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr style="background: #f5f5f5; text-align: left;">
                    <th style="padding: 12px; border-bottom: 2px solid #ddd;">Date</th>
                    <th style="padding: 12px; border-bottom: 2px solid #ddd;">Action</th>
                    <th style="padding: 12px; border-bottom: 2px solid #ddd;">Original</th>
                    <th style="padding: 12px; border-bottom: 2px solid #ddd;">Suggestion</th>
                    <th style="padding: 12px; border-bottom: 2px solid #ddd;">Mode</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    history.forEach((entry, index) => {
        const bgColor = index % 2 === 0 ? '#fff' : '#f9f9f9';
        tableHTML += `
            <tr style="background: ${bgColor};">
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${entry.date}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">
                    <span style="color: ${entry.action.includes('Accepted') ? '#4CAF50' : '#f44336'}; font-weight: 600;">
                        ${entry.action}
                    </span>
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; max-width: 250px; word-wrap: break-word;">
                    "${entry.original || 'N/A'}"
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; max-width: 250px; word-wrap: break-word;">
                    "${entry.suggestion || 'N/A'}"
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${entry.mode}</td>
            </tr>
        `;
    });
    
    tableHTML += `
            </tbody>
        </table>
    `;
    
    historyContainer.innerHTML = tableHTML;
    console.log("History loaded:", history.length, "entries");
}

// Clear history button
function clearHistory() {
    if (confirm("Are you sure you want to clear all history?")) {
        localStorage.removeItem("toneease_history");
        loadHistory();
        alert("History cleared!");
    }
}