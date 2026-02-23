export const DEFAULT_GRID_SIZE = 20;

export const DIRECTIONS = Object.freeze({
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
});

const DIRECTION_NAMES = Object.keys(DIRECTIONS);

function posKey(position) {
  return `${position.x},${position.y}`;
}

function samePos(a, b) {
  return a.x === b.x && a.y === b.y;
}

function clonePosition(position) {
  return { x: position.x, y: position.y };
}

function createStartingSnake(gridSize) {
  const y = Math.floor(gridSize / 2);
  const headX = Math.max(3, Math.floor(gridSize / 4));
  return [
    { x: headX, y },
    { x: headX - 1, y },
    { x: headX - 2, y },
  ];
}

export function isOppositeDirection(a, b) {
  if (!DIRECTIONS[a] || !DIRECTIONS[b]) {
    return false;
  }
  return (
    DIRECTIONS[a].x + DIRECTIONS[b].x === 0 &&
    DIRECTIONS[a].y + DIRECTIONS[b].y === 0
  );
}

function buildBaseWalls(level, gridSize) {
  const walls = [];
  const mid = Math.floor(gridSize / 2);

  if (level >= 2) {
    for (let y = 2; y < gridSize - 2; y += 1) {
      if (y >= mid - 1 && y <= mid) {
        continue;
      }
      walls.push({ x: mid, y });
    }
  }

  if (level >= 3) {
    const y = Math.max(3, Math.floor(gridSize / 3));
    for (let x = 2; x < gridSize - 2; x += 1) {
      if (x >= mid + 1 && x <= mid + 2) {
        continue;
      }
      walls.push({ x, y });
    }
  }

  if (level >= 4) {
    const y = Math.min(gridSize - 4, Math.floor((gridSize * 2) / 3));
    for (let x = 2; x < gridSize - 2; x += 1) {
      if (x >= mid - 2 && x <= mid - 1) {
        continue;
      }
      walls.push({ x, y });
    }
  }

  if (level >= 5) {
    const x = Math.max(3, Math.floor(gridSize / 4));
    for (let y = 3; y < gridSize - 3; y += 1) {
      if (y === mid) {
        continue;
      }
      walls.push({ x, y });
    }
  }

  if (level >= 6) {
    const x = Math.min(gridSize - 4, gridSize - 1 - Math.floor(gridSize / 4));
    for (let y = 3; y < gridSize - 3; y += 1) {
      if (y === mid - 1) {
        continue;
      }
      walls.push({ x, y });
    }
  }

  if (level >= 7) {
    for (let x = 4; x < gridSize - 4; x += 1) {
      if (x === mid) {
        continue;
      }
      walls.push({ x, y: 2 });
    }
  }

  return walls;
}

export function buildLevelWalls(level, gridSize, occupiedPositions = []) {
  const occupied = new Set(occupiedPositions.map(posKey));
  const uniqueKeys = new Set();
  const walls = [];

  for (const cell of buildBaseWalls(level, gridSize)) {
    if (
      cell.x <= 0 ||
      cell.y <= 0 ||
      cell.x >= gridSize - 1 ||
      cell.y >= gridSize - 1
    ) {
      continue;
    }

    const key = posKey(cell);
    if (occupied.has(key) || uniqueKeys.has(key)) {
      continue;
    }

    uniqueKeys.add(key);
    walls.push(cell);
  }

  return walls;
}

export function placeFood({ gridSize, snake, walls, rng = Math.random }) {
  const occupied = new Set([
    ...snake.map(posKey),
    ...walls.map((wall) => posKey(wall)),
  ]);
  const freeCells = [];

  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      const key = `${x},${y}`;
      if (!occupied.has(key)) {
        freeCells.push({ x, y });
      }
    }
  }

  if (freeCells.length === 0) {
    return null;
  }

  const raw = rng();
  const normalized = Number.isFinite(raw) ? Math.abs(raw % 1) : 0;
  const index = Math.min(
    freeCells.length - 1,
    Math.floor(normalized * freeCells.length)
  );
  return freeCells[index];
}

export function createInitialState({ gridSize = DEFAULT_GRID_SIZE, rng } = {}) {
  const snake = createStartingSnake(gridSize);
  const level = 1;
  const walls = buildLevelWalls(level, gridSize, snake);
  const food = placeFood({ gridSize, snake, walls, rng });

  return {
    gridSize,
    snake,
    direction: "RIGHT",
    nextDirection: "RIGHT",
    food,
    score: 0,
    level,
    walls,
    isGameOver: false,
    isPaused: false,
    ticks: 0,
  };
}

export function setDirection(state, direction) {
  if (!DIRECTION_NAMES.includes(direction)) {
    return state;
  }

  if (state.snake.length > 1 && isOppositeDirection(state.direction, direction)) {
    return state;
  }

  return {
    ...state,
    nextDirection: direction,
  };
}

export function togglePause(state) {
  if (state.isGameOver) {
    return state;
  }

  return {
    ...state,
    isPaused: !state.isPaused,
  };
}

function collidesWithBoundary(position, gridSize) {
  return (
    position.x < 0 ||
    position.y < 0 ||
    position.x >= gridSize ||
    position.y >= gridSize
  );
}

function collidesWithAny(position, cells) {
  return cells.some((cell) => samePos(position, cell));
}

export function stepGame(state, { rng = Math.random } = {}) {
  if (state.isGameOver || state.isPaused) {
    return state;
  }

  const activeDirection = state.nextDirection || state.direction;
  const vector = DIRECTIONS[activeDirection];
  const currentHead = state.snake[0];
  const nextHead = {
    x: currentHead.x + vector.x,
    y: currentHead.y + vector.y,
  };

  if (
    collidesWithBoundary(nextHead, state.gridSize) ||
    collidesWithAny(nextHead, state.walls)
  ) {
    return {
      ...state,
      direction: activeDirection,
      nextDirection: activeDirection,
      isGameOver: true,
      isPaused: false,
    };
  }

  const willGrow = Boolean(state.food && samePos(nextHead, state.food));
  const bodyToCheck = willGrow ? state.snake : state.snake.slice(0, -1);

  if (collidesWithAny(nextHead, bodyToCheck)) {
    return {
      ...state,
      direction: activeDirection,
      nextDirection: activeDirection,
      isGameOver: true,
      isPaused: false,
    };
  }

  const nextSnake = [nextHead, ...state.snake.map(clonePosition)];
  if (!willGrow) {
    nextSnake.pop();
  }

  const nextScore = state.score + (willGrow ? 1 : 0);
  const nextLevel = Math.floor(nextScore / 10) + 1;
  const nextWalls =
    nextLevel === state.level
      ? state.walls
      : buildLevelWalls(nextLevel, state.gridSize, nextSnake);

  let nextFood = state.food;
  const foodBlocked =
    !nextFood ||
    samePos(nextHead, nextFood) ||
    collidesWithAny(nextFood, nextWalls) ||
    collidesWithAny(nextFood, nextSnake);

  if (foodBlocked) {
    nextFood = placeFood({
      gridSize: state.gridSize,
      snake: nextSnake,
      walls: nextWalls,
      rng,
    });
  }

  const outOfSpace = nextFood === null;

  return {
    ...state,
    snake: nextSnake,
    direction: activeDirection,
    nextDirection: activeDirection,
    food: nextFood,
    score: nextScore,
    level: nextLevel,
    walls: nextWalls,
    isGameOver: outOfSpace,
    ticks: state.ticks + 1,
  };
}

export function restartGame(state, { rng = Math.random } = {}) {
  return createInitialState({ gridSize: state.gridSize, rng });
}
