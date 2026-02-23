import test from "node:test";
import assert from "node:assert/strict";

import {
  placeFood,
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
