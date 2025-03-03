// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "startCapture") {
      captureFullPage();
      return true;
    }
  
    if (request.action === "captureVisibleTab") {
      chrome.tabs.captureVisibleTab(
        null, 
        { format: "png", quality: 100 }, // Use maximum quality
        dataUrl => {
          sendResponse(dataUrl);
        }
      );
      return true;  // Keep the message channel open for async response
    }
  
    if (request.action === "downloadScreenshot") {
      chrome.downloads.download({
        url: request.dataUrl,
        filename: `screenshot_${new Date().toISOString().replace(/[:.]/g, '-')}.png`,
        saveAs: true
      });
      return true;
    }
  });
  
  // Function to inject the full-page capture script
  async function captureFullPage() {
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
    // Inject the capture script into the page
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: performFullPageCapture
    });
  }
  
  // This function will be injected into the page to perform the capture
  function performFullPageCapture() {
    // Store original page state
    const originalState = {
      scrollPos: { top: window.scrollY, left: window.scrollX },
      bodyOverflow: document.body.style.overflow,
      bodyWidth: document.body.style.width,
      bodyHeight: document.body.style.height,
      docOverflow: document.documentElement.style.overflow,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      docWidth: document.documentElement.scrollWidth,
      docHeight: document.documentElement.scrollHeight
    };
  
    // Helper function to restore original page state
    function restoreOriginalState() {
      document.body.style.overflow = originalState.bodyOverflow;
      document.body.style.width = originalState.bodyWidth;
      document.body.style.height = originalState.bodyHeight;
      document.documentElement.style.overflow = originalState.docOverflow;
      window.scrollTo(originalState.scrollPos.left, originalState.scrollPos.top);
    }
  
    // Get dimensions of the entire page content
    function getPageDimensions() {
      return {
        width: Math.max(
          document.body.scrollWidth,
          document.body.offsetWidth,
          document.documentElement.clientWidth,
          document.documentElement.scrollWidth,
          document.documentElement.offsetWidth
        ),
        height: Math.max(
          document.body.scrollHeight,
          document.body.offsetHeight,
          document.documentElement.clientHeight,
          document.documentElement.scrollHeight,
          document.documentElement.offsetHeight
        )
      };
    }
  
    // Prevent scrolling during capture
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
  
    async function captureFullPage() {
      try {
        // Get page dimensions before we start capturing
        const pageDimensions = getPageDimensions();
        console.log(`Page dimensions: ${pageDimensions.width}x${pageDimensions.height}`);
  
        // Get device pixel ratio
        const pixelRatio = window.devicePixelRatio || 1;
  
        // Create canvas with the actual page dimensions
        const canvas = document.createElement('canvas');
        canvas.width = pageDimensions.width * pixelRatio;
        canvas.height = pageDimensions.height * pixelRatio;
        const ctx = canvas.getContext('2d');
  
        // Scale for high DPI displays
        ctx.scale(pixelRatio, pixelRatio);
        ctx.imageSmoothingEnabled = false;
  
        // Function to capture viewport
        const captureViewport = () => {
          return new Promise(resolve => {
            setTimeout(() => {
              chrome.runtime.sendMessage({ action: "captureVisibleTab" }, imageUrl => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.src = imageUrl;
              });
            }, 200);
          });
        };
  
        // Calculate how many screenshots we need
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
  
        // We need to capture both horizontally and vertically
        const numVerticalScreenshots = Math.ceil(pageDimensions.height / viewportHeight);
        const numHorizontalScreenshots = Math.ceil(pageDimensions.width / viewportWidth);
  
        console.log(`Capturing ${numHorizontalScreenshots}x${numVerticalScreenshots} grid`);
  
        // Capture the entire page by scrolling both horizontally and vertically
        for (let y = 0; y < numVerticalScreenshots; y++) {
          for (let x = 0; x < numHorizontalScreenshots; x++) {
            // Scroll to position
            const scrollTop = y * viewportHeight;
            const scrollLeft = x * viewportWidth;
  
            window.scrollTo(scrollLeft, scrollTop);
  
            // Wait for the page to render after scrolling
            await new Promise(resolve => setTimeout(resolve, 300));
  
            // Capture and draw current viewport
            const img = await captureViewport();
  
            // Log the captured area
            console.log(`Capturing area at: ${scrollLeft}x${scrollTop}`);
  
            // Draw the image at the correct position
            ctx.drawImage(
              img, 
              scrollLeft, scrollTop, 
              Math.min(viewportWidth, pageDimensions.width - scrollLeft),
              Math.min(viewportHeight, pageDimensions.height - scrollTop)
            );
          }
        }
  
        // Convert canvas to a data URL
        const dataUrl = canvas.toDataURL('image/png', 1.0);
  
        // Send the data URL to the background script for download
        chrome.runtime.sendMessage({ 
          action: "downloadScreenshot", 
          dataUrl: dataUrl 
        });
  
      } catch (error) {
        console.error('Error capturing screenshot:', error);
      } finally {
        // Restore the original page state
        restoreOriginalState();
      }
    }
  
    captureFullPage();
  }
  