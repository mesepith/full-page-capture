// Global variables to store partial captures and page metrics
let screenshots = [];
let currentScrollY = 0;
let totalScrollHeight = 0;
let viewportHeight = 0;
let capturing = false;

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.type === "START_CAPTURE" && !capturing) {
    capturing = true;
    // Initialize
    screenshots = [];
    currentScrollY = 0;

    // Get the total scroll height of the page
    totalScrollHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    );
    // Get current viewport height
    viewportHeight = window.innerHeight;

    // Start the capturing process
    await captureAndScroll();
    capturing = false;
  }
});

// Scroll, capture visible area, store it, and repeat until the bottom
async function captureAndScroll() {
  // Scroll to the currentScrollY
  window.scrollTo(0, currentScrollY);
  // Wait a bit for scrolling to finish
  await sleep(300);

  // Request a visible capture from the background
  const screenshotUrl = await requestVisibleCapture();
  if (screenshotUrl) {
    screenshots.push(screenshotUrl);
  } else {
    console.error("Failed to capture screenshot at scrollY:", currentScrollY);
  }

  // Move scroll to next position
  currentScrollY += viewportHeight;

  // If we've scrolled past the bottom, we're done
  if (currentScrollY < totalScrollHeight) {
    // Continue capturing
    await captureAndScroll();
  } else {
    // All screenshots gathered - stitch them
    await stitchScreenshots();
  }
}

// Send a message to background.js to capture the visible part
function requestVisibleCapture() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: "CAPTURE_VISIBLE" },
      (response) => {
        if (response && response.screenshotUrl) {
          resolve(response.screenshotUrl);
        } else {
          resolve(null);
        }
      }
    );
  });
}

// Stitch the images together in a canvas
async function stitchScreenshots() {
  if (screenshots.length === 0) return;

  // Create an off-screen canvas
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  // We only know final width by decoding an image
  const firstImage = await loadImage(screenshots[0]);
  const imageWidth = firstImage.width;

  // The total height is sum of all full-viewport screenshots,
  // but for the last screenshot we may only need part of it if the page
  // is not a multiple of the viewport height.
  //
  // So we can re-calculate the sum from the page’s total height
  const totalHeight = totalScrollHeight;

  // Set canvas dimensions
  canvas.width = imageWidth;
  canvas.height = totalHeight;

  let drawOffset = 0;
  for (let i = 0; i < screenshots.length; i++) {
    // Load the image from the base64 data
    const img = await loadImage(screenshots[i]);

    // If the last screenshot is partially filling the viewport,
    // figure out how much of the image's height to use
    let sliceHeight = img.height;
    const remaining = totalHeight - drawOffset;
    if (sliceHeight > remaining) {
      sliceHeight = remaining;
    }

    // Draw it to the canvas
    context.drawImage(
      img,
      0, // sx
      0, // sy
      img.width, // sWidth
      sliceHeight, // sHeight
      0, // dx
      drawOffset, // dy
      img.width, // dWidth
      sliceHeight // dHeight
    );

    drawOffset += sliceHeight;
  }

  // Convert canvas to Data URL
  const finalImageUrl = canvas.toDataURL("image/png");

  // Option A: Open in new tab
  const win = window.open();
  if (win) {
    win.document.write(
      '<iframe src="' +
        finalImageUrl +
        '" frameborder="0" style="width:100%; height:100%;" allowfullscreen></iframe>'
    );
  }

  // Option B: Trigger a download instead, if desired:
  // const link = document.createElement("a");
  // link.download = "full_page_screenshot.png";
  // link.href = finalImageUrl;
  // link.click();
}

// Utility: Load an image from base64 data URL
function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

// Utility: Sleep
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
