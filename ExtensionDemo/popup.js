console.log("ToneEase Popup Loaded");

const manualToggle = document.getElementById("manualMode");
const toneBox = document.getElementById("toneSelectBox");

manualToggle.addEventListener("change", () => {
    if (manualToggle.checked) {
        toneBox.classList.remove("hidden");
    } else {
        toneBox.classList.add("hidden");
    }
});


document.getElementById("settingsBtn").addEventListener("click", () => {
    chrome.tabs.create({
        url: "dashboard.html"
    });
});

// Demo behavior only
document.querySelector(".apply-btn").addEventListener("click", () => {
    alert("Suggestion applied (demo)");
});

document.querySelector(".reject-btn").addEventListener("click", () => {
    alert("Suggestion rejected (demo)");
});
