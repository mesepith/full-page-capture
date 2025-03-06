function initDrawingManager() {
    const canvas = document.getElementById('drawingCanvas');
    const ctx = canvas.getContext('2d');
  
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
    const textContentArea = document.getElementById('textContentArea');
    const applyTextBtn = document.getElementById('applyTextBtn');
  
    // State
    let shapes = [];
    let undoneShapes = [];
    let selectedShapeIndex = -1;
    let isDrawing = false;
    let startX = 0;
    let startY = 0;
    let pendingText = null; // for text placement
    let mode = 'select';
  
    canvas.style.cursor = 'pointer'; // default
  
    // ───────────────────────────────────────────────────────────────────
    // Helper: show tooltip below a given button
    function showTooltipBelowButton(tooltipEl, buttonEl) {
      // Hide it first to avoid weird transitions
      tooltipEl.style.display = 'none';
  
      const buttonRect = buttonEl.getBoundingClientRect();
      const bodyRect = document.body.getBoundingClientRect();
  
      const top = buttonRect.bottom - bodyRect.top + window.scrollY + 5; 
      const left = buttonRect.left - bodyRect.left + window.scrollX;
  
      tooltipEl.style.top = top + 'px';
      tooltipEl.style.left = left + 'px';
      tooltipEl.style.display = 'block';
    }
  
    // ───────────────────────────────────────────────────────────────────
    // MODE SWITCHING
    // ───────────────────────────────────────────────────────────────────
    selectBtn.addEventListener('click', () => {
      mode = 'select';
      highlightButton(selectBtn);
      closeAllTooltips();
      selectedShapeIndex = -1;
      canvas.style.cursor = 'pointer';
      redrawAll();
    });
  
    drawBtn.addEventListener('click', () => {
      mode = 'line';
      highlightButton(drawBtn);
      closeAllTooltips();
      showTooltipBelowButton(drawTooltip, drawBtn);
      canvas.style.cursor = 'crosshair';
      selectedShapeIndex = -1;
      redrawAll();
    });
  
    drawShapeBtn.addEventListener('click', () => {
      mode = 'shape';
      highlightButton(drawShapeBtn);
      closeAllTooltips();
      showTooltipBelowButton(shapeTooltip, drawShapeBtn);
      canvas.style.cursor = 'crosshair';
      selectedShapeIndex = -1;
      redrawAll();
    });
  
    drawTextBtn.addEventListener('click', () => {
      mode = 'textWait';
      highlightButton(drawTextBtn);
      closeAllTooltips();
      showTooltipBelowButton(textTooltip, drawTextBtn);
      canvas.style.cursor = 'crosshair';
      selectedShapeIndex = -1;
      redrawAll();
    });
  
    function highlightButton(btn) {
      [selectBtn, drawBtn, drawShapeBtn, drawTextBtn].forEach(b => {
        b.classList.remove('active-mode-button');
      });
      btn.classList.add('active-mode-button');
    }
  
    function closeAllTooltips() {
      drawTooltip.style.display = 'none';
      shapeTooltip.style.display = 'none';
      textTooltip.style.display = 'none';
    }
  
    // Close tooltips individually
    closeDrawTooltipBtn.addEventListener('click', () => {
      drawTooltip.style.display = 'none';
    });
    closeShapeTooltipBtn.addEventListener('click', () => {
      shapeTooltip.style.display = 'none';
    });
    closeTextTooltipBtn.addEventListener('click', () => {
      textTooltip.style.display = 'none';
    });
  
    // ───────────────────────────────────────────────────────────────────
    // TEXT: user clicks "Apply," we store text info until next canvas click
    // ───────────────────────────────────────────────────────────────────
    applyTextBtn.addEventListener('click', () => {
      const txt = textContentArea.value.trim();
      if (txt) {
        pendingText = {
          text: txt,
          font: textFontSelect.value,
          color: textColorPicker.value,
          size: parseInt(textSizeRange.value, 10)
        };
        mode = 'text'; // next click will place the text
        textTooltip.style.display = 'none';
      } else {
        pendingText = null;
      }
    });
  
    // ───────────────────────────────────────────────────────────────────
    // CANVAS EVENTS
    // ───────────────────────────────────────────────────────────────────
    canvas.addEventListener('mousedown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
  
      if (mode === 'select') {
        const foundIndex = findTopShape(shapes, clickX, clickY);
        selectedShapeIndex = foundIndex;
        redrawAll();
        return;
      }
  
      // If there's a shape under the click in "line"/"shape"/"text" mode, 
      // we switch to select
      const foundIndex = findTopShape(shapes, clickX, clickY);
      if (foundIndex !== -1) {
        mode = 'select';
        highlightButton(selectBtn);
        selectedShapeIndex = foundIndex;
        canvas.style.cursor = 'pointer';
        closeAllTooltips();
        redrawAll();
        return;
      }
  
      // If mode === 'text' and pendingText is set, place the text
      if (mode === 'text' && pendingText) {
        const newShape = {
          type: 'text',
          text: pendingText.text,
          font: pendingText.font,
          color: pendingText.color,
          size: pendingText.size,
          x1: clickX,
          y1: clickY
        };
        shapes.push(newShape);
        undoneShapes = [];
        pendingText = null;
        mode = 'select';
        highlightButton(selectBtn);
        canvas.style.cursor = 'pointer';
        redrawAll();
        return;
      }
  
      if (mode === 'textWait') {
        // user hasn't pressed "Apply" yet => do nothing
        return;
      }
  
      // If "line" or "shape"
      if (mode === 'line' || mode === 'shape') {
        isDrawing = true;
        startX = clickX;
        startY = clickY;
      }
    });
  
    canvas.addEventListener('mousemove', (e) => {
      if (!isDrawing) return;
      if (mode !== 'line' && mode !== 'shape') return;
  
      // Show a live preview
      redrawAll();
  
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
  
      let shapeObj;
      if (mode === 'line') {
        shapeObj = {
          type: lineShapeSelect.value, // 'arrow' or 'line'
          color: lineColorPicker.value,
          size: parseInt(lineSizeRange.value, 10),
          x1: startX,
          y1: startY,
          x2: mouseX,
          y2: mouseY
        };
      } else {
        // mode === 'shape'
        shapeObj = {
          type: shapeSelect2.value, // 'circle' or 'rect'
          color: shapeColorPicker.value,
          size: parseInt(shapeSizeRange.value, 10),
          x1: startX,
          y1: startY,
          x2: mouseX,
          y2: mouseY
        };
      }
  
      drawShape(shapeObj, false);
    });
  
    canvas.addEventListener('mouseup', (e) => {
      if (!isDrawing) return;
      if (mode !== 'line' && mode !== 'shape') return;
  
      isDrawing = false;
      const rect = canvas.getBoundingClientRect();
      const endX = e.clientX - rect.left;
      const endY = e.clientY - rect.top;
  
      let shapeObj;
      if (mode === 'line') {
        shapeObj = {
          type: lineShapeSelect.value, // arrow or line
          color: lineColorPicker.value,
          size: parseInt(lineSizeRange.value, 10),
          x1: startX,
          y1: startY,
          x2: endX,
          y2: endY
        };
      } else {
        // shape
        shapeObj = {
          type: shapeSelect2.value, // 'circle' or 'rect'
          color: shapeColorPicker.value,
          size: parseInt(shapeSizeRange.value, 10),
          x1: startX,
          y1: startY,
          x2: endX,
          y2: endY
        };
      }
  
      shapes.push(shapeObj);
      undoneShapes = [];
      redrawAll();
    });
  
    // ───────────────────────────────────────────────────────────────────
    // UNDO / REDO
    // ───────────────────────────────────────────────────────────────────
    undoBtn.addEventListener('click', () => {
      if (shapes.length > 0) {
        undoneShapes.push(shapes.pop());
        selectedShapeIndex = -1;
        redrawAll();
      }
    });
  
    redoBtn.addEventListener('click', () => {
      if (undoneShapes.length > 0) {
        shapes.push(undoneShapes.pop());
        selectedShapeIndex = -1;
        redrawAll();
      }
    });
  
    // Keyboard for delete
    document.addEventListener('keydown', (e) => {
      if (selectedShapeIndex !== -1 && (e.key === 'Delete' || e.key === 'Backspace')) {
        shapes.splice(selectedShapeIndex, 1);
        selectedShapeIndex = -1;
        redrawAll();
      }
    });
  
    // ───────────────────────────────────────────────────────────────────
    // DRAWING HELPERS
    // ───────────────────────────────────────────────────────────────────
    function redrawAll() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      shapes.forEach((shape, idx) => {
        const isSelected = (idx === selectedShapeIndex);
        drawShape(shape, isSelected);
      });
    }
  
    function drawShape(shape, isSelected) {
      if (isSelected) {
        drawOutline(shape);
      }
  
      const { type } = shape;
      if (type === 'line' || type === 'arrow' || type === 'circle' || type === 'rect') {
        drawLineOrShape(shape);
      }
      else if (type === 'text') {
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
      }
      else if (type === 'arrow') {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
  
        // arrow head
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const headLen = 10 + (size * 2);
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(
          x2 - headLen * Math.cos(angle - Math.PI / 6),
          y2 - headLen * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          x2 - headLen * Math.cos(angle + Math.PI / 6),
          y2 - headLen * Math.sin(angle + Math.PI / 6)
        );
        ctx.lineTo(x2, y2);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
      }
      else if (type === 'circle') {
        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2;
        const rx = Math.abs(x2 - x1) / 2;
        const ry = Math.abs(y2 - y1) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
        ctx.stroke();
      }
      else if (type === 'rect') {
        const left = Math.min(x1, x2);
        const top = Math.min(y1, y2);
        const w = Math.abs(x2 - x1);
        const h = Math.abs(y2 - y1);
        ctx.strokeRect(left, top, w, h);
      }
  
      ctx.restore();
    }
  
    function drawTextShape(shape) {
      const { text, font, color, size, x1, y1 } = shape;
      ctx.save();
      ctx.font = `${size}px ${font}`;
      ctx.fillStyle = color;
      ctx.textBaseline = 'top';
      ctx.fillText(text, x1, y1);
      ctx.restore();
    }
  
    function drawOutline(shape) {
      if (shape.type === 'text') {
        const { text, font, size, x1, y1 } = shape;
        ctx.save();
        ctx.font = `${size}px ${font}`;
        const w = ctx.measureText(text).width;
        const h = size;
        ctx.fillStyle = 'white';
        ctx.fillRect(x1 - 2, y1 - 2, w + 4, h + 4);
        ctx.strokeStyle = 'orange';
        ctx.lineWidth = 2;
        ctx.strokeRect(x1 - 2, y1 - 2, w + 4, h + 4);
        ctx.restore();
      } else {
        // arrow/line/circle/rect
        ctx.save();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = (shape.size || 3) + 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
  
        if (shape.type === 'line' || shape.type === 'arrow') {
          ctx.beginPath();
          ctx.moveTo(shape.x1, shape.y1);
          ctx.lineTo(shape.x2, shape.y2);
          ctx.stroke();
          if (shape.type === 'arrow') {
            const angle = Math.atan2(shape.y2 - shape.y1, shape.x2 - shape.x1);
            const headLen = 10 + ((shape.size || 3) + 4) * 2;
            ctx.beginPath();
            ctx.moveTo(shape.x2, shape.y2);
            ctx.lineTo(
              shape.x2 - headLen * Math.cos(angle - Math.PI / 6),
              shape.y2 - headLen * Math.sin(angle - Math.PI / 6)
            );
            ctx.lineTo(
              shape.x2 - headLen * Math.cos(angle + Math.PI / 6),
              shape.y2 - headLen * Math.sin(angle + Math.PI / 6)
            );
            ctx.lineTo(shape.x2, shape.y2);
            ctx.closePath();
            ctx.stroke();
          }
        }
        else if (shape.type === 'circle') {
          const cx = (shape.x1 + shape.x2) / 2;
          const cy = (shape.y1 + shape.y2) / 2;
          const rx = Math.abs(shape.x2 - shape.x1) / 2;
          const ry = Math.abs(shape.y2 - shape.y1) / 2;
          ctx.beginPath();
          ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
          ctx.stroke();
        }
        else if (shape.type === 'rect') {
          const left = Math.min(shape.x1, shape.x2);
          const top = Math.min(shape.y1, shape.y2);
          const w = Math.abs(shape.x2 - shape.x1);
          const h = Math.abs(shape.y2 - shape.y1);
          ctx.strokeRect(left, top, w, h);
        }
  
        ctx.restore();
      }
    }
  
    
    // ───────────────────────────────────────────────────────────────────
    // HIT TEST
    // ───────────────────────────────────────────────────────────────────
    function findTopShape(list, px, py) {
        for (let i = list.length - 1; i >= 0; i--) {
          if (hitTestShape(list[i], px, py)) {
            return i;
          }
        }
        return -1;
      }
    
      function hitTestShape(shape, px, py) {
        if (shape.type === 'text') {
          return hitTestText(shape, px, py);
        } else {
          return hitTestLineOrShape(shape, px, py);
        }
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
          // distance from point to line
          const A = px - x1;
          const B = py - y1;
          const C = x2 - x1;
          const D = y2 - y1;
          const dot = A*C + B*D;
          const lenSq = C*C + D*D;
          let param = -1;
          if (lenSq !== 0) {
            param = dot / lenSq;
          }
          let xx, yy;
          if (param < 0) {
            xx = x1; yy = y1;
          } else if (param > 1) {
            xx = x2; yy = y2;
          } else {
            xx = x1 + param*C;
            yy = y1 + param*D;
          }
          const dist = Math.sqrt((px - xx)**2 + (py - yy)**2);
          return dist < threshold;
        }
        else if (type === 'circle' || type === 'rect') {
          // bounding box check
          const left = Math.min(x1, x2);
          const right = Math.max(x1, x2);
          const top = Math.min(y1, y2);
          const bottom = Math.max(y1, y2);
          if (
            px >= left - threshold && px <= right + threshold &&
            py >= top - threshold && py <= bottom + threshold
          ) {
            return true;
          }
          return false;
        }
        return false;
      }
  }
  