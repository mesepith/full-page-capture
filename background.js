// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "startCapture") {
      captureFullPage();
      return true;
    }
  
    if (request.action === "captureVisibleTab") {
      chrome.tabs.captureVisibleTab(
        null, 
        { format: "png", quality: 100 },
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
      docOverflow: document.documentElement.style.overflow
    };
  
    // Store of fixed elements and their original styles
    const fixedElementsStore = [];
  
    // Function to identify and store fixed elements
    function identifyFixedElements() {
      // Clear the store first to prevent duplicates
      fixedElementsStore.length = 0;
  
      // Get all elements in the DOM
      const allElements = document.querySelectorAll('*');
  
      allElements.forEach(el => {
        const computedStyle = window.getComputedStyle(el);
        if (computedStyle.position === 'fixed' || computedStyle.position === 'sticky') {
          // Check if this is the form or a container of the form
          const isContactForm = isContactFormElement(el);
  
          // Store the element with its classification
          fixedElementsStore.push({
            element: el,
            originalStyles: {
              position: el.style.position,
              top: el.style.top,
              right: el.style.right,
              display: el.style.display,
              visibility: el.style.visibility,
              opacity: el.style.opacity,
              zIndex: el.style.zIndex
            },
            rect: el.getBoundingClientRect(),
            isContactForm: isContactForm,
            isTopNav: isTopNavElement(el)
          });
        }
      });
  
      return fixedElementsStore.length;
    }
  
    // Function to check if an element is part of the contact form
    function isContactFormElement(el) {
      // Text content check
      const textContent = el.textContent || '';
      if (textContent.includes('Contact our Real Estate Experts')) {
        return true;
      }
  
      // Check for common form elements
      const isForm = el.tagName === 'FORM' || 
                     el.classList.contains('form') || 
                     el.classList.contains('contact-form') ||
                     el.classList.contains('contact-widget') ||
                     el.classList.contains('lead-form') ||
                     el.classList.contains('sticky-form');
  
      // Position check - forms often have specific right positioning
      const computedStyle = window.getComputedStyle(el);
      const onRightSide = computedStyle.right === '0px' || 
                         (parseFloat(computedStyle.right) < 100 && 
                          parseFloat(computedStyle.right) > 0);
  
      // Check for form elements inside
      const hasFormElements = el.querySelector('input, select, textarea, button');
  
      // Specific Square Yards selectors
      const isSquareYardsForm = el.classList.contains('enquiry-form') ||
                               el.classList.contains('sy-form') ||
                               el.id === 'enquiryForm';
  
      return isForm || (onRightSide && hasFormElements) || isSquareYardsForm;
    }
  
    // Function to check if an element is part of the top navigation
    function isTopNavElement(el) {
      // Check if it's a navigation element
      const isNav = el.tagName === 'NAV' || 
                   el.tagName === 'HEADER' ||
                   el.classList.contains('navbar') ||
                   el.classList.contains('header') ||
                   el.classList.contains('nav-wrapper') ||
                   el.classList.contains('navigation');
  
      // Check if it's positioned at the top
      const computedStyle = window.getComputedStyle(el);
      const atTop = computedStyle.top === '0px' || 
                   parseFloat(computedStyle.top) === 0;
  
      // Specific Square Yards selectors
      const isSquareYardsNav = el.classList.contains('navbar-fixed') ||
                             el.classList.contains('header-wrapper');
  
      return (isNav && atTop) || isSquareYardsNav;
    }
  
    // Function to handle fixed elements for each viewport
    function handleFixedElementsForViewport(scrollTop, viewportHeight) {
      fixedElementsStore.forEach(item => {
        const el = item.element;
  
        if (item.isTopNav) {
          // For top navigation bars
          if (scrollTop < viewportHeight) {
            // Show in first viewport only
            el.style.display = item.originalStyles.display;
            el.style.visibility = item.originalStyles.visibility;
          } else {
            // Hide in all other viewports
            el.style.display = 'none';
          }
        } else if (item.isContactForm) {
          // For the contact form that should appear in certain sections
          // Check if we're in the section where the form should appear
          if (scrollTop >= viewportHeight) {
            // After the first viewport, the form should be visible
            // We'll place it in its original position relative to the viewport
            el.style.display = item.originalStyles.display;
            el.style.visibility = item.originalStyles.visibility;
  
            // Make sure it stays on the right side
            el.style.position = 'absolute';
            el.style.right = item.originalStyles.right || '0px';
            el.style.top = (item.rect.top + scrollTop) + 'px';
          } else {
            // In the first viewport, the form should not be visible
            // (assuming it doesn't appear at the top of the page)
            el.style.display = 'none';
          }
        } else {
          // For other fixed elements, just hide them after first viewport
          if (scrollTop >= viewportHeight) {
            el.style.display = 'none';
          }
        }
      });
    }
  
    // Function to restore all fixed elements to their original state
    function restoreFixedElements() {
      fixedElementsStore.forEach(item => {
        const el = item.element;
        Object.assign(el.style, item.originalStyles);
      });
    }
  
    // Helper function to restore original page state
    function restoreOriginalState() {
      // Restore fixed elements
      restoreFixedElements();
  
      // Restore page properties
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
  
        // Initial identification of fixed elements
        const fixedElementCount = identifyFixedElements();
        console.log(`Identified ${fixedElementCount} fixed elements`);
  
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
            }, 300); // Increased timeout for better rendering
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
            await new Promise(resolve => setTimeout(resolve, 500)); // Increased timeout
  
            // Handle fixed elements for this viewport
            handleFixedElementsForViewport(scrollTop, viewportHeight);
  
            // Capture and draw current viewport
            const img = await captureViewport();
  
            // Log the captured area for debugging
            console.log(`Capturing area at: ${scrollLeft}x${scrollTop}, size: ${img.width}x${img.height}`);
  
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
  