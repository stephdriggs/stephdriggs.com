// ▄▄▄▄  ▄▄ ▄▄                         
// ██▄██ ▀███▀                         
// ██▄█▀   █                                                                                                                              
//   ▄▄  ▄▄▄  ▄▄ ▄▄ ▄▄▄▄▄              
//   ██ ██▀██ ██▄█▀ ██▄▄               
// ▄▄█▀ ██▀██ ██ ██ ██▄▄▄                                                                                                                    
// ▄▄   ▄▄ ▄▄▄▄▄ ▄▄     ▄▄▄▄ ▄▄ ▄▄     
// ██ ▄ ██ ██▄▄  ██    ██▀▀▀ ██▄██     
//  ▀█▀█▀  ██▄▄▄ ██▄▄▄ ▀████ ██ ██                                                                                                           
//   ▄▄▄▄  ▄▄▄▄▄  ▄▄▄▄ ▄▄  ▄▄▄▄ ▄▄  ▄▄ 
//   ██▀██ ██▄▄  ███▄▄ ██ ██ ▄▄ ███▄██ 
// ▄ ████▀ ██▄▄▄ ▄▄██▀ ██ ▀███▀ ██ ▀██ 


let img;
let exampleShader;
let canvasWidth;
let canvasHeight;
let lastX = 0;
let lastY = 0;

async function setup() {
  img = await loadImage('./assets/images/coming-soon.png');

  const isMobile = window.innerWidth <= 768 || ('ontouchstart' in window);

  canvasWidth = isMobile ? 300 : 500;

  const aspectRatio = img.width / img.height; 
  canvasHeight = canvasWidth / aspectRatio;

  createCanvas(canvasWidth, canvasHeight, WEBGL);
  exampleShader = await loadShader('./assets/scripts/reefer.vert', 'assets/scripts/reefer.frag');
  shader(exampleShader);
  noStroke();
  
  // Initialize to center
  lastX = canvasWidth / 2;
  lastY = canvasHeight / 2;
}

function draw() {
  // Use lastX/lastY which is updated by both mouse and touch
  let mx = (lastX / canvasWidth) * 2.0 - 1.0;
  let my = (lastY / canvasHeight) * 2.0 - 1.0;

  exampleShader.setUniform('millis', millis());
  exampleShader.setUniform('uMouse', [mx, my]);
  exampleShader.setUniform('uTexture', img);
  exampleShader.setUniform('uResolution', [canvasWidth, canvasHeight]);
  exampleShader.setUniform('uImageResolution', [img.width, img.height]);
  clear();
  rect(0, 0, canvasWidth, canvasHeight);
}

function windowResized() {
  const isMobile = window.innerWidth <= 768 || ('ontouchstart' in window);
  canvasWidth = isMobile ? 300 : 500;

  const aspectRatio = img.width / img.height;
  canvasHeight = canvasWidth / aspectRatio;

  resizeCanvas(canvasWidth, canvasHeight);
}

// Mouse movement handler (desktop)
function mouseMoved() {
  lastX = mouseX;
  lastY = mouseY;
}

function mouseDragged() {
  lastX = mouseX;
  lastY = mouseY;
}

// Touch handlers (mobile)
function touchStarted() {
  if (touches.length > 0) {
    lastX = touches[0].x;
    lastY = touches[0].y;
  }
  return false; // Prevent default
}

function touchMoved() {
  if (touches.length > 0) {
    lastX = touches[0].x;
    lastY = touches[0].y;
  }
  return false; // Prevent scrolling
}

function touchEnded() {
  return false;
}