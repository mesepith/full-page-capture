// draw.js

// Canvas setup
const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
// Buttons
const selectBtn = document.getElementById('selectBtn');
const drawBtn = document.getElementById('drawBtn');
const drawShapeBtn = document.getElementById('drawShapeBtn');
const drawTextBtn = document.getElementById('drawTextBtn');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');

// Tooltips
const drawTooltip = document.getElementById('drawTooltip');
const closeDrawTooltipBtn = document.getElementById('closeDrawTooltipBtn');
const shapeTooltip = document.getElementById('shapeTooltip');
const closeShapeTooltipBtn = document.getElementById('closeShapeTooltipBtn');
const textTooltip = document.getElementById('textTooltip');
const closeTextTooltipBtn = document.getElementById('closeTextTooltipBtn');

// Controls for lines
const lineShapeSelect = document.getElementById('lineShapeSelect');
const lineColorPicker = document.getElementById('lineColorPicker');
const lineSizeRange = document.getElementById('lineSizeRange');

// Controls for shapes
const shapeSelect2 = document.getElementById('shapeSelect2');
const shapeColorPicker = document.getElementById('shapeColorPicker');
const shapeSizeRange = document.getElementById('shapeSizeRange');

// Controls for text
const textFontSelect = document.getElementById('textFontSelect');
const textColorPicker = document.getElementById('textColorPicker');
const textSizeRange = document.getElementById('textSizeRange');

// State management
let shapes = []; // Array of drawn shapes
let undoneShapes = []; // Stack for redo functionality
let selectedShapeIndex = -1; // Index of the currently selected shape
let isDrawing = false; // Flag for active drawing
let isDragging = false; // Flag for dragging a shape
let dragOffsetX = 0; // Offset for dragging
let dragOffsetY = 0;
let startX = 0; // Starting coordinates for drawing
let startY = 0;
let mode = 'select'; // Current mode: 'select', 'line', 'shape', or 'text'
let textEditor = null; // Reference to the text input field

// **Helper Functions**

// Show a tooltip below a button
function showTooltipBelowButton(tooltipEl, buttonEl) {
  tooltipEl.style.display = 'none';
  const buttonRect = buttonEl.getBoundingClientRect();
  const bodyRect = document.body.getBoundingClientRect();
  const top = buttonRect.bottom - bodyRect.top + window.scrollY + 5;
  const left = buttonRect.left - bodyRect.left + window.scrollX;
  tooltipEl.style.top = top + 'px';
  tooltipEl.style.left = left + 'px';
  tooltipEl.style.display = 'block';
}

// Highlight the active mode button
function highlightButton(btn) {
  [selectBtn, drawBtn, drawShapeBtn, drawTextBtn].forEach(b => {
    b.classList.remove('active-mode-button');
  });
  btn.classList.add('active-mode-button');
}

// Close all tooltips
function closeAllTooltips() {
  drawTooltip.style.display = 'none';
  shapeTooltip.style.display = 'none';
  textTooltip.style.display = 'none';
}

// **Mode Switching Event Listeners**

selectBtn.addEventListener('click', () => {
  mode = 'select';
  highlightButton(selectBtn);
  closeAllTooltips();
  selectedShapeIndex = -1;
  canvas.style.cursor = 'pointer';
  destroyTextEditor();
  redrawAll();
});

drawBtn.addEventListener('click', () => {
  if (drawTooltip.style.display === 'block') {
    closeAllTooltips();
    mode = 'select';
    highlightButton(selectBtn);
  } else {
    lastActiveMode = 'line'; // Store last active tool
    mode = 'line';
    highlightButton(drawBtn);
    closeAllTooltips();
    showTooltipBelowButton(drawTooltip, drawBtn);
    canvas.style.cursor = 'crosshair';
    selectedShapeIndex = -1;
    destroyTextEditor();
  }
  redrawAll();
});

drawShapeBtn.addEventListener('click', () => {
  if (shapeTooltip.style.display === 'block') {
    closeAllTooltips();
    mode = 'select';
    highlightButton(selectBtn);
  } else {
    lastActiveMode = 'shape'; // Store last active tool
    mode = 'shape';
    highlightButton(drawShapeBtn);
    closeAllTooltips();
    showTooltipBelowButton(shapeTooltip, drawShapeBtn);
    canvas.style.cursor = 'crosshair';
    selectedShapeIndex = -1;
    destroyTextEditor();
  }
  redrawAll();
});

drawTextBtn.addEventListener('click', () => {
  if (textTooltip.style.display === 'block') {
    closeAllTooltips();
    mode = 'select';
    highlightButton(selectBtn);
  } else {
    lastActiveMode = 'text'; // Store last active tool
    mode = 'text';
    highlightButton(drawTextBtn);
    closeAllTooltips();
    showTooltipBelowButton(textTooltip, drawTextBtn);
    canvas.style.cursor = 'text';
    selectedShapeIndex = -1;
    destroyTextEditor(); // Ensure no old text editor remains
  }
  redrawAll();
});


// **Canvas Event Listeners**

canvas.addEventListener('mousedown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;

  // Find if an existing shape is clicked
  const foundIndex = findTopShape(shapes, clickX, clickY);

  if (foundIndex !== -1) {
    // Clicked on an existing shape → Activate 'Select' mode
    mode = 'select';
    highlightButton(selectBtn);
    closeAllTooltips();
    selectedShapeIndex = foundIndex;
    isDragging = true;
    const shape = shapes[foundIndex];
    dragOffsetX = clickX - shape.x1;
    dragOffsetY = clickY - shape.y1;
  } else {
    // Clicked on an empty area
    isDragging = false;
    selectedShapeIndex = -1;

    if (mode === 'line' || mode === 'shape') {
      // Start drawing a new line or shape
      isDrawing = true;
      startX = clickX;
      startY = clickY;
    } else if (mode === 'text') {
      // Create a new text input on click
      createNewTextShape(clickX, clickY);
    } else if (mode === 'select') {
      // If the last selected mode was 'line', 'shape', or 'text', switch back
      if (lastActiveMode === 'line') {
        mode = 'line';
        highlightButton(drawBtn);
        showTooltipBelowButton(drawTooltip, drawBtn);
        isDrawing = true;
        startX = clickX;
        startY = clickY;
      } else if (lastActiveMode === 'shape') {
        mode = 'shape';
        highlightButton(drawShapeBtn);
        showTooltipBelowButton(shapeTooltip, drawShapeBtn);
        isDrawing = true;
        startX = clickX;
        startY = clickY;
      } else if (lastActiveMode === 'text') {
        mode = 'text';
        highlightButton(drawTextBtn);
        showTooltipBelowButton(textTooltip, drawTextBtn);
        createNewTextShape(clickX, clickY);
      }
    }
  }
  redrawAll();
});



canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  if (isDragging && selectedShapeIndex !== -1) {
    const shape = shapes[selectedShapeIndex];
    if (shape.type === 'text') {
      shape.x1 = mouseX - dragOffsetX;
      shape.y1 = mouseY - dragOffsetY;
    } else {
      const dx = mouseX - (shape.x1 + dragOffsetX);
      const dy = mouseY - (shape.y1 + dragOffsetY);
      shape.x1 += dx;
      shape.y1 += dy;
      shape.x2 += dx;
      shape.y2 += dy;
    }
    redrawAll();
  } else if (isDrawing && (mode === 'line' || mode === 'shape')) {
    redrawAll();
    const shapeObj = buildShapeObj(mode, mouseX, mouseY);
    drawShape(shapeObj, false);
  }
});

canvas.addEventListener('mouseup', (e) => {
  if (isDragging) {
    isDragging = false;
  }
  
  if (isDrawing && (mode === 'line' || mode === 'shape')) {
    isDrawing = false;
    const rect = canvas.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;

    // Prevent zero-length arrows (clicking without dragging)
    if (startX === endX && startY === endY) {
      return; // Don't create the shape if no movement
    }

    const newShape = buildShapeObj(mode, endX, endY);
    shapes.push(newShape);
    undoneShapes = [];
    redrawAll();
  }
});


canvas.addEventListener('dblclick', (e) => {
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;

  const foundIndex = findTopShape(shapes, clickX, clickY);
  if (foundIndex !== -1 && shapes[foundIndex].type === 'text') {
    selectedShapeIndex = foundIndex;
    showTextEditor(shapes[foundIndex]);
  }
});

// **Shape Creation and Editing**

function buildShapeObj(mode, mouseX, mouseY) {
  if (mode === 'line') {
    return {
      type: lineShapeSelect.value,
      color: lineColorPicker.value,
      size: parseInt(lineSizeRange.value, 10),
      x1: startX,
      y1: startY,
      x2: mouseX,
      y2: mouseY
    };
  } else if (mode === 'shape') {
    return {
      type: shapeSelect2.value,
      color: shapeColorPicker.value,
      size: parseInt(shapeSizeRange.value, 10),
      x1: startX,
      y1: startY,
      x2: mouseX,
      y2: mouseY
    };
  }
  return null;
}

function createNewTextShape(x, y) {
  const newShape = {
    type: 'text',
    text: '',
    font: textFontSelect.value,
    color: textColorPicker.value,
    size: parseInt(textSizeRange.value, 10),
    x1: x,
    y1: y
  };
  shapes.push(newShape);
  selectedShapeIndex = shapes.length - 1;
  showTextEditor(newShape);
  redrawAll();
}

function showTextEditor(shape) {
  destroyTextEditor();
  shape.isEditing = true;
  redrawAll();

  textEditor = document.createElement('input');
  textEditor.type = 'text';
  textEditor.value = shape.text || '';
  textEditor.style.position = 'absolute';
  textEditor.style.zIndex = '9999';
  textEditor.style.background = 'rgba(255, 255, 255, 0.9)';
  textEditor.style.border = '1px solid #ccc';
  textEditor.style.padding = '2px 5px';
  textEditor.style.outline = 'none';

  const canvasRect = canvas.getBoundingClientRect();
  textEditor.style.left = `${canvasRect.left + shape.x1}px`;
  textEditor.style.top = `${canvasRect.top + shape.y1}px`;
  textEditor.style.fontFamily = shape.font;
  textEditor.style.fontSize = `${shape.size}px`;
  textEditor.style.color = shape.color;
  textEditor.style.width = 'auto';
  textEditor.style.minWidth = '50px';

  document.body.appendChild(textEditor);
  requestAnimationFrame(() => textEditor.focus());

  function handleKeydown(ev) {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      finalizeEdit();
    }
  }

  textEditor.addEventListener('input', () => autoResizeTextEditor(textEditor, shape));
  autoResizeTextEditor(textEditor, shape);

  textEditor.addEventListener('blur', finalizeEdit);
  textEditor.addEventListener('keydown', handleKeydown);

  function finalizeEdit() {
    if (textEditor) {
      shape.text = textEditor.value.trim() || shape.text;
      shape.isEditing = false;
      destroyTextEditor();
      redrawAll();
    }
  }

  textEditor._blurHandler = finalizeEdit;
  textEditor._keydownHandler = handleKeydown;
}

function autoResizeTextEditor(editor, shape) {
  ctx.font = `${shape.size}px ${shape.font}`;
  const textWidth = ctx.measureText(editor.value || '').width;
  const minWidth = 20;
  editor.style.width = Math.max(minWidth, textWidth + 10) + 'px';
}

function destroyTextEditor() {
  if (textEditor) {
    textEditor.removeEventListener('blur', textEditor._blurHandler);
    textEditor.removeEventListener('keydown', textEditor._keydownHandler);
    if (document.body.contains(textEditor)) {
      textEditor.remove();
    }
    textEditor = null;
  }
}

// **Undo/Redo**

undoBtn.addEventListener('click', undoAction);
redoBtn.addEventListener('click', redoAction);

function undoAction() {
  if (shapes.length > 0) {
    undoneShapes.push(shapes.pop());
    selectedShapeIndex = -1;
    redrawAll();
  }
}

function redoAction() {
  if (undoneShapes.length > 0) {
    shapes.push(undoneShapes.pop());
    selectedShapeIndex = -1;
    redrawAll();
  }
}

// **Keyboard Shortcuts**

document.addEventListener('keydown', (e) => {
  if (
    selectedShapeIndex !== -1 &&
    (e.key === 'Delete' || e.key === 'Backspace') &&
    !textEditor
  ) {
    shapes.splice(selectedShapeIndex, 1);
    selectedShapeIndex = -1;
    redrawAll();
  }

  const isCtrlOrCmd = e.ctrlKey || e.metaKey;
  if (isCtrlOrCmd && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    if (e.shiftKey) redoAction();
    else undoAction();
  } else if (isCtrlOrCmd && e.key.toLowerCase() === 'y') {
    e.preventDefault();
    redoAction();
  }
});

// **Real-Time Text Style Updates**

textFontSelect.addEventListener('change', () => {
  if (selectedShapeIndex !== -1 && shapes[selectedShapeIndex].type === 'text') {
    shapes[selectedShapeIndex].font = textFontSelect.value;
    redrawAll();
  }
});

textColorPicker.addEventListener('change', () => {
  if (selectedShapeIndex !== -1 && shapes[selectedShapeIndex].type === 'text') {
    shapes[selectedShapeIndex].color = textColorPicker.value;
    redrawAll();
  }
});

textSizeRange.addEventListener('input', () => {
  if (selectedShapeIndex !== -1 && shapes[selectedShapeIndex].type === 'text') {
    shapes[selectedShapeIndex].size = parseInt(textSizeRange.value, 10);
    redrawAll();
  }
});

// **Drawing Functions**

function redrawAll() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  shapes.forEach((shape, idx) => {
    const isSelected = (idx === selectedShapeIndex);
    drawShape(shape, isSelected);
  });
}

function drawShape(shape, isSelected) {
  if (isSelected) drawOutline(shape);
  const { type } = shape;
  if (type === 'line' || type === 'arrow' || type === 'circle' || type === 'rect') {
    drawLineOrShape(shape);
  } else if (type === 'text') {
    drawTextShape(shape);
  }
}

function drawLineOrShape(shape) {
  const { type, color, size, x1, y1, x2, y2 } = shape;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  ctx.lineWidth = size;

  if (type === 'line') {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  } else if (type === 'arrow') {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    const angle = Math.atan2(y2 - y1, x2 - x1);
    const headLen = 10 + (size * 2);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
    ctx.lineTo(x2, y2);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  } else if (type === 'circle') {
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    const rx = Math.abs(x2 - x1) / 2;
    const ry = Math.abs(y2 - y1) / 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
    ctx.stroke();
  } else if (type === 'rect') {
    const left = Math.min(x1, x2);
    const top = Math.min(y1, y2);
    const w = Math.abs(x2 - x1);
    const h = Math.abs(y2 - y1);
    ctx.strokeRect(left, top, w, h);
  }
  ctx.restore();
}

function drawTextShape(shape) {
  if (shape.isEditing) return;
  const { text, font, color, size, x1, y1 } = shape;
  ctx.save();
  ctx.font = `${size}px ${font}`;
  ctx.fillStyle = color;
  ctx.textBaseline = 'top';
  ctx.fillText(text, x1, y1);
  ctx.restore();
}

function drawOutline(shape) {
  ctx.save();

  if (shape.type === 'text' && shape.text.trim() !== '') {
    // Ensure text is present before drawing the outline
    const { text, font, size, x1, y1 } = shape;
    ctx.font = `${size}px ${font}`;
    const textWidth = ctx.measureText(text).width;
    const textHeight = size; // Approximate text height

    // Add padding to prevent overlap
    const padding = 5;

    // **Step 1: Draw Red Outline (Always Visible)**
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 3;
    ctx.strokeRect(x1 - padding, y1 - padding, textWidth + 2 * padding, textHeight + 2 * padding);

    // **Step 2: Draw Black Shadow (For Depth)**
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.strokeRect(x1 - padding + 1, y1 - padding + 1, textWidth + 2 * padding - 2, textHeight + 2 * padding - 2);

    // **Step 3: Draw White Border (Final Layer)**
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1;
    ctx.strokeRect(x1 - padding + 2, y1 - padding + 2, textWidth + 2 * padding - 4, textHeight + 2 * padding - 4);
  } else if (shape.type !== 'text') {
    // Existing outline for shapes (Line, Circle, Rectangle)
    const outlineSize = (shape.size || 3) + 4;

    // **Step 1: Draw Red Outline (Always Visible)**
    ctx.strokeStyle = 'red';
    ctx.lineWidth = outlineSize + 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    drawShapeOutline(shape);

    // **Step 2: Draw Black Shadow (For Depth)**
    ctx.strokeStyle = 'black';
    ctx.lineWidth = outlineSize + 2;
    drawShapeOutline(shape);

    // **Step 3: Draw White Border (Final Layer)**
    ctx.strokeStyle = 'white';
    ctx.lineWidth = outlineSize;
    drawShapeOutline(shape);
  }

  ctx.restore();
}



// **Helper function to draw shape outlines**
function drawShapeOutline(shape) {
  if (shape.type === 'line' || shape.type === 'arrow') {
    ctx.beginPath();
    ctx.moveTo(shape.x1, shape.y1);
    ctx.lineTo(shape.x2, shape.y2);
    ctx.stroke();
  } else if (shape.type === 'circle') {
    const cx = (shape.x1 + shape.x2) / 2;
    const cy = (shape.y1 + shape.y2) / 2;
    const rx = Math.abs(shape.x2 - shape.x1) / 2;
    const ry = Math.abs(shape.y2 - shape.y1) / 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
    ctx.stroke();
  } else if (shape.type === 'rect') {
    const left = Math.min(shape.x1, shape.x2);
    const top = Math.min(shape.y1, shape.y2);
    const w = Math.abs(shape.x2 - shape.x1);
    const h = Math.abs(shape.y2 - shape.y1);
    ctx.strokeRect(left, top, w, h);
  }
}



// **Hit Testing for Selection**

function findTopShape(list, px, py) {
  for (let i = list.length - 1; i >= 0; i--) {
    if (hitTestShape(list[i], px, py)) return i;
  }
  return -1;
}

function hitTestShape(shape, px, py) {
  if (shape.type === 'text') return hitTestText(shape, px, py);
  return hitTestLineOrShape(shape, px, py);
}

function hitTestText(shape, px, py) {
  const { text, font, size, x1, y1 } = shape;
  ctx.save();
  ctx.font = `${size}px ${font}`;
  const w = ctx.measureText(text).width;
  const h = size;
  ctx.restore();
  return (px >= x1 && px <= x1 + w && py >= y1 && py <= y1 + h);
}

function hitTestLineOrShape(shape, px, py) {
  const threshold = 10;
  const { type, x1, y1, x2, y2 } = shape;

  if (type === 'line' || type === 'arrow') {
    // Check if the point is near the line shaft
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;
    let xx, yy;
    if (param < 0) { xx = x1; yy = y1; }
    else if (param > 1) { xx = x2; yy = y2; }
    else { xx = x1 + param * C; yy = y1 + param * D; }
    const dist = Math.sqrt((px - xx) ** 2 + (py - yy) ** 2);

    // Selectable if near the shaft
    if (dist < threshold) return true;

    // Check if the point is inside the arrowhead (triangle)
    if (type === 'arrow') {
      const arrowSize = 10 + (shape.size * 2);
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const arrowX1 = x2 - arrowSize * Math.cos(angle - Math.PI / 6);
      const arrowY1 = y2 - arrowSize * Math.sin(angle - Math.PI / 6);
      const arrowX2 = x2 - arrowSize * Math.cos(angle + Math.PI / 6);
      const arrowY2 = y2 - arrowSize * Math.sin(angle + Math.PI / 6);

      return pointInTriangle(px, py, x2, y2, arrowX1, arrowY1, arrowX2, arrowY2);
    }
  } else if (type === 'circle' || type === 'rect') {
    const left = Math.min(x1, x2);
    const right = Math.max(x1, x2);
    const top = Math.min(y1, y2);
    const bottom = Math.max(y1, y2);
    return (
      px >= left - threshold && px <= right + threshold &&
      py >= top - threshold && py <= bottom + threshold
    );
  }
  return false;
}

// **Helper function to check if a point is inside a triangle**
function pointInTriangle(px, py, ax, ay, bx, by, cx, cy) {
  const areaOrig = Math.abs((bx - ax) * (cy - ay) - (cx - ax) * (by - ay));
  const area1 = Math.abs((ax - px) * (by - py) - (bx - px) * (ay - py));
  const area2 = Math.abs((bx - px) * (cy - py) - (cx - px) * (by - py));
  const area3 = Math.abs((cx - px) * (ay - py) - (ax - px) * (cy - py));
  return Math.abs(area1 + area2 + area3 - areaOrig) < 0.1;
}
