const API_URL = "http://127.0.0.1:8000";

function showMessage(text, type) {
    const el = document.getElementById("message");
    el.textContent = text;
    el.className = "message " + type;
}

document.getElementById("loginBtn").addEventListener("click", async () => {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const btn = document.getElementById("loginBtn");

    if (!email || !password) {
        showMessage("Please fill in all fields.", "error");
        return;
    }

    btn.disabled = true;
    btn.textContent = "Signing in...";

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const result = await response.json();

        if (result.status === "success") {
            chrome.storage.local.set({
                user_id: result.user_id,
                username: result.username,
                email: result.email,
                is_logged_in: true
            }, () => {
                chrome.storage.local.get(["session_id"], async (data) => {
                    if (data.session_id) {
                        await fetch(`${API_URL}/link-session`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                session_id: data.session_id,
                                user_id: result.user_id
                            })
                        });
                    }
                    showMessage("Welcome back, " + result.username + "!", "success");
                    setTimeout(() => window.close(), 1500);
                });
            });
        } else {
            showMessage(result.detail || "Invalid email or password.", "error");
        }
    } catch (error) {
        showMessage("Cannot connect to backend. Make sure it's running!", "error");
    } finally {
        btn.disabled = false;
        btn.textContent = "Sign In";
    }
});

document.getElementById("guestBtn").addEventListener("click", () => {
    chrome.storage.local.set({ is_logged_in: false }, () => {
        window.close();
    });
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("loginBtn").click();
});