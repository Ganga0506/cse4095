# Chopsticks: Dynamic Programming and Minimax

A browser game in which a human plays Chopsticks against a computer opponent.
The computer uses a complete, depth-limited dynamic programming (DP) table to
choose minimax moves. An expandable analysis panel shows legal successor states,
their scores, the recommended move, and the predicted outcome.

## Run the project

No package installation or build step is required. Open `index.html` in a modern
browser, or serve this directory using Python 3:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Visit <http://127.0.0.1:8000/index.html>. Stop the server with Ctrl+C.
Keep the HTML, CSS, and JavaScript files in the same directory.

1. Choose **Human first · Player A** or **Computer first · Player A**.
2. Set maximum depth and press **Restart** to apply the setup. The interface
   accepts even depths from 2 to 40, with a default of 10.
3. To attack, click one of your living hands, then a living opponent hand.
4. To redistribute, select your source hand, adjust the amount slider, and press
   **Transfer to other hand**. An illegal transfer displays an error without
   changing the state.
5. The computer moves automatically after a short thinking delay. Expand or
   collapse **AI analysis** to inspect the current position.

Each move is one player's action, not a full pair of turns. A maximum depth of
10 allows ten total actions: five for A and five for B unless the game ends early.
The Python reference uses `depth = 2 * moves`; its `moves` input counts pairs of
turns instead.

The status banner reports WIN/LOSS from the human's perspective. The AI panel
always reports outcomes and scores from **Player A's perspective**, including
when the human is Player B. The panel analyzes whoever is currently to move;
the computer-role label separately identifies which player the computer controls.

## Rules and state representation

- Both players begin with one finger on each hand: A `[1, 1]`, B `[1, 1]`.
- A acts first; players alternate after every action.
- An attack adds the attacking hand's count to a living opponent hand. The
  attacking hand stays unchanged. Dead hands cannot attack or be attacked.
- A total of 5 **or more becomes 0**. This is zeroing, not modulo arithmetic:
  `2 + 3` becomes `0`, `1 + 2` becomes `3`, and `4 + 3` also becomes `0`.
- Instead of attacking, a player can transfer a positive number of fingers
  between their own hands. The total is conserved, neither hand may exceed 4,
  and a transfer that only swaps the two counts is excluded. For example,
  `[3, 1] → [2, 2]` is legal but `[3, 1] → [1, 3]` is not.
- Redistribution can revive a zero hand: `[0, 2] → [1, 1]` is legal.
- A player with both hands at zero loses. If the depth limit is reached while
  both players still have living hands, this implementation declares a tie.

The JavaScript state is:

```js
{ a: [l0, r0], b: [l1, r1], h: level }
// Initial state:
{ a: [1, 1], b: [1, 1], h: 0 }
```

Hand values range from 0 to 4. The arrays retain left/right order. `h` counts
actions already taken: even `h` means A's turn, odd `h` means B's turn. Each
successor has `h + 1`. The equivalent Python state is
`((l0, r0), (l1, r1), h)`; the DP key is the string `"l0,r0,l1,r1,h"`.

## Legal moves: `nextMoves(state)`

The game engine returns an empty array for a terminal state. Otherwise it uses
`h` to identify the active player and generates:

1. Every pairing of a living attacking hand with a living opponent hand,
   applying `overflowSum()` to the target.
2. Transfers in both directions between the active player's hands, rejecting
   overflow and pure swaps.

A map of serialized states removes duplicate results. Multiple attacks can
produce the same position, so the list represents distinct successor states,
not every physical gesture. The input state is not mutated. The initial state
has four distinct successors: two attacks and two redistributions.

The controller constructs a proposed state from a click or slider action and
accepts it only if it matches an entry from `nextMoves()`. This keeps move
validation consistent with the solver.

## Minimax and DP construction

All numeric scores use A's perspective:

| Score | Meaning |
| --- | --- |
| +1 | A wins / B loses |
| 0 | Tie |
| -1 | A loses / B wins |

`buildDPTable(maxDepth)` returns a `Map`. Each entry contains
`{ value, bestMove }`, with `null` for positions that have no chosen continuation.

The construction first initializes all 625 hand configurations at `maxDepth`.
Terminal positions receive their fixed outcome, and unfinished positions receive
0. Both players at `[0, 0]` also receive 0 as a defensive base case.

It then iterates backward from `maxDepth - 1` to 0. At each level it enumerates
all hand configurations, preserves terminal results, and obtains legal moves.
Successor scores already exist at level `h + 1`. A selects the largest score on
even levels; B selects the smallest on odd levels. Equal scores keep the first
generated successor. A nonterminal state with no moves is scored as 0, although
the current rules always allow an attack when both players have a living hand.

The recurrence is:

```text
V(state, h) = max V(successor, h + 1)  when h is even
V(state, h) = min V(successor, h + 1)  when h is odd
```

There are `5^4 = 625` configurations per level, so a table through depth `D`
has `625 * (D + 1)` entries. Depth 10 produces 6,875 entries. With at most `M`
successors per position, construction takes O(625 × D × M) time and
O(625 × (D + 1)) space. Including the level in the key makes repeated board
positions at different times separate subproblems and bounds cyclic play.

`getBestMove(state, dpTable)` returns:

```js
{
  bestMove,                    // Recommended successor state
  evaluatedMoves,              // [{ move, score }, ...]
  predictedOutcome            // "WIN", "TIE", or "LOSS" for A
}
```

Call it on positions before the depth limit. The UI handles terminal and cutoff
positions separately; querying an unfinished cutoff position directly would
request successor entries outside the table. Predictions assume optimal play
by both players within the chosen horizon, not an unlimited-game solution.

## Software organization

| File | Responsibility |
| --- | --- |
| `chopsticks.py` | Python reference rules, completed DP solver, and terminal game |
| `game.js` | `overflowSum`, `isTerminal`, `nextMoves`, and example engine tests |
| `ai.js` | State keys, minimax table construction, and move analysis |
| `app.js` | DOM rendering, input validation, computer scheduling, restart, and game over |
| `index.html` | Semantic page structure and external script loading |
| `style.css` | Responsive layout, hand states, thinking indicator, and transitions |
| `README.md` | Usage, rules, architecture, and reflections |
| `VIBE_LOG.md` | Selected developer–AI interactions and verification history |

Scripts load in the order `game.js`, `ai.js`, then `app.js`. The engine and solver
use isolated function scopes and expose `ChopsticksGame` and `ChopsticksAI` in
the browser. They also provide CommonJS exports for Node.js. Game rules and
minimax logic live outside the HTML. Restart cancels pending computer actions,
rebuilds the table, and resets selection, counters, and game state.

## Verification

Run the bundled engine examples with Node.js:

```sh
node game.js
```

These use `console.assert`; inspect the output for assertion failures, since
Node's `console.assert` does not throw or guarantee a failing process exit code.

During development, a separate comparison checked JavaScript successor states
against Python for all 1,250 combinations of hand configuration and turn parity.
DP checks covered terminal scoring, table sizes, and maximum/minimum selection.
Those ad hoc checks are development history, not additional committed test files.
Browser checks covered attacks, redistribution acceptance and rejection,
automatic computer turns, role switching, game over, and restart.

## Reflection questions

### 1. Why does Player A maximize while Player B minimizes?

The scores are based on Player A’s outcome: +1 means A wins, 0 means a tie, and -1 
means A loses. A tries to get the highest score, while B tries to get the lowest score 
because a loss for A is a win for B.


### 2. Why is the DP table built from the deepest level toward level 0?

To choose the best move from a state, we need to know where its possible moves lead. 
Starting at the deepest level gives us those results first. We then work backward, 
using the results we already calculated until we reach the starting state.

### 3. Why is DP faster than recursive exploration?

Different sequences of moves can lead to the same state. Basic recursive search would 
explore that state again each time, repeating work. DP saves the result for each state 
and level so it only needs to calculate it once. Recursion with memoization can also avoid 
this repeated work.

### 4. Why should the UI obtain legal moves from the game engine?


The UI and the computer should follow the same rules. If the UI had its 
own separate rules, they could become inconsistent with the engine. Using nextMoves() 
to check each move keeps everything in agreement and makes the interface easier to update.

### 5. What part of the project did the AI help with most?

The AI helped me most with converting the Python code into JavaScript and 
connecting it to the web interface. It also helped explain minimax and how to 
build the DP table. I broke the project into smaller tasks and provided the requirements 
for each stage.

### 6. What AI-generated suggestion was verified, modified, or rejected?

One thing we verified was whether the JavaScript engine generated the same moves as the 
Python version. The comparison matched across all 1,250 combinations of hand states and turn parity.
We also had to modify the generated JavaScript after the browser reported a duplicate nextMoves declaration. 
Isolating the scripts’ variables and renaming the solver’s local references fixed the conflict. 
This showed me why it was important to test the game in the browser, even after the Node checks passed.