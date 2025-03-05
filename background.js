chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startCapture") {
    captureFullPage();
    return true;
  }

  if (request.action === "captureVisibleTab") {
    chrome.tabs.captureVisibleTab(null, { format: "png", quality: 100 }, dataUrl => {
      sendResponse(dataUrl);
    });
    return true;
  }

  if (request.action === "downloadScreenshot") {
    chrome.downloads.download({
      url: request.dataUrl,
      filename: `screenshot_${new Date().toISOString().replace(/[.:]/g, '-')}.png`,
      saveAs: true
    });
    return true;
  }

  // New handler for opening the screenshot in a new tab
  if (request.action === "openScreenshot") {
    // Store the data URL in chrome.storage.local
    chrome.storage.local.set({ screenshotDataUrl: request.dataUrl }, () => {
      // Create a new tab with screenshot.html
      chrome.tabs.create({ url: chrome.runtime.getURL("screenshot.html") });
    });
  }
  
});

async function captureFullPage() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: performFullPageCapture
  });
}

async function performFullPageCapture() {
  // Send initial status
  chrome.runtime.sendMessage({ action: "updateStatus", status: "Preparing to capture..." });

  // Store the original page state
  const originalScroll = { x: window.scrollX, y: window.scrollY };
  const originalOverflowBody = document.body.style.overflow;
  const originalOverflowDoc = document.documentElement.style.overflow;
  const fixedElements = [];

  // Identify all fixed-position elements
  function findFixedElements() {
    const allElements = document.querySelectorAll("*");
    allElements.forEach((el) => {
      const computedStyle = window.getComputedStyle(el);
      if (computedStyle.position === "fixed") {
        fixedElements.push({
          el,
          originalDisplay: el.style.display,
          originalVisibility: el.style.visibility,
        });
      }
    });
  }

  // Show fixed elements only in the first tile, hide them in others
  function handleFixedElements(tileIndex) {
    fixedElements.forEach((item) => {
      const { el, originalDisplay, originalVisibility } = item;
      if (tileIndex === 0) {
        el.style.display = originalDisplay || "";
        el.style.visibility = originalVisibility || "";
      } else {
        el.style.display = "none";
      }
    });
  }

  // Restore the page to its original state after capture
  function restorePage() {
    document.body.style.overflow = originalOverflowBody;
    document.documentElement.style.overflow = originalOverflowDoc;
    window.scrollTo(originalScroll.x, originalScroll.y);
    fixedElements.forEach((item) => {
      const { el, originalDisplay, originalVisibility } = item;
      el.style.display = originalDisplay || "";
      el.style.visibility = originalVisibility || "";
    });
  }

  // Get the full page dimensions
  function getPageDimensions() {
    const width = Math.max(
      document.body.scrollWidth,
      document.documentElement.scrollWidth,
      document.body.offsetWidth,
      document.documentElement.offsetWidth,
      document.documentElement.clientWidth
    );
    const height = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight,
      document.documentElement.clientHeight
    );
    return { width, height };
  }

  // Capture the visible viewport
  async function captureViewport() {
    return new Promise((resolve) => {
      setTimeout(() => {
        chrome.runtime.sendMessage({ action: "captureVisibleTab" }, (dataUrl) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.src = dataUrl;
        });
      }, 300); // Delay to ensure rendering
    });
  }

  // Main capture function
  async function captureFullPage() {
    try {
      // Notify that content loading is starting
      chrome.runtime.sendMessage({ action: "updateStatus", status: "Loading content..." });

      // Scroll to the bottom to load dynamic content
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for content to load

      // Get page dimensions after loading content
      const { width, height } = getPageDimensions();
      const pixelRatio = window.devicePixelRatio || 1;

      // Scroll back to the top to start capturing
      window.scrollTo(0, 0);
      await new Promise((resolve) => setTimeout(resolve, 500)); // Brief wait to settle

      // Notify that capturing is starting
      chrome.runtime.sendMessage({ action: "startCapturing" });

      // Set up the canvas for stitching
      const canvas = document.createElement("canvas");
      canvas.width = width * pixelRatio;
      canvas.height = height * pixelRatio;
      const ctx = canvas.getContext("2d");
      ctx.scale(pixelRatio, pixelRatio);

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const rows = Math.ceil(height / viewportHeight);
      const cols = Math.ceil(width / viewportWidth);

      // Disable scrolling during capture
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";

      // Find fixed elements once
      findFixedElements();

      let tileIndex = 0;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const scrollLeft = col * viewportWidth;
          const scrollTop =
            row === rows - 1
              ? Math.max(0, height - viewportHeight) // Last row: scroll to bottom
              : row * viewportHeight;
          window.scrollTo(scrollLeft, scrollTop);

          // Wait for the page to render at this scroll position
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Handle fixed elements: show only in the first tile
          handleFixedElements(tileIndex);

          // Capture the current viewport
          const img = await captureViewport();

          // Draw the captured tile onto the canvas
          const drawWidth = Math.min(viewportWidth, width - scrollLeft);
          const drawHeight = Math.min(viewportHeight, height - scrollTop);
          ctx.drawImage(
            img,
            0,
            0,
            drawWidth * pixelRatio,
            drawHeight * pixelRatio, // Source rectangle
            scrollLeft,
            scrollTop,
            drawWidth,
            drawHeight // Destination rectangle
          );

          tileIndex++;
        }
      }

      // Convert the canvas to a data URL and notify completion
      const finalDataUrl = canvas.toDataURL("image/png", 1.0);
      chrome.runtime.sendMessage({ action: "captureComplete" });
      chrome.runtime.sendMessage({
        action: "openScreenshot",
        dataUrl: finalDataUrl,
      });
    } catch (error) {
      console.error("Error capturing screenshot:", error);
    } finally {
      restorePage();
    }
  }

  // Start the capture process
  captureFullPage();
}