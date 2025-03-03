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
  });
  
  async function captureFullPage() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: performFullPageCapture
    });
  }
  
  function performFullPageCapture() {
    // Remember original scroll and CSS
    const originalScroll = { x: window.scrollX, y: window.scrollY };
    const originalOverflowBody = document.body.style.overflow;
    const originalOverflowDoc = document.documentElement.style.overflow;
  
    // We'll store references to any fixed elements and their display style
    const fixedElements = [];
  
    // 1) Find all fixed elements (like top nav bars)
    function findFixedElements() {
      const allElems = document.querySelectorAll('*');
      allElems.forEach(el => {
        const cs = window.getComputedStyle(el);
        if (cs.position === 'fixed') {
          fixedElements.push({
            el,
            originalDisplay: el.style.display,
            originalVisibility: el.style.visibility
          });
        }
      });
    }
  
    // 2) For each "tile" index, hide or show fixed elements
    // We'll show them only in the first tile (index = 0)
    function handleFixedElements(tileIndex) {
      fixedElements.forEach(item => {
        const { el, originalDisplay, originalVisibility } = item;
        if (tileIndex === 0) {
          // Show in the first tile
          el.style.display = originalDisplay || '';
          el.style.visibility = originalVisibility || '';
        } else {
          // Hide in subsequent tiles
          el.style.display = 'none';
        }
      });
    }
  
    // Helper to restore at the end
    function restorePage() {
      document.body.style.overflow = originalOverflowBody;
      document.documentElement.style.overflow = originalOverflowDoc;
      window.scrollTo(originalScroll.x, originalScroll.y);
  
      // Restore fixed elements
      fixedElements.forEach(item => {
        const { el, originalDisplay, originalVisibility } = item;
        el.style.display = originalDisplay;
        el.style.visibility = originalVisibility;
      });
    }
  
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
  
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
  
    function captureViewport() {
      return new Promise(resolve => {
        setTimeout(() => {
          chrome.runtime.sendMessage({ action: "captureVisibleTab" }, dataUrl => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.src = dataUrl;
          });
        }, 300);
      });
    }
  
    async function captureFullPage() {
      try {
        const { width, height } = getPageDimensions();
        const pixelRatio = window.devicePixelRatio || 1;
  
        // Find all fixed elements once
        findFixedElements();
  
        // Create an offscreen canvas
        const canvas = document.createElement('canvas');
        canvas.width = width * pixelRatio;
        canvas.height = height * pixelRatio;
        const ctx = canvas.getContext('2d');
        ctx.scale(pixelRatio, pixelRatio);
  
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const cols = Math.ceil(width / viewportWidth);
        const rows = Math.ceil(height / viewportHeight);
  
        let tileIndex = 0; // We'll increment for each tile
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const scrollLeft = col * viewportWidth;
            const scrollTop = row * viewportHeight;
            window.scrollTo(scrollLeft, scrollTop);
  
            // Wait for layout
            await new Promise(r => setTimeout(r, 500));
  
            // Hide or show fixed elements based on tile index
            handleFixedElements(tileIndex);
  
            // Capture
            const img = await captureViewport();
  
            // Draw
            const drawWidth = Math.min(viewportWidth, width - scrollLeft);
            const drawHeight = Math.min(viewportHeight, height - scrollTop);
            ctx.drawImage(img, scrollLeft, scrollTop, drawWidth, drawHeight);
  
            tileIndex++;
          }
        }
  
        // Convert to data URL
        const finalDataUrl = canvas.toDataURL('image/png', 1.0);
        chrome.runtime.sendMessage({ action: "downloadScreenshot", dataUrl: finalDataUrl });
  
      } catch (err) {
        console.error('Error capturing screenshot:', err);
      } finally {
        restorePage();
      }
    }
  
    captureFullPage();
  }
  