let recognition = null;
const MAX_LOG_ENTRIES = 50; // Maximum number of log entries to keep

// Add a status message element to show what's happening
let isListening = false;

// Add state variable at the top
let isExtensionEnabled = false;

// Initialize and handle toggle state
const toggleExtension = document.getElementById('toggleExtension');

// Load initial state
chrome.storage.local.get('isEnabled', ({ isEnabled = false }) => {
    toggleExtension.checked = isEnabled;
    updateUIState(isEnabled);
});

// Handle toggle changes
toggleExtension.addEventListener('change', ({ target }) => {
    const isEnabled = target.checked;
    chrome.storage.local.set({ isEnabled });
    updateUIState(isEnabled);
});

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function () {
    // Load extension state
    // chrome.storage.local.get(['isEnabled'], function (result) {
    //     isExtensionEnabled = result.isEnabled !== undefined ? result.isEnabled : true;
    //     updateUIState();
    // });

    // Load logs when popup opens
    loadLogs();

    // Add click listener for the start button
    // const startButton = document.getElementById('startButton');
    // const statusDiv = document.getElementById('status');
    // const logContainer = document.getElementById('logContainer');

    // Add toggle functionality
    // startButton.addEventListener('click', async () => {
    //     if (!isExtensionEnabled) {
    //         return; // Don't do anything if extension is disabled
    //     }

    //     try {
    //         const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    //         // Update button state
    //         if (!isListening) {
    //             startButton.textContent = 'Stop Listening';
    //             statusDiv.textContent = 'Listening...';
    //             isListening = true;
    //         } else {
    //             startButton.textContent = 'Start Voice Input';
    //             statusDiv.textContent = 'Stopped';
    //             isListening = false;
    //         }

    //         // Execute speech recognition and pass callback
    //         await chrome.scripting.executeScript({
    //             target: { tabId: tab.id },
    //             function: startSpeechRecognition,
    //         });
    //     } catch (error) {
    //         console.error('Error:', error);
    //         statusDiv.textContent = 'Error: ' + error.message;
    //     }
    // });

    // Add click listener for extension icon (browser action)
    // chrome.action.onClicked.addListener(() => {
    //     isExtensionEnabled = !isExtensionEnabled;
    //     chrome.storage.local.set({ isEnabled: isExtensionEnabled });
    //     updateUIState();
    // });
});

// Function to add log entry
function addLogEntry(command, success = true) {
    const timestamp = new Date().toLocaleString();
    const logEntry = {
        timestamp,
        command,
        success
    };

    // Get existing logs
    chrome.storage.local.get(['voiceLogs'], (result) => {
        let logs = result.voiceLogs || [];
        logs.unshift(logEntry); // Add new log at the beginning

        // Keep only the latest MAX_LOG_ENTRIES entries
        logs = logs.slice(0, MAX_LOG_ENTRIES);

        // Save updated logs
        chrome.storage.local.set({ voiceLogs: logs }, () => {
            displayLogs(logs);
        });
    });
}

// Function to display logs
function displayLogs(logs) {
    const logContainer = document.getElementById('logContainer');
    logContainer.innerHTML = '';

    logs.forEach(log => {
        const logElement = document.createElement('div');
        logElement.className = 'log-entry';
        logElement.innerHTML = `
      <span class="timestamp">${log.timestamp}</span><br>
      <strong>Command:</strong> ${log.command}<br>
      <strong>Status:</strong> ${log.success ? '✅ Success' : '❌ Failed'}
    `;
        logContainer.appendChild(logElement);
    });
}

// Function to load logs
function loadLogs() {
    // chrome.storage.local.get(['voiceLogs'], function (result) {
    //     const logs = result.voiceLogs || [];
    //     logContainer.innerHTML = ''; // Clear existing logs

    //     logs.reverse().forEach(log => {
    //         const logEntry = document.createElement('div');
    //         logEntry.className = 'log-entry';
    //         logEntry.innerHTML = `
    //             <strong>${log.timestamp}</strong><br>
    //             Text: "${log.text}"
    //         `;
    //         logContainer.appendChild(logEntry);
    //     });
    // });
}

// Function to save a new log
function saveLog(text) {
    chrome.storage.local.get(['chatHistory'], function (result) {
        const chatHistory = result.chatHistory || [];
        const newLog = {
            timestamp: new Date().toLocaleString(),
            text: text
        };

        chatHistory.push(newLog);
        chrome.storage.local.set({ chatHistory: chatHistory });
        loadLogs(); // Reload the display
    });
}

// This function will be injected into the page
function startSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        console.log('Speech recognition started');
        showFeedback('🎤 Listening...');
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        console.log('Transcript:', transcript);

        // Find active element and update its value
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
            activeElement.value = transcript;
            activeElement.dispatchEvent(new Event('input', { bubbles: true }));
        }

        // Save to storage
        chrome.storage.local.get(['voiceLogs'], function (result) {
            const logs = result.voiceLogs || [];
            logs.push({
                timestamp: new Date().toLocaleString(),
                text: transcript
            });

            // Keep only last 50 entries
            if (logs.length > 50) {
                logs.shift();
            }

            chrome.storage.local.set({ voiceLogs: logs }, function () {
                // Notify the popup to refresh logs
                chrome.runtime.sendMessage({ action: 'refreshLogs' });
            });
        });
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        showFeedback('❌ Error: ' + event.error, true);
    };

    recognition.onend = () => {
        console.log('Speech recognition ended');
        removeFeedback();
    };

    function showFeedback(message, isError = false) {
        let feedback = document.getElementById('speech-feedback');
        if (!feedback) {
            feedback = document.createElement('div');
            feedback.id = 'speech-feedback';
            feedback.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 10px 20px;
                border-radius: 5px;
                z-index: 10000;
                color: white;
            `;
            document.body.appendChild(feedback);
        }
        feedback.style.backgroundColor = isError ? '#dc3545' : '#007bff';
        feedback.textContent = message;
    }

    function removeFeedback() {
        const feedback = document.getElementById('speech-feedback');
        if (feedback) {
            feedback.remove();
        }
    }

    recognition.start();
}

// Modified fillForm function to return success/failure
function fillForm(transcript) {
    const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="number"], textarea');

    const commands = transcript.split(' fill ');
    if (commands.length === 2) {
        const [fieldName, value] = commands;

        for (const input of inputs) {
            const labelText = input.getAttribute('placeholder')?.toLowerCase() ||
                input.getAttribute('name')?.toLowerCase() ||
                input.getAttribute('id')?.toLowerCase() || '';

            if (labelText.includes(fieldName.trim())) {
                input.value = value.trim();
                input.dispatchEvent(new Event('input', { bubbles: true }));
                return true; // Successfully filled
            }
        }
    }
    return false; // No matching field found
}

// Update UI based on state
function updateUIState(isEnabled) {
    chrome.action.setIcon({ 
        path: isEnabled ? 'images/recording.png' : 'images/mic.png' 
    });
}




