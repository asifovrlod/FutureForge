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
    }
});

function updateIcon(enabled) {
    // Create an OffscreenCanvas
    const canvas = new OffscreenCanvas(16, 16);
    const ctx = canvas.getContext('2d');

    // Clear canvas
    ctx.clearRect(0, 0, 16, 16);

    // Set background transparent
    ctx.fillStyle = 'transparent';
    ctx.fillRect(0, 0, 16, 16);

    // Draw microphone shape
    ctx.fillStyle = enabled ? '#FF0000' : '#FFFFFF';
    ctx.strokeStyle = enabled ? '#FF0000' : '#FFFFFF';

    // Main mic body
    ctx.beginPath();
    ctx.roundRect(6, 2, 4, 8, 2);
    ctx.fill();

    // Mic stand
    ctx.beginPath();
    ctx.moveTo(8, 10);
    ctx.lineTo(8, 12);
    ctx.lineWidth = 2;
    ctx.stroke();

    // Mic base
    ctx.beginPath();
    ctx.moveTo(5, 12);
    ctx.lineTo(11, 12);
    ctx.lineWidth = 2;
    ctx.stroke();

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