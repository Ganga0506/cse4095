(() => {
"use strict";

// In Node, load the game engine with require(). In a browser, game.js must be
// loaded first so its API is available as globalThis.ChopsticksGame.
const gameEngine =
  typeof module !== "undefined" && module.exports
    ? require("./game.js")
    : globalThis.ChopsticksGame;

if (!gameEngine) {
  throw new Error("Load game.js before ai.js.");
}

const gameNextMoves = gameEngine.nextMoves;
const gameIsTerminal = gameEngine.isTerminal;

/** Convert a state to the compact key used by the dynamic-programming table. */
function stateKey(state) {
  return `${state.a[0]},${state.a[1]},${state.b[0]},${state.b[1]},${state.h}`;
}

/** Return a terminal result from Player A's perspective. */
function terminalValue(state) {
  const aLost = state.a[0] === 0 && state.a[1] === 0;
  const bLost = state.b[0] === 0 && state.b[1] === 0;

  if (aLost && bLost) return 0;
  if (aLost) return -1;
  if (bLost) return 1;
  return 0;
}

/** Translate a numeric minimax value into Player A's predicted outcome. */
function outcomeLabel(value) {
  if (value === 1) return "WIN";
  if (value === -1) return "LOSS";
  return "TIE";
}

/**
 * Build the complete Chopsticks minimax table through maxDepth.
 *
 * Each Map value has this form:
 *   { value: -1 | 0 | 1, bestMove: State | null }
 */
function buildDPTable(maxDepth) {
  if (!Number.isInteger(maxDepth) || maxDepth < 0) {
    throw new TypeError("maxDepth must be a nonnegative integer.");
  }

  const dpTable = new Map();

  // At the depth limit, terminal states retain their win/loss value. All
  // unfinished games are scored as ties because the search horizon was met.
  for (let l0 = 0; l0 < 5; l0 += 1) {
    for (let r0 = 0; r0 < 5; r0 += 1) {
      for (let l1 = 0; l1 < 5; l1 += 1) {
        for (let r1 = 0; r1 < 5; r1 += 1) {
          const state = { a: [l0, r0], b: [l1, r1], h: maxDepth };
          const value = gameIsTerminal(state) ? terminalValue(state) : 0;
          dpTable.set(stateKey(state), { value, bestMove: null });
        }
      }
    }
  }

  // Work toward the root. Every successor at h + 1 has already been scored.
  for (let h = maxDepth - 1; h >= 0; h -= 1) {
    for (let l0 = 0; l0 < 5; l0 += 1) {
      for (let r0 = 0; r0 < 5; r0 += 1) {
        for (let l1 = 0; l1 < 5; l1 += 1) {
          for (let r1 = 0; r1 < 5; r1 += 1) {
            const state = { a: [l0, r0], b: [l1, r1], h };

            if (gameIsTerminal(state)) {
              dpTable.set(stateKey(state), {
                value: terminalValue(state),
                bestMove: null,
              });
              continue;
            }

            const legalMoves = gameNextMoves(state);
            if (legalMoves.length === 0) {
              dpTable.set(stateKey(state), {
                value: terminalValue(state),
                bestMove: null,
              });
              continue;
            }

            let bestMove = legalMoves[0];
            let bestValue = dpTable.get(stateKey(bestMove)).value;

            for (let index = 1; index < legalMoves.length; index += 1) {
              const candidate = legalMoves[index];
              const candidateValue = dpTable.get(stateKey(candidate)).value;

              // Values are measured from A's perspective. A maximizes at even
              // levels, while B minimizes at odd levels.
              const isBetter =
                h % 2 === 0
                  ? candidateValue > bestValue
                  : candidateValue < bestValue;

              if (isBetter) {
                bestMove = candidate;
                bestValue = candidateValue;
              }
            }

            dpTable.set(stateKey(state), { value: bestValue, bestMove });
          }
        }
      }
    }
  }

  return dpTable;
}

/**
 * Describe the table's recommendation for one state.
 *
 * evaluatedMoves contains objects shaped as { move, score }, where score is
 * the minimax result of making that move from Player A's perspective.
 */
function getBestMove(state, dpTable) {
  if (!(dpTable instanceof Map)) {
    throw new TypeError("dpTable must be a Map returned by buildDPTable().");
  }

  const entry = dpTable.get(stateKey(state));
  if (!entry) {
    throw new RangeError("The requested state is not present in the DP table.");
  }

  const evaluatedMoves = gameNextMoves(state).map((move) => {
    const moveEntry = dpTable.get(stateKey(move));
    if (!moveEntry) {
      throw new RangeError("A successor state is outside the DP table depth.");
    }
    return { move, score: moveEntry.value };
  });

  return {
    bestMove: entry.bestMove,
    evaluatedMoves,
    predictedOutcome: outcomeLabel(entry.value),
  };
}

const ChopsticksAI = {
  buildDPTable,
  getBestMove,
  stateKey,
};

// Browser usage: window.ChopsticksAI.buildDPTable(...)
if (typeof globalThis !== "undefined") {
  globalThis.ChopsticksAI = ChopsticksAI;
}

// Node/CommonJS usage: const { buildDPTable } = require("./ai.js");
if (typeof module !== "undefined" && module.exports) {
  module.exports = ChopsticksAI;
}
})();
