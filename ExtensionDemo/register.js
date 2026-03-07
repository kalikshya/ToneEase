const API_URL = "http://127.0.0.1:8000";

function showMessage(text, type) {
    const el = document.getElementById("message");
    el.textContent = text;
    el.className = "message " + type;
}

document.getElementById("registerBtn").addEventListener("click", async () => {
    const username = document.getElementById("username").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const btn = document.getElementById("registerBtn");

    if (!username || !email || !password) {
        showMessage("Please fill in all fields.", "error");
        return;
    }

    if (password.length < 6) {
        showMessage("Password must be at least 6 characters.", "error");
        return;
    }

    btn.disabled = true;
    btn.textContent = "Creating account...";

    try {
        const response = await fetch(`${API_URL}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email, password })
        });

        const result = await response.json();

        if (result.status === "success") {
            chrome.storage.local.set({
                user_id: result.user_id,
                username: result.username,
                email: email,
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
                    showMessage("Account created! You can close this tab.", "success");
                    setTimeout(() => window.close(), 1500);
                });
            });
        } else {
            showMessage(result.detail || result.error || "Registration failed.", "error");
        }
    } catch (error) {
        showMessage("Cannot connect to backend. Make sure it's running!", "error");
    } finally {
        btn.disabled = false;
        btn.textContent = "Create Account";
    }
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("registerBtn").click();
});