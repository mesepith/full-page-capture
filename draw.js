function initDrawingManager() {
    const canvas = document.getElementById('drawingCanvas');
    const ctx = canvas.getContext('2d');
  
    // Buttons
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    const selectBtn = document.getElementById('selectBtn');
    const drawBtn = document.getElementById('drawBtn');
  
    // NEW: "Draw Shape" button
    const drawShapeBtn = document.getElementById('drawShapeBtn');
  
    // Tooltip for line/arrow
    const drawTooltip = document.getElementById('drawTooltip');
    const closeTooltipBtn = document.getElementById('closeTooltipBtn');
    const shapeSelect = document.getElementById('shapeSelect');      // arrow/line
    const colorPicker = document.getElementById('colorPicker');
    const sizeRange = document.getElementById('sizeRange');
  
    // NEW: Tooltip for circle/rectangle
    const shapeTooltip = document.getElementById('shapeTooltip');
    const closeShapeTooltipBtn = document.getElementById('closeShapeTooltipBtn');
    const shapeSelect2 = document.getElementById('shapeSelect2');    // circle/rect
    const shapeColorPicker = document.getElementById('shapeColorPicker');
    const shapeSizeRange = document.getElementById('shapeSizeRange');
  
    // State arrays
    let shapes = [];
    let undoneShapes = [];
  
    // Selected shape index
    let selectedShapeIndex = -1;
  
    // Are we currently drawing?
    let isDrawing = false;
    let startX = 0;
    let startY = 0;
  
    // Possible modes: "draw" (arrow/line), "drawShape" (circle/rect), or "select"
    let mode = "draw"; // default
  
    // Initial cursor
    canvas.style.cursor = 'crosshair';
  
    // ─────────────────────────────────────────────────────────────────────────
    // MODE SWITCHING FOR LINE/ARROW
    // ─────────────────────────────────────────────────────────────────────────
  
    // "Add Line" → go to draw mode (arrow/line), toggle the line/arrow tooltip
    drawBtn.addEventListener('click', () => {
      mode = 'draw';
  
      // highlight "Add Line" button, unhighlight others
      drawBtn.classList.add('active-mode-button');
      drawShapeBtn.classList.remove('active-mode-button');
      selectBtn.classList.remove('active-mode-button');
  
      selectedShapeIndex = -1;
      canvas.style.cursor = 'crosshair';
  
      // Toggle line/arrow tooltip
      if (drawTooltip.style.display === 'block') {
        drawTooltip.style.display = 'none';
      } else {
        drawTooltip.style.display = 'block';
        shapeTooltip.style.display = 'none'; // hide shape tooltip if open
      }
      redrawAll();
    });
  
    closeTooltipBtn.addEventListener('click', () => {
      drawTooltip.style.display = 'none';
    });
  
    // ─────────────────────────────────────────────────────────────────────────
    // NEW: MODE SWITCHING FOR CIRCLE/RECT
    // ─────────────────────────────────────────────────────────────────────────
  
    drawShapeBtn.addEventListener('click', () => {
      mode = 'drawShape';
  
      // highlight the "Draw Shape" button, unhighlight others
      drawShapeBtn.classList.add('active-mode-button');
      drawBtn.classList.remove('active-mode-button');
      selectBtn.classList.remove('active-mode-button');
  
      selectedShapeIndex = -1;
      canvas.style.cursor = 'crosshair';
  
      // Toggle the shape tooltip
      if (shapeTooltip.style.display === 'block') {
        shapeTooltip.style.display = 'none';
      } else {
        shapeTooltip.style.display = 'block';
        drawTooltip.style.display = 'none'; // hide line/arrow tooltip if open
      }
      redrawAll();
    });
  
    closeShapeTooltipBtn.addEventListener('click', () => {
      shapeTooltip.style.display = 'none';
    });
  
    // ─────────────────────────────────────────────────────────────────────────
    // "Select" button → select mode
    // ─────────────────────────────────────────────────────────────────────────
  
    selectBtn.addEventListener('click', () => {
      mode = 'select';
  
      // highlight the select button
      selectBtn.classList.add('active-mode-button');
      drawBtn.classList.remove('active-mode-button');
      drawShapeBtn.classList.remove('active-mode-button');
  
      selectedShapeIndex = -1;
      drawTooltip.style.display = 'none';
      shapeTooltip.style.display = 'none';
      canvas.style.cursor = 'pointer';
      redrawAll();
    });
  
    // ─────────────────────────────────────────────────────────────────────────
    // CANVAS EVENTS
    // ─────────────────────────────────────────────────────────────────────────
  
    canvas.addEventListener('mousedown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
  
      if (mode === 'select') {
        // Try to find a shape under the click
        const foundIndex = findTopShapeAt(shapes, clickX, clickY);
        selectedShapeIndex = foundIndex;
        redrawAll();
        return;
      }
  
      // If in "draw" or "drawShape" mode, check if user clicked an existing shape
      const foundIndex = findTopShapeAt(shapes, clickX, clickY);
      if (foundIndex !== -1) {
        // They clicked an existing shape → automatically switch to SELECT mode
        mode = 'select';
        selectedShapeIndex = foundIndex;
        isDrawing = false;
        canvas.style.cursor = 'pointer';
        drawTooltip.style.display = 'none';
        shapeTooltip.style.display = 'none';
        redrawAll();
      } else {
        // They clicked empty space → start drawing a new shape
        selectedShapeIndex = -1;
        isDrawing = true;
        startX = clickX;
        startY = clickY;
      }
    });
  
    canvas.addEventListener('mousemove', (e) => {
      if (!isDrawing) return;
      if (mode !== 'draw' && mode !== 'drawShape') return;
  
      // We are drawing, so let's do a live preview
      redrawAll();
  
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
  
      // Decide shape type depending on mode
      let previewShape;
      if (mode === 'draw') {
        // line or arrow
        previewShape = {
          type: shapeSelect.value,        // 'arrow' or 'line'
          color: colorPicker.value,
          size: parseInt(sizeRange.value, 10),
          x1: startX,
          y1: startY,
          x2: mouseX,
          y2: mouseY
        };
      } else {
        // mode === 'drawShape' → circle or rect
        previewShape = {
          type: shapeSelect2.value,      // 'circle' or 'rect'
          color: shapeColorPicker.value,
          size: parseInt(shapeSizeRange.value, 10),
          x1: startX,
          y1: startY,
          x2: mouseX,
          y2: mouseY
        };
      }
  
      drawShape(previewShape, false);
    });
  
    canvas.addEventListener('mouseup', (e) => {
      if (!isDrawing) return;
      if (mode !== 'draw' && mode !== 'drawShape') return;
  
      isDrawing = false;
  
      const rect = canvas.getBoundingClientRect();
      const endX = e.clientX - rect.left;
      const endY = e.clientY - rect.top;
  
      // Create a new shape object
      let newShape;
      if (mode === 'draw') {
        // line or arrow
        newShape = {
          type: shapeSelect.value,
          color: colorPicker.value,
          size: parseInt(sizeRange.value, 10),
          x1: startX,
          y1: startY,
          x2: endX,
          y2: endY
        };
      } else {
        // mode === 'drawShape' → circle or rect
        newShape = {
          type: shapeSelect2.value,
          color: shapeColorPicker.value,
          size: parseInt(shapeSizeRange.value, 10),
          x1: startX,
          y1: startY,
          x2: endX,
          y2: endY
        };
      }
  
      shapes.push(newShape);
      undoneShapes = [];
      redrawAll();
    });
  
    // ─────────────────────────────────────────────────────────────────────────
    // KEYBOARD: Delete, Undo, Redo
    // ─────────────────────────────────────────────────────────────────────────
  
    document.addEventListener('keydown', (e) => {
      // Debug
      console.log('Key pressed:', e.key, 'Mode:', mode, 'Index:', selectedShapeIndex);
  
      // Delete if shape is selected
      if (selectedShapeIndex !== -1 && (e.key === 'Delete' || e.key === 'Backspace')) {
        shapes.splice(selectedShapeIndex, 1);
        selectedShapeIndex = -1;
        redrawAll();
      }
  
      // Ctrl+Z => Undo
      if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'z') {
        doUndo();
      }
      // Ctrl+Y => Redo
      if (e.ctrlKey && e.key.toLowerCase() === 'y') {
        doRedo();
      }
      // Ctrl+Shift+Z => Redo
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'z') {
        doRedo();
      }
    });
  
    // Undo/Redo Buttons
    undoBtn.addEventListener('click', () => doUndo());
    redoBtn.addEventListener('click', () => doRedo());
  
    function doUndo() {
      if (shapes.length > 0) {
        undoneShapes.push(shapes.pop());
        selectedShapeIndex = -1;
        redrawAll();
      }
    }
    function doRedo() {
      if (undoneShapes.length > 0) {
        shapes.push(undoneShapes.pop());
        selectedShapeIndex = -1;
        redrawAll();
      }
    }
  
    // ─────────────────────────────────────────────────────────────────────────
    // DRAWING UTILITIES
    // ─────────────────────────────────────────────────────────────────────────
  
    /** Clears the canvas and draws all shapes, highlighting the selected one. */
    function redrawAll() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
  
      shapes.forEach((shape, index) => {
        const isSelected = (index === selectedShapeIndex);
        drawShape(shape, isSelected);
      });
    }
  
    /**
     * Draw line, arrow, circle, or rectangle, depending on `shape.type`.
     * If `isSelected` is true, draw a white outline first + highlight endpoints.
     */
    function drawShape(shape, isSelected) {
      const { type, color, size, x1, y1, x2, y2 } = shape;
  
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
  
      // If selected, draw a thicker white outline behind the shape
      if (isSelected) {
        drawShapeOutline(type, x1, y1, x2, y2, size + 4);
      }
  
      // Now draw the shape in its normal color
      ctx.strokeStyle = color;
      ctx.lineWidth = size;
  
      if (type === 'line') {
        // simple line
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      else if (type === 'arrow') {
        // arrow line
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
        // interpret (x1, y1) as one corner, (x2, y2) as opposite corner
        // compute center, radius
        const centerX = (x1 + x2) / 2;
        const centerY = (y1 + y2) / 2;
        const radiusX = Math.abs(x2 - x1) / 2;
        const radiusY = Math.abs(y2 - y1) / 2;
  
        ctx.beginPath();
        // ellipse() can do circles of different widths/heights
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
        ctx.stroke();
      }
      else if (type === 'rect') {
        // rectangular bounding box from (x1, y1) to (x2, y2)
        const left = Math.min(x1, x2);
        const top = Math.min(y1, y2);
        const width = Math.abs(x2 - x1);
        const height = Math.abs(y2 - y1);
  
        ctx.strokeRect(left, top, width, height);
      }
  
      // If selected, draw endpoint circles
      if (isSelected) {
        ctx.fillStyle = 'blue';
        ctx.beginPath();
        ctx.arc(x1, y1, size + 2, 0, 2*Math.PI);
        ctx.fill();
  
        ctx.beginPath();
        ctx.arc(x2, y2, size + 2, 0, 2*Math.PI);
        ctx.fill();
      }
  
      ctx.restore();
    }
  
    /**
     * Draws a thick white outline behind line/arrow/circle/rect
     */
    function drawShapeOutline(type, x1, y1, x2, y2, outlineWidth) {
      ctx.save();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = outlineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
  
      if (type === 'line') {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      else if (type === 'arrow') {
        // main arrow line
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
  
        // arrow head outline
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const headLen = 10 + (outlineWidth * 2);
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
        ctx.stroke();
      }
      else if (type === 'circle') {
        const centerX = (x1 + x2) / 2;
        const centerY = (y1 + y2) / 2;
        const radiusX = Math.abs(x2 - x1) / 2;
        const radiusY = Math.abs(y2 - y1) / 2;
  
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
        ctx.stroke();
      }
      else if (type === 'rect') {
        const left = Math.min(x1, x2);
        const top = Math.min(y1, y2);
        const width = Math.abs(x2 - x1);
        const height = Math.abs(y2 - y1);
  
        ctx.strokeRect(left, top, width, height);
      }
      ctx.restore();
    }
  
    /**
     * Finds the topmost shape at (x, y), or -1 if none is near.
     */
    function findTopShapeAt(list, x, y) {
      for (let i = list.length - 1; i >= 0; i--) {
        if (isPointOnShape(list[i], x, y)) {
          return i;
        }
      }
      return -1;
    }
  
    /**
     * Returns true if (px,py) is close enough to shape's line or boundary.
     * Here we do the same line-distance check for lines and arrows.
     * For rect/circle, we do a simpler bounding box or shape-based check.
     * 
     * The code below just does the line check. 
     * You might want to expand it for circle/rect if you want better selection
     * logic for those shapes.
     */
    function isPointOnShape(shape, px, py) {
      const threshold = 10;
      const { x1, y1, x2, y2, type } = shape;
  
      if (type === 'line' || type === 'arrow') {
        // Distance from point to line segment
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;
  
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        if (lenSq !== 0) {
          param = dot / lenSq;
        }
  
        let xx, yy;
        if (param < 0) {
          xx = x1;
          yy = y1;
        } else if (param > 1) {
          xx = x2;
          yy = y2;
        } else {
          xx = x1 + param * C;
          yy = y1 + param * D;
        }
  
        const dist = Math.sqrt((px - xx) ** 2 + (py - yy) ** 2);
        return dist < threshold;
      }
      else if (type === 'circle') {
        // quick bounding box check
        const left = Math.min(x1, x2);
        const right = Math.max(x1, x2);
        const top = Math.min(y1, y2);
        const bottom = Math.max(y1, y2);
        if (px < left - threshold || px > right + threshold) return false;
        if (py < top - threshold || py > bottom + threshold) return false;
        // optionally do a more precise ellipse check
        return true;
      }
      else if (type === 'rect') {
        // bounding box
        const left = Math.min(x1, x2);
        const right = Math.max(x1, x2);
        const top = Math.min(y1, y2);
        const bottom = Math.max(y1, y2);
        // if user clicks within ~10px of bounding box
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
  