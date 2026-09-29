# Developer–AI Interaction Log

This log summarizes five key exchanges from the development conversation.
Requests below are paraphrased. Verification describes checks performed during
development rather than claiming that every check exists as a saved test suite.

## 1. Understanding the reference and minimax

**Developer request:** Inspect `chopsticks.py` and explain overflow, successor
generation, and even/odd turn levels before changing code. Then complete the
Python DP function using A-maximizes/B-minimizes evaluation.

**AI contribution:** Explained attacks, redistribution, duplicate elimination,
and the state tuple. Filled the DP table backward, keeping fixed terminal values
and storing the best successor along with its score.

**Learning and verification:** The score is always relative to A, so minimizing
is the best strategy for B. Overflow is zeroing at 5 or above, not modulo 5.
Python syntax and depth-4 sanity checks passed, including 3,125 table entries,
terminal results, and legal successors advancing one level.

## 2. Porting and verifying the JavaScript algorithms

**Developer request:** Create `game.js` with the reference rules and examples,
then implement `ai.js` with a complete DP table and detailed move analysis.

**AI contribution:** Ported the engine to `{ a, b, h }` states, used serialized
states to remove duplicates, and implemented a map keyed by hand counts and
level. Added maximizing/minimizing selection and WIN/TIE/LOSS predictions.

**Verification:** An ad hoc cross-language comparison reported matching move
sets for all 625 configurations on each turn parity, totaling 1,250 cases.
Further checks verified terminal scores, expected table sizes, and minimax
selection across nonterminal positions before the cutoff. The depth-10 table
contained 6,875 entries. The bundled engine examples use `console.assert`, so
their output must be inspected for failures rather than relying on exit status.

## 3. Separating presentation and connecting the UI

**Developer request:** Build semantic HTML and responsive CSS, keeping rules out
of HTML, then connect hand selection, redistribution, AI turns, and restart.

**AI contribution:** Created the board, setup form, status banner, and collapsible
analysis panel. Added `app.js` to convert clicks or transfers into proposed
states, validate them through `nextMoves()`, render the result, and schedule
computer moves from the DP table.

**Verification and decision:** Browser checks showed a legal attack advancing
the turn and the computer displaying scored moves before acting. A legal
redistribution worked, while transferring two fingers from `[3, 1]` to produce
`[1, 3]` was rejected as a pure swap without advancing the state. Role switching,
computer-first play, game over, and restart were exercised. The controller uses
the engine's legal successors as its acceptance criterion.

## 4. Debugging browser script integration

**Observed problem:** The browser reported `Identifier 'nextMoves' has already
been declared`, followed by a failure to obtain the solver API. Initial analysis
placeholders remained visible even though Node syntax checks had passed.

**AI response:** Isolated the engine and solver in function scopes, renamed the
solver's imported dependencies to `gameNextMoves` and `gameIsTerminal`, and added
version parameters to script URLs to refresh cached resources.

**Verification and lesson:** After reloading, the browser displayed four actual
initial moves, scores, and a recommendation. Attacks and automatic computer turns
then worked. Classic browser scripts share a global environment differently
from separate CommonJS modules, so successful Node checks did not establish
successful browser integration. Cache refresh and scope changes were both part
of the correction; the observed error alone did not establish caching as the
sole cause.

## 5. Improving interaction feedback and responsive behavior

**Developer request:** Highlight selected hands, distinguish zero hands, show
computer thinking and move transitions, and support narrow screens.

**AI contribution:** Added a Selected badge, target outlines, `aria-pressed`
selection state, inactive styling and disabled input for zero hands, a pulsing
thinking indicator, and an animation on hands changed by the computer. Retained
the 650 ms computer delay, added reduced-motion support, and adjusted wrapping
and redistribution layout.

**Verification and remaining scope:** JavaScript syntax checks and the engine
examples passed after these changes. Earlier browser checks established the
core interactive flows and narrow layout; the final animation and styling
refinements were not separately verified across a full browser/device matrix.
This separates verified game behavior from visual coverage that was not claimed.
