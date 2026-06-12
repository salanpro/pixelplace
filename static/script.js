const socket = io();
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let colorInput = document.getElementById("colorPicker");
let color = colorInput.value;

colorInput.addEventListener("input", () => {
  color = colorInput.value;
});


function resizeCanvas() {
  const size = Math.min(window.innerWidth, window.innerHeight) * 0.9;
  canvas.style.width = size + "px";
  canvas.style.height = size + "px";
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);


function drawPixel(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
}


function getXY(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  let x, y;

  if (e.touches) {
    x = e.touches[0].clientX;
    y = e.touches[0].clientY;
  } else {
    x = e.clientX;
    y = e.clientY;
  }

  const px = Math.floor((x - rect.left) * scaleX);
  const py = Math.floor((y - rect.top) * scaleY);
  return { x: px, y: py };
}

function handleDraw(e) {

  if (e.touches && e.touches.length === 1) {
    e.preventDefault();
  }
  const { x, y } = getXY(e);
  socket.emit("draw_pixel", { x, y, color });
}


let drawing = false;


canvas.addEventListener("mousedown", (e) => {
  drawing = true;
  socket.emit("start_stroke");  
  handleDraw(e);
});
canvas.addEventListener("mouseup", () => {
  drawing = false;
});
canvas.addEventListener("mouseleave", () => {
  drawing = false;
});
canvas.addEventListener("mousemove", (e) => {
  if (!drawing) return;
  handleDraw(e);
});


canvas.addEventListener("touchstart", (e) => {
  socket.emit("start_stroke");  
  handleDraw(e);
});
canvas.addEventListener("touchmove", handleDraw);


socket.emit("get_canvas");

socket.on("update_pixel", ({ x, y, color }) => {
  drawPixel(x, y, color);
});

socket.on("load_canvas", (pixelMatrix) => {
  for (let y = 0; y < pixelMatrix.length; y++) {
    for (let x = 0; x < pixelMatrix[y].length; x++) {
      drawPixel(x, y, pixelMatrix[y][x]);
    }
  }
});

function clearCanvas() {

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      drawPixel(x, y, "#FFFFFF");
    }
  }

  socket.emit("clear_canvas");
}

document.getElementById("clearBtn").addEventListener("click", clearCanvas);


const bgColorInput = document.getElementById("bgcolorPicker");
const setBgColorBtn = document.getElementById("setBgColorBtn");

setBgColorBtn.addEventListener("click", () => {
  const newColor = bgColorInput.value;
  socket.emit("change_bgcolor", { color: newColor });
});

function undoCanvas() {
  socket.emit("undo");
}

document.getElementById("undoBtn").addEventListener("click", undoCanvas);

document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "z") {
    e.preventDefault();
    undoCanvas();
  }
});
