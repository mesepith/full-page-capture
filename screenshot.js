document.addEventListener("DOMContentLoaded", () => {
    const imgElement = document.getElementById("screenshotImage");
    const copyBtn = document.getElementById("copyBtn");
    const downloadBtn = document.getElementById("downloadBtn");
    const loadingEl = document.getElementById("loading");
    const successMessageEl = document.getElementById("successMessage"); // Reference to the success message

    // Retrieve the screenshot data URL from chrome.storage.local
    chrome.storage.local.get("screenshotDataUrl", (result) => {
      if (result.screenshotDataUrl) {
        imgElement.src = result.screenshotDataUrl;

        // Copy button: Copy image to clipboard
        copyBtn.addEventListener("click", async () => {
          try {
            // Show "Loading..." and disable the button
            loadingEl.style.display = "inline";
            copyBtn.disabled = true;

            const blob = await fetch(result.screenshotDataUrl).then(res => res.blob());
            await navigator.clipboard.write([
              new ClipboardItem({ [blob.type]: blob })
            ]);

            // Show success message instead of alert
            successMessageEl.textContent = "Image copied to clipboard! You can paste it anywhere.";
            successMessageEl.style.display = "block";
            setTimeout(() => {
              successMessageEl.style.display = "none";
            }, 10000); // Hide after 10 seconds
          } catch (err) {
            console.error("Failed to copy image: ", err);
            // Show error message instead of alert
            successMessageEl.textContent = "Failed to copy image. Please try again.";
            successMessageEl.style.display = "block";
            setTimeout(() => {
              successMessageEl.style.display = "none";
            }, 10000); // Hide after 10 seconds
          } finally {
            // Hide "Loading..." and re-enable the button
            loadingEl.style.display = "none";
            copyBtn.disabled = false;
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