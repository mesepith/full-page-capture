document.getElementById('captureBtn').addEventListener('click', async () => {
    const statusEl = document.getElementById('status');
    statusEl.textContent = 'Capturing screenshot...';
  
    try {
      // Get the current active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
      // Inject the content script
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: startCapture
      });
  
      // Update status to show progress (this might take a while for large pages)
      let dots = 0;
      const progressInterval = setInterval(() => {
        dots = (dots + 1) % 4;
        statusEl.textContent = 'Capturing screenshot' + '.'.repeat(dots);
      }, 500);
  
      // After a reasonable time, assume the screenshot is complete
      setTimeout(() => {
        clearInterval(progressInterval);
        statusEl.textContent = 'Screenshot saved!';
  
        // Clear status after 3 seconds
        setTimeout(() => {
          statusEl.textContent = '';
        }, 3000);
      }, 15000); // 15 seconds should be enough for most pages
  
    } catch (error) {
      statusEl.textContent = 'Error: ' + error.message;
    }
  });
  
  // This function injects the initial capture process
  function startCapture() {
    // Notify the background script to start the capture process
    chrome.runtime.sendMessage({ action: "startCapture" });
  
    // Add console logging to help with debugging
    console.log('Starting full page capture process');
  }
  