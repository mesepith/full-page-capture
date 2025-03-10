document.addEventListener("DOMContentLoaded", () => {
  const imgElement = document.getElementById("screenshotImage");
  const copyBtn = document.getElementById("copyBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const loadingEl = document.getElementById("loading");
  const successMessageEl = document.getElementById("successMessage");

  // Retrieve the screenshot data URL from chrome.storage.local
  chrome.storage.local.get("screenshotDataUrl", (result) => {
    if (result.screenshotDataUrl) {
      imgElement.src = result.screenshotDataUrl;

      // Clean up storage after loading the image
      imgElement.onload = () => {
          chrome.storage.local.remove("screenshotDataUrl");
      
          // Get the container and image bounding rectangles
          const container = document.getElementById('imageContainer');
          const containerRect = container.getBoundingClientRect();
          const imgRect = imgElement.getBoundingClientRect();
      
          // Calculate offsets relative to the container
          const topOffset = imgRect.top - containerRect.top; // Accounts for padding-top
          const leftOffset = imgRect.left - containerRect.left; // Accounts for padding-left
      
          // Set canvas size to the image’s rendered size
          const canvas = document.getElementById("drawingCanvas");
          canvas.width = imgRect.width;
          canvas.height = imgRect.height;
      
          // Position canvas exactly over the image
          canvas.style.position = 'absolute';
          canvas.style.top = `${topOffset}px`;
          canvas.style.left = `${leftOffset}px`;
      };
    } else {
      imgElement.alt = "Error: Screenshot data not found.";
    }
  });

  // Copy button
  copyBtn.addEventListener("click", async () => {
    try {
      loadingEl.style.display = "inline";
      copyBtn.disabled = true;
  
      // 1) Merge the screenshot + drawings into one image
      const mergedDataUrl = mergeScreenshotAndDrawing();
  
      // 2) Convert that data URL to a Blob
      const blob = await fetch(mergedDataUrl).then(res => res.blob());
  
      // 3) Write to clipboard
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
  
      successMessageEl.textContent = "Image copied to clipboard! You can paste it anywhere.";
      successMessageEl.style.display = "block";
      setTimeout(() => {
        successMessageEl.style.display = "none";
      }, 10000);
    } catch (err) {
      console.error("Failed to copy image: ", err);
      successMessageEl.textContent = "Failed to copy image. Please try again.";
      successMessageEl.style.display = "block";
      setTimeout(() => {
        successMessageEl.style.display = "none";
      }, 10000);
    } finally {
      loadingEl.style.display = "none";
      copyBtn.disabled = false;
    }
  });
  

  function mergeScreenshotAndDrawing() {
      const imgElement = document.getElementById("screenshotImage");
      const drawingCanvas = document.getElementById("drawingCanvas");

      // Create an offscreen canvas with the natural size of the image
      const offscreen = document.createElement("canvas");
      offscreen.width = imgElement.naturalWidth;
      offscreen.height = imgElement.naturalHeight;
      const ctx = offscreen.getContext("2d");

      // Draw the image at its natural size
      ctx.drawImage(imgElement, 0, 0, offscreen.width, offscreen.height);

      // Calculate scaling factors from rendered size to natural size
      const scaleX = offscreen.width / drawingCanvas.width;
      const scaleY = offscreen.height / drawingCanvas.height;

      // Scale and draw the canvas onto the offscreen canvas
      ctx.save();
      ctx.scale(scaleX, scaleY);
      ctx.drawImage(drawingCanvas, 0, 0);
      ctx.restore();

      // Export to dataURL (PNG)
      return offscreen.toDataURL("image/png");
  }
  

  // Download button

  downloadBtn.addEventListener("click", () => {
    // 1) Merge screenshot + drawings into one data URL
    const mergedDataUrl = mergeScreenshotAndDrawing();
  
    // 2) Ask background script to download the merged image
    chrome.runtime.sendMessage({
      action: "downloadScreenshot",
      dataUrl: mergedDataUrl
    });
  });
});
