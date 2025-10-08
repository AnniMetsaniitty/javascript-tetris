/* 
  JavaScript Tetris (JS separated)
  Adapted from jakesgordon/javascript-tetris (MIT).
  This version moves all game logic out of the HTML file and into this module.
  (c) Original work by Jake Gordon; refactor & styling by the adapter.
  License: MIT (see LICENSE)
*/

// -------------------------------------------------------------
// Config
// -------------------------------------------------------------
const COLS = 10;
const ROWS = 20;
const BLOCK = 24;       // pixel size of a single cell
const LINE_CLEAR_SCORES = [0, 40, 100, 300, 1200]; // Tetris guideline-ish
const LEVEL_SPEED_MS = [800, 716, 633, 550, 466, 383, 300, 216, 133, 100]; // drop speeds per level

// Tetrimino shapes (as matrixes), using 0 empty, >0 occupied with a color key
const SHAPES = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  J: [
    [2, 0, 0],
    [2, 2, 2],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 3],
    [3, 3, 3],
    [0, 0, 0],
  ],
  O: [
    [4, 4],
    [4, 4],
  ],
  S: [
    [0, 5, 5],
    [5, 5, 0],
    [0, 0, 0],
  ],
  T: [
    [0, 6, 0],
    [6, 6, 6],
    [0, 0, 0],
  ],
  Z: [
    [7, 7, 0],
    [0, 7, 7],
    [0, 0, 0],
  ],
};

const COLORS = {
  1: "#6dd6ff", // I
  2: "#3b82f6", // J
  3: "#f59e0b", // L
  4: "#fbbf24", // O
  5: "#22c55e", // S
  6: "#a78bfa", // T
  7: "#ef4444", // Z
  GHOST: "rgba(255,255,255,.14)",
  GRID: "rgba(255,255,255,.06)",
};

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------
const $ = sel => document.querySelector(sel);
const rnd = arr => arr[Math.floor(Math.random() * arr.length)];

function rotateMatrix(m) {
  // 90° clockwise
  const N = m.length;
  const res = Array.from({ length: N }, () => Array(N).fill(0));
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) res[x][N - 1 - y] = m[y][x];
  return res;
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// -------------------------------------------------------------
// Game State
// -------------------------------------------------------------
const state = {
  grid: Array.from({ length: ROWS }, () => Array(COLS).fill(0)),
  piece: null,           // {x, y, shapeKey, matrix}
  next: null,            // next shape key
  score: 0,
  lines: 0,
  level: 1,
  dropTimer: 0,
  dropInterval: LEVEL_SPEED_MS[0],
  lastTs: 0,
  paused: false,
  over: false,
  waitingStart: true,
};

// -------------------------------------------------------------
// Piece / Bag generation
// -------------------------------------------------------------
let bag = [];

function refillBag() {
  bag = Object.keys(SHAPES)
    .sort(() => Math.random() - 0.5);
}

function takeFromBag() {
  if (bag.length === 0) refillBag();
  return bag.pop();
}

function spawnPiece() {
  const shapeKey = state.next ?? takeFromBag();
  state.next = takeFromBag();

  const matrix = clone(SHAPES[shapeKey]);
  // starting x centers the piece; y slightly above visible area for spawn
  const size = matrix[0].length;
  const x = Math.floor((COLS - size) / 2);
  const y = -getTopPadding(matrix);

  state.piece = { x, y, shapeKey, matrix };

  if (collides(0, 0, matrix)) {
    state.over = true;
  }
}

function getTopPadding(matrix) {
  // how many empty rows at top of matrix
  let pad = 0;
  for (let r = 0; r < matrix.length; r++) {
    if (matrix[r].every(v => v === 0)) pad++;
    else break;
  }
  return pad;
}

// -------------------------------------------------------------
// Collision & Board integration
// -------------------------------------------------------------
function collides(dx, dy, matrix = state.piece.matrix) {
  const { x, y } = state.piece;
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      if (!matrix[r][c]) continue;
      const nx = x + c + dx;
      const ny = y + r + dy;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && state.grid[ny][nx]) return true;
    }
  }
  return false;
}

function lockPiece() {
  const { x, y, matrix } = state.piece;
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      if (matrix[r][c]) {
        const gx = x + c, gy = y + r;
        if (gy >= 0) state.grid[gy][gx] = matrix[r][c];
      }
    }
  }
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; ) {
    if (state.grid[r].every(v => v > 0)) {
      state.grid.splice(r, 1);
      state.grid.unshift(Array(COLS).fill(0));
      cleared++;
    } else {
      r--;
    }
  }
  if (cleared > 0) {
    state.lines += cleared;
    state.score += LINE_CLEAR_SCORES[cleared] * state.level;
    // ramp level each 10 lines (tweak as desired)
    const newLevel = Math.min(10, Math.floor(state.lines / 10) + 1);
    if (newLevel !== state.level) {
      state.level = newLevel;
      state.dropInterval = LEVEL_SPEED_MS[newLevel - 1] ?? 80;
    }
    updateStats();
  }
}

// -------------------------------------------------------------
// Rendering
// -------------------------------------------------------------
const boardCanvas = $("#board");
const nextCanvas = $("#next");
const ctx = boardCanvas.getContext("2d");
const nextCtx = nextCanvas.getContext("2d");

function draw() {
  ctx.clearRect(0, 0, boardCanvas.width, boardCanvas.height);
  drawGrid();
  drawBoard();
  if (state.waitingStart) {
    drawStartScreen();   // 👈 draw start only on first load
    return;
  }
  drawGhost();
  drawPiece();
  if (state.over) drawGameOver();
}

function drawGrid() {
  ctx.save();
  ctx.strokeStyle = COLORS.GRID;
  ctx.lineWidth = 1;
  for (let x = 0; x <= COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x * BLOCK + 0.5, 0);
    ctx.lineTo(x * BLOCK + 0.5, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let y = 0; y <= ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * BLOCK + 0.5);
    ctx.lineTo(COLS * BLOCK, y * BLOCK + 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCell(x, y, v) {
  if (!v) return;
  const px = x * BLOCK;
  const py = y * BLOCK;
  ctx.fillStyle = COLORS[v] || "#fff";
  ctx.fillRect(px + 1, py + 1, BLOCK - 2, BLOCK - 2);
}

function drawBoard() {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawCell(c, r, state.grid[r][c]);
}

function getGhostY() {
  let gy = state.piece.y;
  while (!collides(0, gy - state.piece.y + 1)) gy++;
  return gy;
}

function drawGhost() {
  if (!state.piece) return;
  const { x, matrix } = state.piece;
  const gy = getGhostY();
  ctx.save();
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      if (matrix[r][c]) {
        const px = (x + c) * BLOCK;
        const py = (gy + r) * BLOCK;
        ctx.fillStyle = COLORS.GHOST;
        ctx.fillRect(px + 1, py + 1, BLOCK - 2, BLOCK - 2);
      }
    }
  }
  ctx.restore();
}

function drawPiece() {
  const { x, y, matrix } = state.piece;
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      if (matrix[r][c]) drawCell(x + c, y + r, matrix[r][c]);
    }
  }
}

function drawNext() {
  const key = state.next;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  if (!key) return;
  const m = SHAPES[key];
  const size = m.length;
  const offset = {
    x: Math.floor((nextCanvas.width / BLOCK - size) / 2),
    y: Math.floor((nextCanvas.height / BLOCK - size) / 2),
  };
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (m[r][c]) {
        nextCtx.fillStyle = COLORS[m[r][c]];
        nextCtx.fillRect(
          (offset.x + c) * (BLOCK / 1.2) + 2,
          (offset.y + r) * (BLOCK / 1.2) + 2,
          BLOCK / 1.2 - 4,
          BLOCK / 1.2 - 4
        );
      }
    }
  }
}

function drawGameOver() {
  ctx.save();
  ctx.fillStyle = "rgba(10, 13, 18, .65)";
  ctx.fillRect(0, 0, boardCanvas.width, boardCanvas.height);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 20px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Game Over", boardCanvas.width / 2, boardCanvas.height / 2 - 8);
  ctx.font = "14px system-ui, sans-serif";
  ctx.fillText("Press R to restart", boardCanvas.width / 2, boardCanvas.height / 2 + 16);
  ctx.restore();
}

function drawStartScreen() {
  ctx.save();
  ctx.fillStyle = "rgba(10, 13, 18, .65)";
  ctx.fillRect(0, 0, boardCanvas.width, boardCanvas.height);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 20px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Press Enter to Start", boardCanvas.width / 2, boardCanvas.height / 2);
  ctx.restore();
}


// -------------------------------------------------------------
// Stats UI
// -------------------------------------------------------------
const scoreEl = $("#score");
const linesEl = $("#lines");
const levelEl = $("#level");

function updateStats() {
  scoreEl.textContent = state.score;
  linesEl.textContent = state.lines;
  levelEl.textContent = state.level;
}

// -------------------------------------------------------------
// Game Loop
// -------------------------------------------------------------
function update(ts) {
  if (state.paused || state.over) {
    draw();
    return;
  }

  if (!state.lastTs) state.lastTs = ts;
  const dt = ts - state.lastTs;
  state.lastTs = ts;

  state.dropTimer += dt;
  if (state.dropTimer >= state.dropInterval) {
    softDrop();
    state.dropTimer = 0;
  }

  draw();
  drawNext();
  requestAnimationFrame(update);
}

function softDrop() {
  if (!collides(0, 1)) {
    state.piece.y++;
  } else {
    lockPiece();
    clearLines();
    spawnPiece();
  }
}

function hardDrop() {
  while (!collides(0, 1)) state.piece.y++;
  lockPiece();
  clearLines();
  spawnPiece();
  // small reward for hard drop distance (optional)
  state.score += 2;
  updateStats();
}

// -------------------------------------------------------------
// Input
// -------------------------------------------------------------
window.addEventListener("keydown", (e) => {
  // Start screen case
  if (state.waitingStart) {
    if (e.key === "Enter") {
      state.waitingStart = false;
      reset();
    }
    return; // block other keys until started
  }

  if (state.over && e.key.toLowerCase() !== "r") return;

  switch (e.key) {
    case "ArrowLeft":
      if (!collides(-1, 0)) state.piece.x--;
      break;
    case "ArrowRight":
      if (!collides(1, 0)) state.piece.x++;
      break;
    case "ArrowDown":
      softDrop();
      break;
    case "ArrowUp": {
      const rotated = rotateMatrix(paddedMatrix(state.piece.matrix));
      if (!collides(0, 0, rotated)) state.piece.matrix = rotated;
      else wallKick(rotated);
      break;
    }
    case " ":
      e.preventDefault();
      hardDrop();
      break;
    case "p":
    case "P":
      state.paused = !state.paused;
      if (!state.paused) requestAnimationFrame(update);
      break;
    case "r":
    case "R":
      reset();
      break;
  }

  draw();
});


function paddedMatrix(matrix) {
  // ensure square matrix for rotation (O already square)
  const N = Math.max(matrix.length, matrix[0].length);
  const out = Array.from({ length: N }, () => Array(N).fill(0));
  for (let r = 0; r < matrix.length; r++)
    for (let c = 0; c < matrix[r].length; c++)
      out[r][c] = matrix[r][c];
  return out;
}

function wallKick(rotated) {
  // simple wall kicks: try ±1, ±2 on x
  const kicks = [-1, 1, -2, 2];
  for (const k of kicks) {
    if (!collides(k, 0, rotated)) {
      state.piece.x += k;
      state.piece.matrix = rotated;
      return;
    }
  }
}

// -------------------------------------------------------------
// Lifecycle
// -------------------------------------------------------------
function reset() {
  state.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  state.score = 0;
  state.lines = 0;
  state.level = 1;
  state.dropInterval = LEVEL_SPEED_MS[0];
  state.dropTimer = 0;
  state.lastTs = 0;
  state.paused = false;
  state.over = false;
  bag = [];
  state.next = null;
  spawnPiece();
  updateStats();
  drawNext();
  draw();
  requestAnimationFrame(update);
}

// boot
(function init() {
  boardCanvas.width = COLS * BLOCK;
  boardCanvas.height = ROWS * BLOCK;
  draw(); // just draw empty grid + start screen
})();

