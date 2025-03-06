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

        // Once the image is loaded, match the canvas size to the image
        const canvas = document.getElementById("drawingCanvas");
        const rect = imgElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        // Initialize the drawing/selection manager
        initDrawingManager();
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

      const blob = await fetch(imgElement.src).then(res => res.blob());
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

  // Download button
  downloadBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({
      action: "downloadScreenshot",
      dataUrl: imgElement.src,
    });
  });
});
