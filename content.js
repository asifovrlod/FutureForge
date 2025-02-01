// Add Font Awesome CSS
const fontAwesomeLink = document.createElement('link');
fontAwesomeLink.rel = 'stylesheet';
fontAwesomeLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css';
document.head.appendChild(fontAwesomeLink);

// Create and inject styles
const styles = `
    .voice-popup {
        position: fixed;
        background: white;
        border-radius: 8px;
        padding: 15px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-family: Arial, sans-serif;
        max-width: 300px;
        border: 1px solid #ddd;
    }
    
    .voice-popup-header {
        font-weight: bold;
        margin-bottom: 10px;
        color: #333;
        display: flex;
        align-items: center;
        gap: 8px;
    }
    
    .voice-popup-header i {
        color: #007bff;
    }
    
    .voice-popup-buttons {
        display: flex;
        gap: 10px;
        margin-top: 12px;
    }
    
    .voice-btn {
        padding: 8px 16px;
        border-radius: 4px;
        border: none;
        cursor: pointer;
        font-size: 14px;
        transition: background-color 0.2s;
    }
    
    .voice-btn-primary {
        background: #007bff;
        color: white;
    }
    
    .voice-btn-primary:hover {
        background: #0056b3;
    }
    
    .voice-btn-secondary {
        background: #e9ecef;
        color: #333;
    }
    
    .voice-btn-secondary:hover {
        background: #dde2e6;
    }
    
    .voice-input-active {
        outline: 2px solid #007bff !important;
    }
    
    .voice-indicator {
        position: fixed;
        top: 20px;
        right: 20px;
        background: #007bff;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 8px;
        z-index: 10000;
        animation: pulse 1.5s infinite;
    }
    
    .next-field-highlight {
        outline: 2px dashed #28a745 !important;
    }
    
    @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.7; }
        100% { opacity: 1; }
    }
    
    .permission-popup {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10001;
        max-width: 400px;
        text-align: center;
    }
    
    .permission-buttons {
        display: flex;
        gap: 10px;
        justify-content: center;
        margin-top: 15px;
    }
    
    .voice-mic-button {
        position: absolute;
        right: 10px;
        background: none;
        border: none;
        cursor: pointer;
        padding: 5px;
        color: #007bff;
        transition: color 0.2s, opacity 0.2s;
        opacity: 0;
        pointer-events: none;
        z-index: 2;
    }
    
    .voice-mic-button i {
        font-size: 16px;
    }
    
    .form-group {
        position: relative;
    }

    *:has(> input, > textarea):hover .voice-mic-button,
    *:has(> input, > textarea):focus-within .voice-mic-button {
        opacity: 1;
        pointer-events: auto;
    }
        
`;

// Inject styles
const styleSheet = document.createElement("style");
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);

let currentInput = null;
let recognition = null;
let isFirstTime = true;
let allInputFields = [];
let currentInputIndex = -1;
let microphonePermissionGranted = true;
let hasInitialized = false;
let hasCheckedPermission = false; // Added this line

function initializeSpeechRecognition() {
    if (recognition) {
        return recognition;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        showIndicator('Speech recognition not supported', true);
        return null;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        showIndicator('Listening...');
        if (currentInput) {
            currentInput.classList.add('voice-input-active');
        }
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (currentInput) {
            currentInput.value = transcript.replace(/\bat the rate\b/g, "@").replace(/\s*@\s*/g, "@");
            currentInput.dispatchEvent(new Event('input', { bubbles: true }));

            // Save to storage
            chrome.storage.local.get(['voiceLogs'], function (result) {
                const logs = result.voiceLogs || [];
                logs.push({
                    timestamp: new Date().toLocaleString(),
                    text: transcript,
                    field: currentInput.name || currentInput.id || 'unnamed field'
                });

                console.log(logs);
                if (logs.length > 50) logs.shift();
                chrome.storage.local.set({ voiceLogs: logs });
            });

            // Move to next field automatically
            setTimeout(() => {
                moveToNextField();
            }, 500);
        }
    };

    recognition.onerror = (event) => {
        if (event.error === 'not-allowed' && !microphonePermissionGranted) {
            showIndicator('Please allow microphone access to use voice input', true);
        } else {
            showIndicator(`Error: ${event.error}`, true);
        }
        resetInterface();
    };

    recognition.onend = () => {
        if (currentInput) {
            currentInput.classList.remove('voice-input-active');
        }
    };

    return recognition;
}

function createInitialPopup() {
    if (hasInitialized) {
        return;
    }
    hasInitialized = true;

    const popup = document.createElement('div');
    popup.className = 'voice-popup';
    popup.style.top = '20%';
    popup.style.left = '50%';
    popup.style.transform = 'translateX(-50%)';

    popup.innerHTML = `
        <div class="voice-popup-header">
            <i class="fas fa-microphone"></i>
            <span>Would you like to fill forms using voice commands?</span>
        </div>
        <p style="margin: 10px 0; color: #666;">
            You'll be asked to allow microphone access once to enable voice input.
        </p>
        <div class="voice-popup-buttons">
            <button class="voice-btn voice-btn-primary" id="startVoiceSeries">Yes, start voice input</button>
            <button class="voice-btn voice-btn-secondary" id="cancelVoice">Cancel</button>
        </div>
    `;

    document.body.appendChild(popup);

    document.getElementById('startVoiceSeries').addEventListener('click', async () => {
        popup.remove();
        await startVoiceInputSeries();
    });

    document.getElementById('cancelVoice').addEventListener('click', () => {
        popup.remove();
    });
}

async function startVoiceInputSeries() {
    // Only check permission once
    if (!hasCheckedPermission) {
        if (!microphonePermissionGranted) {
            const permitted = await requestMicrophonePermission();
            if (!permitted) {
                return;
            }
        }
        hasCheckedPermission = true;  // Set flag after checking permission
    }

    // Get all input fields
    allInputFields = Array.from(document.querySelectorAll('input[type="text"], input[type="search"], input[type="email"], input[type="tel"], textarea'))
        .filter(input => isVisibleInput(input));

    if (allInputFields.length === 0) {
        showIndicator('No input fields found', true);
        return;
    }

    currentInputIndex = 0;
    startVoiceForCurrentField();
}

function isVisibleInput(element) {
    return element.offsetParent !== null &&
        !element.disabled &&
        !element.readOnly &&
        window.getComputedStyle(element).display !== 'none' &&
        window.getComputedStyle(element).visibility !== 'hidden';
}

function startVoiceForCurrentField() {
    if (currentInputIndex >= 0 && currentInputIndex < allInputFields.length) {
        currentInput = allInputFields[currentInputIndex];
        currentInput.focus();

        if (!recognition) {
            recognition = initializeSpeechRecognition();
        }

        try {
            recognition.start();
        } catch (error) {
            showIndicator('Error starting voice recognition', true);
        }
    } else {
        showIndicator('Voice input completed! ✨', false);
        setTimeout(() => removeIndicator(), 2000);
        resetInterface();


    }
}

function moveToNextField() {
    currentInputIndex++;
    if (currentInputIndex < allInputFields.length) {
        // Highlight next field
        const nextInput = allInputFields[currentInputIndex];
        nextInput.classList.add('next-field-highlight');
        setTimeout(() => {
            nextInput.classList.remove('next-field-highlight');
            startVoiceForCurrentField();
        }, 1000);
    } else {
        showIndicator('All fields completed! ✨', false);
        setTimeout(() => removeIndicator(), 2000);
        resetInterface();
    }
}

function showIndicator(message, isError = false) {
    removeIndicator();
    const indicator = document.createElement('div');
    indicator.className = 'voice-indicator';
    indicator.style.backgroundColor = isError ? '#dc3545' : '#007bff';
    indicator.innerHTML = `
        <i class="${isError ? 'fas fa-exclamation-circle' : 'fas fa-microphone'}"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(indicator);

    if (isError) {
        recognition.stop();
        resetInterface();
        setTimeout(removeIndicator, 3000);
    }
}

function removeIndicator() {
    const existing = document.querySelector('.voice-indicator');
    if (existing) {
        existing.remove();
    }
}

function resetInterface() {
    if (currentInput) {
        currentInput.classList.remove('voice-input-active');
    }
    currentInput = null;
    currentInputIndex = -1;
    allInputFields = [];
    hasInitialized = false;
    hasCheckedPermission = true;
}

// Handle initial click on any input field
document.addEventListener('click', (event) => {
    const input = event.target;
    if (isVisibleInput(input) && isFirstTime && !document.querySelector('.voice-popup')) {
        isFirstTime = false;
        createInitialPopup();
        microphonePermissionGranted = true;
    }
});

// Handle ESC key to cancel
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        if (recognition) {
            recognition.stop();
        }
        resetInterface();
        removeIndicator();
        microphonePermissionGranted = true;
    }
});

// Handle dynamically added inputs
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1) { // Element node
                    const inputs = node.querySelectorAll('input[type="text"], input[type="search"], input[type="email"], input[type="tel"], textarea');
                    inputs.forEach(input => {
                        if (!input.hasAttribute('voice-enabled')) {
                            addMicIconToInput(input);
                        }
                    });
                }
            });
        }
    });
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

// Add this new function to handle microphone permission

async function requestMicrophonePermission() {
    return new Promise(async (resolve) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop()); // Stop the stream immediately
            microphonePermissionGranted = true; // Set permission to true 
            resolve(true);
        } catch (error) {
            console.error('Microphone permission denied:', error);
            showIndicator('Microphone access denied. Please allow microphone access.', true);
            resolve(false);
        }
    });
}

function addMicIconToInput(input) {
    // Try to find any parent element that could be a form group or container
    const formGroup = input.closest('div, form, fieldset, .form-group, .input-group, p, label, span, div');

    if (!formGroup || formGroup.querySelector('.voice-mic-button')) {
        return;
    }

    // Create mic button
    const micButton = document.createElement('div');

    micButton.className = 'voice-mic-button';
    micButton.innerHTML = '<i class="fas fa-microphone"></i>';
    micButton.title = 'Click to input by voice';

    // Calculate position
    function updateMicPosition() {
        const label = formGroup.querySelector('label');
        const inputRect = input.getBoundingClientRect();
        const formGroupRect = formGroup.getBoundingClientRect();

        let topOffset;
        if (label) {
            const labelHeight = label.offsetHeight;
            // Calculate the input's position relative to the form-group
            const inputTop = inputRect.top - formGroupRect.top;
            // Position mic button at 50% of the remaining space after the label
            topOffset = labelHeight + (inputTop - labelHeight) + (input.offsetHeight / 2);
            micButton.style.top = `${topOffset}px`;
        } else {
            // If no label, set top to 50%
            micButton.style.top = '50%';
        }

        micButton.style.transform = 'translateY(-50%)';


    }

    // Add click handler
    micButton.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        currentInput = input;
        if (!hasCheckedPermission) {
            if (!microphonePermissionGranted) {
                const permitted = await requestMicrophonePermission();
                if (!permitted) {
                    return;
                }
            }
            hasCheckedPermission = true;
        }

        if (!recognition) {
            recognition = initializeSpeechRecognition();
        }

        try {
            recognition.start();
        } catch (error) {
            showIndicator('Error starting voice recognition', true);
        }
    });

    formGroup.appendChild(micButton);
    input.setAttribute('voice-enabled', 'true');

    // Initial position calculation
    setTimeout(updateMicPosition, 0);

    // Update position on window resize
    window.addEventListener('resize', updateMicPosition);

    // Create a ResizeObserver to handle dynamic content changes
    const resizeObserver = new ResizeObserver(updateMicPosition);
    resizeObserver.observe(formGroup);
}

// Add mic icons to existing inputs when the script loads
document.querySelectorAll('input[type="text"], input[type="search"], input[type="email"], input[type="tel"], textarea').forEach(input => {
    addMicIconToInput(input);
});


