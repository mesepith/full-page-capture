document.getElementById('captureBtn').addEventListener('click', async () => {
  const statusEl = document.getElementById('status');
  statusEl.textContent = 'Capturing screenshot...';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: startCapture
    });

    let dots = 0;
    const progressInterval = setInterval(() => {
      dots = (dots + 1) % 4;
      statusEl.textContent = 'Capturing screenshot' + '.'.repeat(dots);
    }, 500);

    // Increased timeout to account for longer capture process with extended delay
    setTimeout(() => {
      clearInterval(progressInterval);
      statusEl.textContent = 'Screenshot saved!';
      setTimeout(() => {
        statusEl.textContent = '';
      }, 3000);
    }, 20000); // Adjusted from 15000ms to 20000ms

  } catch (error) {
    statusEl.textContent = 'Error: ' + error.message;
  }
});

function startCapture() {
  chrome.runtime.sendMessage({ action: "startCapture" });
  console.log('Starting full page capture process');
}