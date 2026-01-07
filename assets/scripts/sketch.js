let img;
let exampleShader;
let canvasWidth;
let canvasHeight;
let touchX = 0;
let touchY = 0;
let isDragging = false;

async function setup() {
  // Load image first to get dimensions
  img = await loadImage('./assets/images/coming-soon.png');

  // Better mobile detection
  const isMobile = window.innerWidth <= 768 || ('ontouchstart' in window);

  // Set canvas width based on device
  canvasWidth = isMobile ? 300 : 500;

  // Calculate height based on image aspect ratio to maintain proportions
  const aspectRatio = img.width / img.height; // Note: width/height for correct aspect
  canvasHeight = canvasWidth / aspectRatio;

  createCanvas(canvasWidth, canvasHeight, WEBGL);
  exampleShader = await loadShader('./assets/scripts/reefer.vert', 'assets/scripts/reefer.frag');
  shader(exampleShader);
  noStroke();
}

function draw() {
  // Handle input based on device type
  const isMobile = window.innerWidth <= 768 || ('ontouchstart' in window);
  let mx, my;

  if (isMobile) {
    // Use touch/drag position on mobile
    mx = (touchX / canvasWidth) * 2.0 - 1.0;
    my = (touchY / canvasHeight) * 2.0 - 1.0;
  } else {
    // Use mouse position on desktop (already centered)
    mx = (mouseX / canvasWidth) * 2.0 - 1.0;
    my = (mouseY / canvasHeight) * 2.0 - 1.0;
  }

  exampleShader.setUniform('millis', millis());
  exampleShader.setUniform('uMouse', [mx, my]);
  exampleShader.setUniform('uTexture', img);
  exampleShader.setUniform('uResolution', [canvasWidth, canvasHeight]);
  exampleShader.setUniform('uImageResolution', [img.width, img.height]);
  clear();
  rect(0, 0, canvasWidth, canvasHeight);
}

function windowResized() {
  // Recalculate dimensions on resize (useful for mobile orientation changes)
  const isMobile = window.innerWidth <= 768 || ('ontouchstart' in window);
  canvasWidth = isMobile ? 300 : 500;

  const aspectRatio = img.width / img.height;
  canvasHeight = canvasWidth / aspectRatio;

  resizeCanvas(canvasWidth, canvasHeight);
}

// Touch event handlers for mobile drag interaction
function touchStarted() {
  isDragging = true;
  touchX = mouseX; // p5.js mouseX works for touch too
  touchY = mouseY;
  return false; // Prevent default behavior
}

function touchMoved() {
  if (isDragging) {
    touchX = mouseX;
    touchY = mouseY;
  }
  return false; // Prevent scrolling
}

function touchEnded() {
  isDragging = false;
  return false;
}