import {
  createInitialState,
  restartGame,
  setDirection,
  stepGame,
  togglePause,
} from "./snake-core.js";

const TICK_MS = 140;
const TICK_MS_SLOW = 280;
const SCORE_STORAGE_KEY = "snake-score-history-v1";

const canvas = document.querySelector("#game-canvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.querySelector("#score");
const levelEl = document.querySelector("#level");
const statusEl = document.querySelector("#status");
const powerUpStatusEl = document.querySelector("#power-up-status");
const scoreForm = document.querySelector("#score-form");
const playerNameInput = document.querySelector("#player-name");
const saveStatus = document.querySelector("#save-status");
const historyEl = document.querySelector("#score-history");

let state = createInitialState();
let tickHandle = null;
let scoreHistory = loadScoreHistory();
let activeRunSaved = false;
let waitingForStart = true;

const KEY_TO_DIRECTION = new Map([
  ["arrowup", "UP"],
  ["w", "UP"],
  ["arrowdown", "DOWN"],
  ["s", "DOWN"],
  ["arrowleft", "LEFT"],
  ["a", "LEFT"],
  ["arrowright", "RIGHT"],
  ["d", "RIGHT"],
]);

function loadScoreHistory() {
  try {
    const raw = window.localStorage.getItem(SCORE_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item) => {
      return (
        item &&
        typeof item.name === "string" &&
        typeof item.score === "number" &&
        typeof item.level === "number" &&
        typeof item.timestamp === "string"
      );
    });
  } catch {
    return [];
  }
}

function saveScoreHistory() {
  window.localStorage.setItem(SCORE_STORAGE_KEY, JSON.stringify(scoreHistory));
}

function sortScoreHistory(list) {
  return [...list].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    if (b.level !== a.level) {
      return b.level - a.level;
    }
    return b.timestamp.localeCompare(a.timestamp);
  });
}

function recordCurrentScore(name) {
  const cleanName = (name || "").trim() || "Hráč";
  scoreHistory = sortScoreHistory([
    ...scoreHistory,
    {
      name: cleanName.slice(0, 20),
      score: state.score,
      level: state.level,
      timestamp: new Date().toISOString(),
    },
  ]).slice(0, 15);
  saveScoreHistory();
  activeRunSaved = true;
}

function formatDate(timestamp) {
  try {
    return new Date(timestamp).toLocaleString("cs-CZ", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return timestamp;
  }
}

function renderScoreHistory() {
  historyEl.innerHTML = "";

  if (scoreHistory.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "Zatím bez záznamu.";
    historyEl.appendChild(empty);
    return;
  }

  for (const entry of scoreHistory) {
    const li = document.createElement("li");
    li.textContent = `${entry.name}: ${entry.score} bodů (level ${entry.level}) - ${formatDate(entry.timestamp)}`;
    historyEl.appendChild(li);
  }
}

function getStatusText() {
  if (waitingForStart) {
    return "Čeká na start (mezerník)";
  }
  if (state.isGameOver) {
    return "Konec hry";
  }
  if (state.isPaused) {
    return "Pauza";
  }
  return "Hra běží";
}

function drawCell(position, color) {
  const cellSize = canvas.width / state.gridSize;
  const inset = 2;
  ctx.fillStyle = color;
  ctx.fillRect(
    position.x * cellSize + inset,
    position.y * cellSize + inset,
    cellSize - inset * 2,
    cellSize - inset * 2
  );
}

function renderCanvas() {
  const gridSize = state.gridSize;
  const cellSize = canvas.width / gridSize;

  ctx.fillStyle = "#f2f2f2";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#dddddd";
  ctx.lineWidth = 1;
  for (let i = 0; i <= gridSize; i += 1) {
    const offset = i * cellSize;
    ctx.beginPath();
    ctx.moveTo(offset, 0);
    ctx.lineTo(offset, canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, offset);
    ctx.lineTo(canvas.width, offset);
    ctx.stroke();
  }

  for (const wall of state.walls) {
    drawCell(wall, "#777777");
  }

  if (state.food) {
    drawCell(state.food, "#d12c2c");
  }

  if (state.powerUp) {
    const powerUpColors = { slow: "#4488ff", bonus: "#f0c020", shrink: "#a040c0" };
    drawCell(state.powerUp, powerUpColors[state.powerUp.type] ?? "#ffffff");
  }

  state.snake.forEach((segment, index) => {
    drawCell(segment, index === 0 ? "#111111" : "#2e8b57");
  });
}

const POWER_UP_LABELS = {
  slow: "ZPOMALENÍ",
  bonus: "BONUS",
  shrink: "ZKRÁCENÍ",
};

function renderPowerUpStatus() {
  if (!powerUpStatusEl) return;
  const ap = state.activePowerUp;
  if (ap) {
    powerUpStatusEl.textContent = `${POWER_UP_LABELS[ap.type] ?? ap.type}: ${ap.ticksRemaining} ticků`;
    powerUpStatusEl.dataset.type = ap.type;
  } else {
    powerUpStatusEl.textContent = "";
    powerUpStatusEl.dataset.type = "";
  }
}

function renderSaveForm() {
  const shouldShowForm =
    state.isGameOver && state.score > 0 && !activeRunSaved;
  scoreForm.hidden = !shouldShowForm;
}

function render() {
  scoreEl.textContent = String(state.score);
  levelEl.textContent = String(state.level);
  statusEl.textContent = getStatusText();
  renderCanvas();
  renderPowerUpStatus();
  renderSaveForm();
  renderScoreHistory();
}

function applyState(nextState) {
  const wasGameOver = state.isGameOver;
  const prevActivePowerUpType = state.activePowerUp?.type ?? null;
  state = nextState;

  const nextActivePowerUpType = state.activePowerUp?.type ?? null;
  if (prevActivePowerUpType !== nextActivePowerUpType && tickHandle !== null) {
    stopLoop();
    startLoop();
  }

  if (!wasGameOver && state.isGameOver) {
    if (state.score > 0 && !activeRunSaved) {
      playerNameInput.focus();
    }
    if (state.score === 0) {
      saveStatus.textContent = "Konec hry. Zkus to znovu.";
    }
  }

  render();
}

function advanceOneTick() {
  applyState(stepGame(state));
}

function getTickMs() {
  return state.activePowerUp?.type === 'slow' ? TICK_MS_SLOW : TICK_MS;
}

function startLoop() {
  if (tickHandle !== null) {
    return;
  }
  tickHandle = window.setInterval(advanceOneTick, getTickMs());
}

function stopLoop() {
  if (tickHandle === null) {
    return;
  }
  window.clearInterval(tickHandle);
  tickHandle = null;
}

function restart() {
  activeRunSaved = false;
  waitingForStart = true;
  stopLoop();
  saveStatus.textContent = "";
  playerNameInput.value = "";
  applyState(restartGame(state));
}

function startGameIfNeeded() {
  if (!waitingForStart || state.isGameOver) {
    return false;
  }
  waitingForStart = false;
  startLoop();
  render();
  return true;
}

function togglePauseAction() {
  if (waitingForStart) {
    return;
  }
  applyState(togglePause(state));
}

function handleDirectionChange(direction) {
  applyState(setDirection(state, direction));
}

window.addEventListener("keydown", (event) => {
  const target = event.target;
  if (
    target instanceof HTMLElement &&
    (target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT" ||
      target.isContentEditable)
  ) {
    return;
  }

  const key = event.key.toLowerCase();

  if (KEY_TO_DIRECTION.has(key)) {
    event.preventDefault();
    handleDirectionChange(KEY_TO_DIRECTION.get(key));
    return;
  }

  if (key === "p" || event.code === "Space") {
    event.preventDefault();
    if (event.code === "Space" && startGameIfNeeded()) {
      return;
    }
    togglePauseAction();
    return;
  }

  if (key === "r") {
    event.preventDefault();
    restart();
  }
});

for (const button of document.querySelectorAll("[data-dir]")) {
  const handler = () => handleDirectionChange(button.dataset.dir);
  button.addEventListener("click", handler);
  button.addEventListener("touchstart", (event) => {
    event.preventDefault();
    handler();
  });
}

for (const button of document.querySelectorAll("[data-action]")) {
  button.addEventListener("click", () => {
    if (button.dataset.action === "pause") {
      togglePauseAction();
      return;
    }
    if (button.dataset.action === "restart") {
      restart();
    }
  });
}

scoreForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!state.isGameOver || activeRunSaved) {
    return;
  }

  recordCurrentScore(playerNameInput.value);
  saveStatus.textContent = "Skóre bylo uloženo do historie.";
  render();
});

window.render_game_to_text = () =>
  JSON.stringify({
    coordinate_system: "origin_vlevo_nahoře; x roste doprava; y roste dolů",
    mode: waitingForStart
      ? "waiting_start"
      : state.isGameOver
        ? "game_over"
        : state.isPaused
          ? "paused"
          : "running",
    score: state.score,
    level: state.level,
    snake: state.snake,
    food: state.food,
    walls: state.walls,
    powerUp: state.powerUp,
    activePowerUp: state.activePowerUp,
  });

window.advanceTime = (ms = TICK_MS) => {
  if (waitingForStart) {
    return;
  }
  const steps = Math.max(1, Math.round(ms / TICK_MS));
  const wasRunning = tickHandle !== null;

  if (wasRunning) {
    stopLoop();
  }

  for (let i = 0; i < steps; i += 1) {
    advanceOneTick();
  }

  if (wasRunning) {
    startLoop();
  }
};

render();
