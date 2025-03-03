chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.type === "CAPTURE_VISIBLE") {
      try {
        const screenshotUrl = await chrome.tabs.captureVisibleTab(
          sender.tab.windowId,
          { format: "png" }
        );
        sendResponse({ screenshotUrl });
      } catch (error) {
        console.error("Error capturing visible tab:", error);
        sendResponse({ screenshotUrl: null, error: error.message });
      }
      // Return true to indicate we want to send response asynchronously
      return true;
    }
  });
  