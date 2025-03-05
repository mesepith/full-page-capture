// Define statusEl globally to be accessible in the message listener
const statusEl = document.getElementById('status');

document.getElementById('captureBtn').addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: startCapture
    });
  } catch (error) {
    statusEl.textContent = 'Error: ' + error.message;
  }
});

function startCapture() {
  chrome.runtime.sendMessage({ action: "startCapture" });
  console.log('Starting full page capture process');
}

// Listen for status updates from the content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateStatus") {
    statusEl.textContent = request.status;
  } else if (request.action === "startCapturing") {
    statusEl.textContent = 'Capturing screenshot';
    let dots = 0;
    const progressInterval = setInterval(() => {
      dots = (dots + 1) % 4;
      statusEl.textContent = 'Capturing screenshot' + '.'.repeat(dots);
    }, 500);
    // Store the interval ID globally to clear it later
    window.progressInterval = progressInterval;
  } else if (request.action === "captureComplete") {
    if (window.progressInterval) {
      clearInterval(window.progressInterval);
    }
    statusEl.textContent = 'Screenshot opened in new tab';
    setTimeout(() => {
      statusEl.textContent = '';
    }, 3000); // Clear status after 3 seconds
  }
});