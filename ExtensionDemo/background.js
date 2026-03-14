// ToneEase Background Service Worker

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "GET_USER_STATE") {
        chrome.storage.local.get(["user_id", "session_id", "is_logged_in"], (data) => {
            sendResponse({
                user_id: data.is_logged_in ? data.user_id : null,
                session_id: data.session_id || null,
                is_logged_in: data.is_logged_in || false
            });
        });
        return true;
    }

    if (message.type === "LOGIN_SUCCESS") {
        console.log("ToneEase: Login successful");
    }
});