let isEnabled = false;

// Initialize extension state
// chrome.runtime.onInstalled.addListener(() => {
//     chrome.storage.local.set({ isEnabled: true });
// });

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getState") {
        chrome.storage.local.get(['isEnabled'], function (result) {
            sendResponse({ isEnabled: result.isEnabled });
        });
        return true; // Required for async response
    }
});

// Update icon based on state
chrome.storage.local.onChanged.addListener((changes) => {
    console.log("changes", changes);
    if (changes.isEnabled) {
        updateIcon(changes.isEnabled.newValue);
        document.querySelectorAll('input[type="text"], input[type="search"], input[type="email"], input[type="tel"], textarea').forEach(input => {
            addMicIconToInput(input);
        });
    }
});

function updateIcon(enabled) {
    // Create an OffscreenCanvas
    const canvas = new OffscreenCanvas(16, 16);
    const ctx = canvas.getContext('2d');

    // Clear canvas             
    ctx.clearRect(0, 0, 16, 16);

    if (enabled) {
        ctx.beginPath();
        ctx.arc(12, 4, 2, 0, 2 * Math.PI);
        ctx.fillStyle = '#FF0000';
        ctx.fill();
    }

    // Get the ImageData and set it as the icon
    const imageData = ctx.getImageData(0, 0, 16, 16);

    chrome.action.setIcon({
        imageData: imageData
    }, () => {
        if (chrome.runtime.lastError) {
            console.error('Error updating icon:', chrome.runtime.lastError.message);
        }
    });
}

// Draw recording circle when enabled




