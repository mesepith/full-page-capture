document.getElementById("capture-btn").addEventListener("click", async () => {
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
    // Inject (or re-inject) the content script if it's not already present
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["contentScript.js"]
    });
  
    // Send a message to the content script to start capturing
    chrome.tabs.sendMessage(tab.id, { type: "START_CAPTURE" });
  });
  