document.addEventListener("DOMContentLoaded", () => {
    const imgElement = document.getElementById("screenshotImage");
  
    // Retrieve the data URL from chrome.storage.local
    chrome.storage.local.get("screenshotDataUrl", (result) => {
      if (result.screenshotDataUrl) {
        imgElement.src = result.screenshotDataUrl;
  
        // Clean up storage after the image is loaded
        imgElement.onload = () => {
          chrome.storage.local.remove("screenshotDataUrl");
        };
      } else {
        imgElement.alt = "Error: Screenshot data not found.";
      }
    });
  });