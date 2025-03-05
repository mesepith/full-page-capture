document.addEventListener("DOMContentLoaded", () => {
    const imgElement = document.getElementById("screenshotImage");
    const copyBtn = document.getElementById("copyBtn");
    const downloadBtn = document.getElementById("downloadBtn");
  
    // Retrieve the screenshot data URL from chrome.storage.local
    chrome.storage.local.get("screenshotDataUrl", (result) => {
      if (result.screenshotDataUrl) {
        imgElement.src = result.screenshotDataUrl;
  
        // Copy button: Copy image to clipboard
        copyBtn.addEventListener("click", async () => {
          try {
            const blob = await fetch(result.screenshotDataUrl).then(res => res.blob());
            await navigator.clipboard.write([
              new ClipboardItem({ [blob.type]: blob })
            ]);
            alert("Image copied to clipboard! You can paste it anywhere.");
          } catch (err) {
            console.error("Failed to copy image: ", err);
            alert("Failed to copy image. Please try again.");
          }
        });
  
        // Download button: Trigger image download
        downloadBtn.addEventListener("click", () => {
          chrome.runtime.sendMessage({
            action: "downloadScreenshot",
            dataUrl: result.screenshotDataUrl,
          });
        });
  
        // Clean up storage after loading the image
        imgElement.onload = () => {
          chrome.storage.local.remove("screenshotDataUrl");
        };
      } else {
        imgElement.alt = "Error: Screenshot data not found.";
      }
    });
  });