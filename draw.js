function initDrawingManager() {
    const canvas = document.getElementById('drawingCanvas');
    const ctx = canvas.getContext('2d');
  
    // Buttons
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    const selectBtn = document.getElementById('selectBtn');
    const drawBtn = document.getElementById('drawBtn');
  
    // Tooltip for choosing shape/color/thickness
    const drawTooltip = document.getElementById('drawTooltip');
    const closeTooltipBtn = document.getElementById('closeTooltipBtn');
    const shapeSelect = document.getElementById('shapeSelect');
    const colorPicker = document.getElementById('colorPicker');
    const sizeRange = document.getElementById('sizeRange');
  
    // State arrays
    let shapes = [];
    let undoneShapes = [];
  
    // Selected shape index
    let selectedShapeIndex = -1;
  
    // Are we currently drawing?
    let isDrawing = false;
    let startX = 0;
    let startY = 0;
  
    // Mode: "draw" or "select"
    let mode = "draw"; // default
  
    // Initial cursor
    canvas.style.cursor = 'crosshair';
  
    // ─────────────────────────────────────────────────────────────────────────
    // MODE SWITCHING / TOOLTIP
    // ─────────────────────────────────────────────────────────────────────────
  
    // "Add Line" button → go to draw mode, toggle tooltip
    drawBtn.addEventListener('click', () => {
      mode = 'draw';
      selectedShapeIndex = -1;
      canvas.style.cursor = 'crosshair';
  
      // Toggle tooltip
      if (drawTooltip.style.display === 'block') {
        drawTooltip.style.display = 'none';
      } else {
        drawTooltip.style.display = 'block';
      }
      redrawAll();
    });
  
    // Close tooltip
    closeTooltipBtn.addEventListener('click', () => {
      drawTooltip.style.display = 'none';
    });
  
    // "Select" button → go to select mode, hide tooltip
    selectBtn.addEventListener('click', () => {
      mode = 'select';
      selectedShapeIndex = -1;
      drawTooltip.style.display = 'none';
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
  
      // Otherwise mode === 'draw'
      // Check if the user clicked on an existing shape
      const foundIndex = findTopShapeAt(shapes, clickX, clickY);
      if (foundIndex !== -1) {
        // They clicked an existing shape → automatically switch to SELECT mode
        mode = 'select';
        selectedShapeIndex = foundIndex;
        isDrawing = false;
        canvas.style.cursor = 'pointer';
        drawTooltip.style.display = 'none';
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
      if (!isDrawing || mode !== 'draw') return;
  
      redrawAll();
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
  
      // Live preview shape
      const previewShape = {
        type: shapeSelect.value, // 'line' or 'arrow'
        color: colorPicker.value,
        size: parseInt(sizeRange.value, 10),
        x1: startX,
        y1: startY,
        x2: mouseX,
        y2: mouseY
      };
      drawShape(previewShape, false); // false → not selected
    });
  
    canvas.addEventListener('mouseup', (e) => {
      if (!isDrawing || mode !== 'draw') return;
      isDrawing = false;
  
      const rect = canvas.getBoundingClientRect();
      const endX = e.clientX - rect.left;
      const endY = e.clientY - rect.top;
  
      const newShape = {
        type: shapeSelect.value,
        color: colorPicker.value,
        size: parseInt(sizeRange.value, 10),
        x1: startX,
        y1: startY,
        x2: endX,
        y2: endY
      };
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
     * Draws either a line or an arrow in the given color/size.
     * If `isSelected === true`, it first draws a thicker white outline, then the shape, then
     * some blue circles on endpoints.
     */
    function drawShape(shape, isSelected) {
      const { type, color, size, x1, y1, x2, y2 } = shape;
  
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
  
      if (isSelected) {
        // 1) Draw a white "outline" behind the shape
        //    We'll make the line ~4px thicker than the original line
        const outlineWidth = size + 4;
  
        // Outline the line/arrow
        if (type === 'line') {
          // White line behind
          ctx.strokeStyle = 'white';
          ctx.lineWidth = outlineWidth;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        } else if (type === 'arrow') {
          // Outline the main shaft
          ctx.strokeStyle = 'white';
          ctx.lineWidth = outlineWidth;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
  
          // Outline arrow head (just do a wide stroke around the same polygon)
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
          ctx.stroke();
        }
      }
  
      // 2) Now draw the shape in its normal color
      ctx.strokeStyle = color;
      ctx.lineWidth = shape.size;
  
      if (type === 'line') {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      } else if (type === 'arrow') {
        // main line
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
  
        // arrow head (filled polygon)
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
  
      // 3) If selected, also draw endpoint circles in blue
      if (isSelected) {
        ctx.fillStyle = 'blue';
        ctx.beginPath();
        ctx.arc(x1, y1, size + 2, 0, 2 * Math.PI);
        ctx.fill();
  
        ctx.beginPath();
        ctx.arc(x2, y2, size + 2, 0, 2 * Math.PI);
        ctx.fill();
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
     * Returns true if (px,py) is close enough to shape's line segment or arrow head.
     */
    function isPointOnShape(shape, px, py) {
      const threshold = 10;
      const { x1, y1, x2, y2 } = shape;
  
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
  }
  