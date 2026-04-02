import test from "node:test";
import assert from "node:assert/strict";

import {
  placeFood,
  placePowerUp,
  setDirection,
  stepGame,
} from "../src/snake-core.js";

function makeState(overrides = {}) {
  return {
    gridSize: 8,
    snake: [
      { x: 3, y: 3 },
      { x: 2, y: 3 },
      { x: 1, y: 3 },
    ],
    direction: "RIGHT",
    nextDirection: "RIGHT",
    food: { x: 6, y: 6 },
    score: 0,
    level: 1,
    walls: [],
    isGameOver: false,
    isPaused: false,
    ticks: 0,
    powerUp: null,
    activePowerUp: null,
    ...overrides,
  };
}

test("stepGame posune hada o jedno pole", () => {
  const next = stepGame(makeState());
  assert.deepEqual(next.snake, [
    { x: 4, y: 3 },
    { x: 3, y: 3 },
    { x: 2, y: 3 },
  ]);
  assert.equal(next.score, 0);
});

test("stepGame při jídle zvětší hada a přičte skóre", () => {
  const next = stepGame(makeState({ food: { x: 4, y: 3 } }), {
    rng: () => 0.1,
  });

  assert.equal(next.score, 1);
  assert.equal(next.snake.length, 4);
  assert.deepEqual(next.snake[0], { x: 4, y: 3 });
  assert.ok(next.food !== null);
  assert.ok(!next.snake.some((segment) => segment.x === next.food.x && segment.y === next.food.y));
});

test("stepGame detekuje náraz do stěny mapy", () => {
  const next = stepGame(
    makeState({
      snake: [
        { x: 7, y: 3 },
        { x: 6, y: 3 },
        { x: 5, y: 3 },
      ],
    })
  );
  assert.equal(next.isGameOver, true);
});

test("stepGame detekuje náraz do vlastního těla", () => {
  const next = stepGame(
    makeState({
      snake: [
        { x: 3, y: 3 },
        { x: 4, y: 3 },
        { x: 4, y: 4 },
        { x: 3, y: 4 },
        { x: 2, y: 4 },
      ],
      direction: "DOWN",
      nextDirection: "DOWN",
    })
  );
  assert.equal(next.isGameOver, true);
});

test("po dosažení 10 bodů se otevře další level a přibudou zdi", () => {
  const next = stepGame(
    makeState({
      score: 9,
      food: { x: 4, y: 3 },
      level: 1,
      walls: [],
    }),
    { rng: () => 0.2 }
  );
  assert.equal(next.score, 10);
  assert.equal(next.level, 2);
  assert.ok(next.walls.length > 0);
});

test("setDirection neumožní okamžité otočení o 180°", () => {
  const updated = setDirection(makeState(), "LEFT");
  assert.equal(updated.nextDirection, "RIGHT");
});

// Power-up testy

test("power-up bonus přidá 3 body bez růstu hada", () => {
  const state = makeState({
    powerUp: { x: 4, y: 3, type: "bonus", ticksLeft: 20 },
  });
  const next = stepGame(state, { rng: () => 0.5 });
  assert.equal(next.score, 3);
  assert.equal(next.snake.length, 3); // had neroste
  assert.equal(next.powerUp, null);   // power-up byl sebran
});

test("power-up shrink zkrátí hada o 3 segmenty", () => {
  const state = makeState({
    snake: [
      { x: 3, y: 3 },
      { x: 2, y: 3 },
      { x: 1, y: 3 },
      { x: 0, y: 3 },
      { x: 0, y: 4 },
    ],
    powerUp: { x: 4, y: 3, type: "shrink", ticksLeft: 20 },
  });
  const next = stepGame(state, { rng: () => 0.5 });
  assert.equal(next.snake.length, 2); // 5 + 1 posun - 1 tail = 5 → -3 = 2
  assert.equal(next.powerUp, null);
});

test("power-up slow nastaví activePowerUp a vyprší po 30 tickách", () => {
  const state = makeState({
    powerUp: { x: 4, y: 3, type: "slow", ticksLeft: 20 },
  });
  const next = stepGame(state, { rng: () => 0.5 });
  assert.ok(next.activePowerUp !== null);
  assert.equal(next.activePowerUp.type, "slow");
  assert.equal(next.activePowerUp.ticksRemaining, 30);
  assert.equal(next.powerUp, null);

  // Testujeme expiraci přímo přes stav s nízkým ticksRemaining
  const almostExpired = makeState({
    activePowerUp: { type: "slow", ticksRemaining: 1 },
  });
  const expired = stepGame(almostExpired, { rng: () => 0.5 });
  assert.equal(expired.activePowerUp, null);
});

test("power-up zmizí po 25 tickách bez sebrání", () => {
  const state = makeState({
    powerUp: { x: 7, y: 7, type: "bonus", ticksLeft: 3 },
  });
  // 3 kroky, had míří jinam (food je jinde)
  let s = stepGame(state, { rng: () => 0.5 });
  s = stepGame(s, { rng: () => 0.5 });
  s = stepGame(s, { rng: () => 0.5 });
  assert.equal(s.powerUp, null);
});

test("placePowerUp nevybere pozici obsazenou jídlem nebo hadem", () => {
  const gridSize = 4;
  const snake = [{ x: 0, y: 0 }, { x: 1, y: 0 }];
  const food = { x: 2, y: 0 };
  const pu = placePowerUp({ gridSize, snake, walls: [], food, rng: () => 0 });
  assert.ok(pu !== null);
  const snakeKeys = new Set(snake.map((s) => `${s.x},${s.y}`));
  assert.ok(!snakeKeys.has(`${pu.x},${pu.y}`));
  assert.ok(!(pu.x === food.x && pu.y === food.y));
});

test("placeFood umí vybrat jediné volné pole", () => {
  const gridSize = 3;
  const snake = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 2, y: 1 },
    { x: 0, y: 2 },
    { x: 1, y: 2 },
  ];

  const food = placeFood({
    gridSize,
    snake,
    walls: [],
    rng: () => 0.99,
  });

  assert.deepEqual(food, { x: 2, y: 2 });
});
