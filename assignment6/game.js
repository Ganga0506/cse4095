(() => {
"use strict";

/**
 * Add two hand values. A hand is eliminated when its value reaches 5 or more.
 * This mirrors overflow_sum() in chopsticks.py (it does not wrap modulo 5).
 */
function overflowSum(a, b) {
  if (a > 5 || b > 5 || a < 0 || b < 0) {
    console.error("input error.");
    return undefined;
  }

  return a + b >= 5 ? 0 : a + b;
}

/** Return true once either player has lost both hands. */
function isTerminal(state) {
  return (
    (state.a[0] === 0 && state.a[1] === 0) ||
    (state.b[0] === 0 && state.b[1] === 0)
  );
}

/**
 * Return every distinct legal state reachable in one move.
 *
 * State format:
 *   { a: [aLeft, aRight], b: [bLeft, bRight], h: level }
 *
 * Player A moves at even levels and Player B moves at odd levels.
 */
function nextMoves(state) {
  if (isTerminal(state)) {
    return [];
  }

  const [l0, r0] = state.a;
  const [l1, r1] = state.b;
  const nextLevel = state.h + 1;
  const moves = new Map();

  // A Map keyed by the serialized state performs the same duplicate removal
  // as the set used by the Python implementation.
  function addMove(a, b) {
    const move = { a, b, h: nextLevel };
    moves.set(JSON.stringify(move), move);
  }

  if (state.h % 2 === 0) {
    // Player A attacks one of B's living hands with one of A's living hands.
    if (l0 > 0 && l1 > 0) addMove([l0, r0], [overflowSum(l0, l1), r1]);
    if (l0 > 0 && r1 > 0) addMove([l0, r0], [l1, overflowSum(l0, r1)]);
    if (r0 > 0 && l1 > 0) addMove([l0, r0], [overflowSum(r0, l1), r1]);
    if (r0 > 0 && r1 > 0) addMove([l0, r0], [l1, overflowSum(r0, r1)]);

    // Player A redistributes fingers from left to right.
    for (let amount = 1; amount <= l0; amount += 1) {
      const left = l0 - amount;
      if (r0 + amount < 5) {
        const right = overflowSum(r0, amount);
        // Do not include a redistribution that merely swaps the two hands.
        if (!(right === l0 && left === r0)) {
          addMove([left, right], [l1, r1]);
        }
      }
    }

    // Player A redistributes fingers from right to left.
    for (let amount = 1; amount <= r0; amount += 1) {
      const left = overflowSum(l0, amount);
      const right = r0 - amount;
      if (l0 + amount < 5 && !(right === l0 && left === r0)) {
        addMove([left, right], [l1, r1]);
      }
    }
  } else {
    // Player B attacks one of A's living hands with one of B's living hands.
    if (l1 > 0 && l0 > 0) addMove([overflowSum(l0, l1), r0], [l1, r1]);
    if (l1 > 0 && r0 > 0) addMove([l0, overflowSum(r0, l1)], [l1, r1]);
    if (r1 > 0 && l0 > 0) addMove([overflowSum(l0, r1), r0], [l1, r1]);
    if (r1 > 0 && r0 > 0) addMove([l0, overflowSum(r0, r1)], [l1, r1]);

    // Player B redistributes fingers from left to right.
    for (let amount = 1; amount <= l1; amount += 1) {
      const left = l1 - amount;
      const right = overflowSum(r1, amount);
      if (r1 + amount < 5 && !(right === l1 && left === r1)) {
        addMove([l0, r0], [left, right]);
      }
    }

    // Player B redistributes fingers from right to left.
    for (let amount = 1; amount <= r1; amount += 1) {
      const left = overflowSum(l1, amount);
      const right = r1 - amount;
      if (l1 + amount < 5 && !(right === l1 && left === r1)) {
        addMove([l0, r0], [left, right]);
      }
    }
  }

  return [...moves.values()];
}

// Small dependency-free unit-test examples. Run with: node game.js
function runUnitTests() {
  const hasState = (moves, expected) =>
    moves.some((move) => JSON.stringify(move) === JSON.stringify(expected));

  console.assert(overflowSum(2, 3) === 0, "2 + 3 should eliminate a hand");
  console.assert(overflowSum(1, 2) === 3, "1 + 2 should equal 3");

  const initialMoves = nextMoves({ a: [1, 1], b: [1, 1], h: 0 });
  console.assert(initialMoves.length === 4, "Initial state should have four distinct moves");
  console.assert(
    hasState(initialMoves, { a: [1, 1], b: [2, 1], h: 1 }),
    "A should be able to attack B's left hand"
  );
  console.assert(
    hasState(initialMoves, { a: [0, 2], b: [1, 1], h: 1 }),
    "A should be able to redistribute left to right"
  );

  const knockoutMoves = nextMoves({ a: [2, 1], b: [3, 1], h: 0 });
  console.assert(
    hasState(knockoutMoves, { a: [2, 1], b: [0, 1], h: 1 }),
    "An attack totaling 5 should set the attacked hand to 0"
  );

  const redistributionMoves = nextMoves({ a: [4, 1], b: [1, 1], h: 0 });
  console.assert(
    hasState(redistributionMoves, { a: [3, 2], b: [1, 1], h: 1 }),
    "A redistribution that keeps both hands below 5 should be legal"
  );
  console.assert(
    !hasState(redistributionMoves, { a: [5, 0], b: [1, 1], h: 1 }) &&
      !hasState(redistributionMoves, { a: [0, 5], b: [1, 1], h: 1 }),
    "A redistribution may not create a hand with 5 fingers"
  );

  console.assert(
    isTerminal({ a: [0, 0], b: [1, 1], h: 2 }),
    "A state with a defeated player should be terminal"
  );
  console.assert(
    nextMoves({ a: [0, 0], b: [1, 1], h: 2 }).length === 0,
    "A terminal state should have no next moves"
  );

  console.log("All Chopsticks unit tests passed.");
}

const ChopsticksGame = { overflowSum, isTerminal, nextMoves, runUnitTests };

// Browser usage: window.ChopsticksGame.nextMoves(...)
if (typeof globalThis !== "undefined") {
  globalThis.ChopsticksGame = ChopsticksGame;
}

// Node/CommonJS usage: const { nextMoves } = require("./game.js");
if (typeof module !== "undefined" && module.exports) {
  module.exports = ChopsticksGame;

  if (require.main === module) {
    runUnitTests();
  }
}
})();
