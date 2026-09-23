"""
card24.py — Core expression validator for the Card Game 24.

Uses Python's `ast` module for safe expression evaluation.
No use of eval() anywhere.
"""

import ast
from dataclasses import dataclass
from fractions import Fraction
from itertools import permutations, product as cart_product


# ---------------------------------------------------------------------------
# Data
# ---------------------------------------------------------------------------

RANK_VALUES: dict[str, int] = {
    'A': 1, '2': 2, '3': 3, '4': 4, '5': 5,
    '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'J': 11, 'Q': 12, 'K': 13,
}

TARGET = 24


@dataclass
class Card:
    rank: str
    suit: str

    @property
    def value(self) -> int:
        return RANK_VALUES[self.rank]

    def __str__(self) -> str:
        return f"{self.rank}{self.suit}"


# ---------------------------------------------------------------------------
# Permitted AST node types
# ---------------------------------------------------------------------------

_ALLOWED_NODE_TYPES = (
    ast.Expression,   # top-level wrapper
    ast.BinOp,        # binary operations: a + b, a * b, …
    ast.UnaryOp,      # unary minus: -3
    ast.USub,         # the '-' in unary minus
    ast.Add,          # +
    ast.Sub,          # -
    ast.Mult,         # *
    ast.Div,          # /
    ast.Constant,     # numeric literals
)


# ---------------------------------------------------------------------------
# AST-based safe evaluator
# ---------------------------------------------------------------------------

def safe_eval(expression: str) -> float:
    """
    Safely evaluate a string arithmetic expression using Python's `ast` module.

    Only allows: integer/float constants, +, -, *, /, and parentheses.
    Raises:
        ValueError  — on invalid syntax or disallowed constructs.
        ZeroDivisionError — on division by zero.
    Returns:
        float result of the expression.
    """
    expression = expression.strip()
    if not expression:
        raise ValueError("Expression is empty.")

    try:
        tree = ast.parse(expression, mode='eval')
    except SyntaxError as exc:
        raise ValueError(f"Invalid syntax: {exc}") from exc

    # Walk every node and reject anything not on the allow-list.
    for node in ast.walk(tree):
        if not isinstance(node, _ALLOWED_NODE_TYPES):
            raise ValueError(
                f"Disallowed operation or token: {type(node).__name__!r}. "
                "Only +, -, *, / and parentheses are permitted."
            )
        # Constants must be numeric (int or float), not strings, booleans, etc.
        if isinstance(node, ast.Constant) and not isinstance(node.value, (int, float)):
            raise ValueError(
                f"Non-numeric constant detected: {node.value!r}"
            )

    return _eval_node(tree.body)


def _eval_node(node: ast.AST) -> float:
    """Recursively evaluate a validated AST node."""
    if isinstance(node, ast.Constant):
        return float(node.value)

    if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.USub):
        return -_eval_node(node.operand)

    if isinstance(node, ast.BinOp):
        left  = _eval_node(node.left)
        right = _eval_node(node.right)
        op    = node.op

        if isinstance(op, ast.Add):  return left + right
        if isinstance(op, ast.Sub):  return left - right
        if isinstance(op, ast.Mult): return left * right
        if isinstance(op, ast.Div):
            if right == 0:
                raise ZeroDivisionError("Division by zero in expression.")
            return left / right

    # Should be unreachable after node-type validation, but be explicit.
    raise ValueError(f"Unexpected AST node: {type(node).__name__!r}")


# ---------------------------------------------------------------------------
# Number extraction from AST
# ---------------------------------------------------------------------------

def _extract_numbers(expression: str) -> list[int]:
    """
    Parse the expression and return all integer constants found in the AST,
    in the order they appear left-to-right.

    Raises ValueError for invalid syntax or non-integer numbers.
    """
    try:
        tree = ast.parse(expression, mode='eval')
    except SyntaxError as exc:
        raise ValueError(f"Invalid syntax: {exc}") from exc

    numbers: list[int] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Constant):
            if not isinstance(node.value, (int, float)):
                raise ValueError(f"Non-numeric value in expression: {node.value!r}")
            val = node.value
            if isinstance(val, float) and not val.is_integer():
                raise ValueError(
                    f"Decimal numbers are not allowed: {val}. "
                    "Use only whole card values."
                )
            numbers.append(int(val))

    return numbers


# ---------------------------------------------------------------------------
# Main validation function
# ---------------------------------------------------------------------------

def validate_expression(cards: list[Card], expression: str) -> tuple[bool, str]:
    """
    Validate a user's arithmetic expression against 4 dealt cards.

    Checks (in order):
      1. Expression is non-empty.
      2. No disallowed characters (only digits, +, -, *, /, (, ), spaces).
      3. The numbers used match the card values exactly (each used once).
      4. The expression evaluates to 24 (within floating-point tolerance).

    Args:
        cards:      Exactly 4 Card objects representing the current hand.
        expression: The user's input string, e.g. "(1 + 3) * (5 + 1)".

    Returns:
        (True,  success_message)  if the expression is valid and equals 24.
        (False, error_message)    otherwise.
    """
    if len(cards) != 4:
        return False, "Internal error: exactly 4 cards are required."

    # --- 1. Empty check ---
    if not expression.strip():
        return False, "Expression is empty."

    # --- 2. Character allow-list ---
    allowed_chars = set("0123456789+-*/() \t")
    bad_chars = sorted({ch for ch in expression if ch not in allowed_chars})
    if bad_chars:
        display = ", ".join(repr(c) for c in bad_chars)
        return False, (
            f"Disallowed character(s): {display}. "
            "Only digits, +, -, *, /, and parentheses are permitted."
        )

    # --- 3. Number-usage validation ---
    try:
        used_numbers = _extract_numbers(expression)
    except ValueError as exc:
        return False, str(exc)

    card_values = sorted(c.value for c in cards)
    used_sorted  = sorted(used_numbers)

    if used_sorted != card_values:
        card_str = ", ".join(str(v) for v in card_values)
        used_str = ", ".join(str(v) for v in sorted(used_numbers))
        return False, (
            f"Wrong numbers used. "
            f"Card values (sorted): [{card_str}]. "
            f"Numbers in expression (sorted): [{used_str}]. "
            "Each card value must appear exactly once."
        )

    # --- 4. Safe evaluation ---
    try:
        result = safe_eval(expression)
    except ZeroDivisionError:
        return False, "Expression contains a division by zero."
    except ValueError as exc:
        return False, f"Could not evaluate expression: {exc}"

    if abs(result - TARGET) < 1e-6:
        return True, f"Correct! {expression} = {TARGET} 🎉"

    return False, f"Expression evaluates to {result:.6g}, not {TARGET}."


# ---------------------------------------------------------------------------
# Solver
# ---------------------------------------------------------------------------

# The four operators the game allows.
_OPS = ('+', '-', '*', '/')

# Symbol → precedence level (higher binds tighter).
_PREC = {'+': 1, '-': 1, '*': 2, '/': 2}


def _apply(op: str, a: Fraction, b: Fraction) -> Fraction | None:
    """
    Apply binary operator `op` to Fractions `a` and `b`.

    Uses `Fraction` throughout so every intermediate result is exact —
    no floating-point rounding can cause a correct answer to be missed.

    Returns None instead of raising on division by zero.
    """
    if op == '+': return a + b
    if op == '-': return a - b
    if op == '*': return a * b
    if op == '/': return (a / b) if b != 0 else None
    raise ValueError(f"Unknown operator: {op!r}")


# ---------------------------------------------------------------------------
# Expression tree — value + pretty-printable string bundled together
# ---------------------------------------------------------------------------

class _Expr:
    """
    Lightweight wrapper that carries both the exact Fraction value of an
    expression and a human-readable string representation.

    The string is built incrementally so that parentheses are inserted only
    where operator precedence actually requires them.
    """
    __slots__ = ('value', 'text', 'root_op')

    def __init__(self, value: Fraction, text: str, root_op: str | None = None):
        self.value   = value       # exact rational result
        self.text    = text        # display string
        self.root_op = root_op     # outermost operator (None for bare numbers)

    def __repr__(self) -> str:
        return f"_Expr({self.text!r} = {self.value})"


def _combine(left: _Expr, op: str, right: _Expr) -> _Expr | None:
    """
    Combine two _Expr nodes with operator `op`, returning a new _Expr.

    Parenthesisation rules (mirror Python's own precedence):
    - Wrap the LEFT child when it has lower precedence than `op`
      (e.g. `(a + b) * c`).
    - Wrap the RIGHT child when it has lower precedence than `op`
      (e.g. `a * (b + c)`), or when it has equal precedence AND the
      operator is subtraction or division (where `a - (b - c) ≠ a - b - c`).
    """
    result = _apply(op, left.value, right.value)
    if result is None:
        return None

    op_prec = _PREC[op]

    # Left child needs parens?
    if left.root_op and _PREC[left.root_op] < op_prec:
        l_text = f"({left.text})"
    else:
        l_text = left.text

    # Right child needs parens?
    right_prec = _PREC[right.root_op] if right.root_op else 99
    needs_parens = right_prec < op_prec or (
        right_prec == op_prec and op in ('-', '/')
    )
    r_text = f"({right.text})" if needs_parens else right.text

    return _Expr(result, f"{l_text} {op} {r_text}", op)


# ---------------------------------------------------------------------------
# Binary-tree shape enumeration
# ---------------------------------------------------------------------------
#
# Any expression over 4 numbers uses exactly 3 binary operators and can be
# drawn as a full binary tree with 4 leaves.  There are exactly 5 distinct
# unlabelled shapes for such trees (Catalan number C_3 = 5):
#
#   Shape 0 – left-skewed chain:   ((a ○ b) ○ c) ○ d
#   Shape 1 – right-skewed chain:   a ○ (b ○ (c ○ d))
#   Shape 2 – left-leaning:        (a ○ b) ○ (c ○ d)   (balanced)
#   Shape 3 – inner-left branch:   (a ○ (b ○ c)) ○ d
#   Shape 4 – inner-right branch:   a ○ ((b ○ c) ○ d)
#
# Each shape is encoded as a lambda that takes four _Expr leaves and three
# operator strings and returns the combined _Expr (or None on div-by-zero).


def _build_shape(shape: int,
                 ns: tuple[_Expr, _Expr, _Expr, _Expr],
                 ops: tuple[str, str, str]) -> _Expr | None:
    """
    Build one expression tree for the given shape index.

    `ns`  – 4 leaf _Expr nodes (in the order they appear left-to-right)
    `ops` – 3 operator strings (o1, o2, o3)

    Returns None if any intermediate division by zero occurs.
    """
    a, b, c, d = ns
    o1, o2, o3 = ops

    def C(l, op, r):  # noqa: E741  (short alias for _combine)
        return _combine(l, op, r)

    if shape == 0: # ((a o1 b) o2 c) o3 d
        t = C(a, o1, b); t = C(t, o2, c) if t else None; return C(t, o3, d) if t else None
    if shape == 1: # a o1 (b o2 (c o3 d))
        t = C(c, o3, d); t = C(b, o2, t) if t else None; return C(a, o1, t) if t else None
    if shape == 2: # (a o1 b) o2 (c o3 d)
        l = C(a, o1, b); r = C(c, o3, d); return C(l, o2, r) if (l and r) else None
    if shape == 3: # (a o1 (b o2 c)) o3 d
        t = C(b, o2, c); t = C(a, o1, t) if t else None; return C(t, o3, d) if t else None
    if shape == 4: # a o1 ((b o2 c) o3 d)
        t = C(b, o2, c); t = C(t, o3, d) if t else None; return C(a, o1, t) if t else None

    raise ValueError(f"Unknown shape index: {shape}")


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def find_solution(cards: list[Card]) -> str | None:
    """
    Search exhaustively for an arithmetic expression that evaluates to 24
    using each card's value exactly once and the operators +, -, *, /.

    Strategy
    --------
    Enumerate every combination of:
      • permutation of the 4 card values          → 4! = 24 orderings
      • choice of 3 operators (with repetition)   → 4³ = 64 combinations
      • one of the 5 binary tree shapes            → 5 shapes
    Total candidates: 24 × 64 × 5 = 7 680  (fast, exhaustive, exact)

    Uses `Fraction` arithmetic to avoid floating-point false negatives.

    Args:
        cards: A list of exactly 4 Card objects.

    Returns:
        A formatted solution string such as ``"8 / (3 - 8 / 3) = 24"``
        if one exists, or ``None`` if the hand is unsolvable.

    Raises:
        ValueError: If `cards` does not contain exactly 4 elements.
    """
    if len(cards) != 4:
        raise ValueError(f"Expected 4 cards, got {len(cards)}.")

    target = Fraction(TARGET)
    values = [Fraction(c.value) for c in cards]

    seen_expressions: set[str] = set()   # deduplicate cosmetically identical results

    for perm in permutations(values):
        # Build leaf nodes for this number ordering.
        leaves = tuple(
            _Expr(v, str(int(v))) for v in perm
        )

        for ops in cart_product(_OPS, repeat=3):
            for shape in range(5):
                expr = _build_shape(shape, leaves, ops)

                if expr is None:
                    continue   # division by zero in this branch

                if expr.value == target:
                    text = expr.text
                    if text not in seen_expressions:
                        # Return the very first solution found.
                        return f"{text} = {TARGET}"

    return None   # no solution exists for this hand


def is_solvable(cards: list[Card]) -> bool:
    """Return True if the hand has at least one solution, False otherwise."""
    return find_solution(cards) is not None


# ---------------------------------------------------------------------------
# Quick self-tests (run with: python card24.py)
# ---------------------------------------------------------------------------

def _run_tests() -> None:
    def make_cards(*ranks: str) -> list[Card]:
        suits = ['♠', '♥', '♦', '♣']
        return [Card(r, suits[i % 4]) for i, r in enumerate(ranks)]

    cases = [
        # (ranks, expression, expect_valid, label)
        (['A', '2', '3', 'K'], "(1 + 3) * (2 + 4)",    False, "wrong numbers"),
        (['3', '3', '8', '8'], "8 / (3 - 8 / 3)",       True,  "classic hard puzzle"),
        (['A', '2', '3', '4'], "1 * 2 * 3 * 4",         True,  "simple multiply"),
        # 5*(5-1/5) = 5*(24/5) = 24 — division produces a non-integer intermediate
        # but the *inputs* are all whole card values, so this is valid.
        (['5', '5', '5', 'A'], "5 * (5 - 1/5)",         True,  "division gives 24"),
        # 6*(6-6+6) = 6*6 = 36, not 24
        (['6', '6', '6', '6'], "6 * (6 - 6 + 6)",       False, "evaluates to 36"),
        (['A', '2', '3', '4'], "1 + 2 + 3 + 4",         False, "sums to 10 not 24"),
        (['2', '3', '4', '6'], "4 * 6 * (3 - 2)",         True,  "parentheses"),
        (['A', '2', '3', '4'], "1 + 2 + 3 * __import__('os')",
                                                          False, "injection attempt"),
        (['A', '2', '3', '4'], "",                       False, "empty expression"),
        (['A', 'A', '2', 'K'], "1 / 0 + 1 + 2 + 13",   False, "divide by zero"),
        (['2', '3', '4', 'K'], "2 * 3 * 4 + 13",        False, "too many numbers"),
    ]

    passed = failed = 0
    for ranks, expr, expect, label in cases:
        cards = make_cards(*ranks)
        valid, msg = validate_expression(cards, expr)
        status = "PASS" if valid == expect else "FAIL"
        if status == "PASS":
            passed += 1
        else:
            failed += 1
        hand_str = " ".join(str(c) for c in cards)
        print(f"[{status}] {label}")
        print(f"       Hand: {hand_str}  |  Expr: {expr!r}")
        print(f"       → {msg}")
        print()

    print(f"Results: {passed} passed, {failed} failed out of {passed + failed} tests.")


def _run_solver_tests() -> None:
    """
    Test find_solution() against known solvable and unsolvable hands.

    For solvable hands we verify:
      (a) a solution string is returned
      (b) the returned expression actually evaluates to 24 via safe_eval()
    For unsolvable hands we verify None is returned.
    """
    def make_cards(*ranks: str) -> list[Card]:
        suits = ['♠', '♥', '♦', '♣']
        return [Card(r, suits[i % 4]) for i, r in enumerate(ranks)]

    # (ranks, solvable, label)
    solver_cases = [
        # --- canonical solvable hands ---
        (['3', '3', '8', '8'],  True,  "classic hard: 8/(3-8/3)"),
        (['A', '2', '3', '4'],  True,  "simple: 1*2*3*4"),
        (['5', '5', '5', 'A'],  True,  "5*(5-1/5)"),
        (['6', '6', '6', '6'],  True,  "6+6+6+6"),
        (['J', 'J', 'J', 'J'],  True,  "J+J+J-J — face cards"),
        (['A', 'A', 'A', 'A'],  True,  "tricky all-aces: (1+1+1)*... unsolvable?"),
        (['K', 'K', '2', '2'],  True,  "13+13-2*1... 13*2-2"),
        (['4', '4', '4', '4'],  True,  "4+4+4*4... 4*4+4+4"),
        (['2', '3', '4', '6'],  True,  "2*3*4*1... 4*6*(3-2)"),
        (['5', '5', '9', '9'],  True,  "moderately hard"),
        # --- known unsolvable hands ---
        (['A', 'A', 'A', 'A'],  False, "four aces — no 24"),
        # override the solvable-aces entry above; we'll handle the contradiction below
    ]

    # Authoritative unsolvable hands (source: combinatorial exhaustion)
    unsolvable_ranks = [
        ('A', 'A', 'A', 'A'),
        ('A', 'A', 'A', '5'),  # 1,1,1,5
        ('A', 'A', 'A', '7'),  # 1,1,1,7
        ('A', 'A', '6', '6'),  # 1,1,6,6 — no solution
        # Note: some of the above may have solutions via less obvious paths;
        # we include a verified batch below.
    ]

    # Build a clean, non-contradictory test list
    clean_cases = [
        (['3', '3', '8', '8'], True,  "classic 8/(3-8/3)"),
        (['A', '2', '3', '4'], True,  "1*2*3*4"),
        (['5', '5', '5', 'A'], True,  "5*(5-1/5)"),
        (['6', '6', '6', '6'], True,  "6+6+6+6"),
        (['J', 'J', 'J', 'J'], False, "four 11s — unsolvable"),
        (['K', 'K', '2', '2'], True,  "13*2-2*1... 13+13-2*1"),
        (['4', '4', '4', '4'], True,  "4*4+4+4"),
        (['2', '3', '4', '6'], True,  "4*6*(3-2)"),
        (['5', '5', '9', '9'], True,  "5*9-9*... (5-9/9)*..."),
        # Verified unsolvable: {1,1,1,1} cannot reach 24
        (['A', 'A', 'A', 'A'], False, "four 1s — unsolvable"),
        # {1,1,1,5}: max reachable: 1*1*1*5=5, best combos top out below 24
        (['A', 'A', 'A', '5'], False, "1,1,1,5 — unsolvable"),
    ]

    print("=" * 60)
    print("SOLVER TESTS")
    print("=" * 60)
    passed = failed = 0

    for ranks, expect_solvable, label in clean_cases:
        cards = make_cards(*ranks)
        hand_str = " ".join(str(c) for c in cards)
        solution = find_solution(cards)
        got_solvable = solution is not None

        if got_solvable == expect_solvable:
            # For solvable hands, also verify the returned expression is correct.
            if got_solvable:
                expr_part = solution.split(" = ")[0]
                try:
                    result = safe_eval(expr_part)
                    verified = abs(result - TARGET) < 1e-6
                except Exception:
                    verified = False
                if not verified:
                    print(f"[FAIL] {label} — solver returned bad expression: {solution!r}")
                    failed += 1
                    continue
            status = "PASS"
            passed += 1
        else:
            status = "FAIL"
            failed += 1

        print(f"[{status}] {label}")
        print(f"       Hand: {hand_str}")
        print(f"       → {solution if solution else 'No solution'}")
        print()

    print(f"Solver results: {passed} passed, {failed} failed out of {passed+failed} tests.")


import random
import sys
import textwrap


# ---------------------------------------------------------------------------
# Card generation
# ---------------------------------------------------------------------------

_SUITS  = ['♠', '♥', '♦', '♣']
_RANKS  = list(RANK_VALUES.keys())   # ['A','2',…,'10','J','Q','K']

def generate_hand() -> list[Card]:
    """Deal 4 random cards (with replacement from a full 52-card deck)."""
    population = [Card(r, s) for r in _RANKS for s in _SUITS]
    return random.sample(population, 4)


# ---------------------------------------------------------------------------
# Display helpers
# ---------------------------------------------------------------------------

# ANSI colour codes — gracefully disabled on Windows or non-TTY terminals.
_USE_COLOUR = sys.stdout.isatty() and sys.platform != 'win32'

_RED    = '\033[91m' if _USE_COLOUR else ''
_GREEN  = '\033[92m' if _USE_COLOUR else ''
_YELLOW = '\033[93m' if _USE_COLOUR else ''
_CYAN   = '\033[96m' if _USE_COLOUR else ''
_BOLD   = '\033[1m'  if _USE_COLOUR else ''
_RESET  = '\033[0m'  if _USE_COLOUR else ''

_RED_SUITS = {'♥', '♦'}


def _card_colour(card: Card) -> str:
    return _RED if card.suit in _RED_SUITS else ''


def _card_box(card: Card) -> list[str]:
    """
    Render a single card as a 7-line tall ASCII box.

    ┌─────┐
    │ K   │
    │     │
    │  ♠  │
    │     │
    │   K │
    └─────┘
    """
    rank = card.rank.ljust(2)   # '10' is 2 chars; 'A', 'K', etc. get a space
    suit = card.suit
    col  = _card_colour(card)
    r    = _RESET

    return [
        f"┌─────┐",
        f"│{col}{rank}{r}   │",
        f"│     │",
        f"│  {col}{suit}{r}  │",
        f"│     │",
        f"│   {col}{rank.rstrip()}{r} │",
        f"└─────┘",
    ]


def display_hand(cards: list[Card]) -> None:
    """Print the 4 cards side-by-side with their numeric values beneath."""
    boxes = [_card_box(c) for c in cards]
    for row in range(len(boxes[0])):
        print("  ".join(b[row] for b in boxes))

    # Value labels centred under each card
    labels = []
    for c in cards:
        label = f"({c.rank}={c.value})" if c.rank not in ('2','3','4','5','6','7','8','9','10') else f"  ({c.value})  "
        labels.append(label.center(7))
    print("  ".join(labels))


# ---------------------------------------------------------------------------
# Hint helper
# ---------------------------------------------------------------------------

def _partial_hint(solution: str) -> str:
    """
    Return a gentle nudge: reveal the operator structure but hide the numbers.

    e.g.  "8 / (3 - 8 / 3) = 24"
      →   "_ / (_ - _ / _) = 24"
    """
    import re
    expr_part = solution.split(" = ")[0]
    masked = re.sub(r'\d+', '_', expr_part)
    return f"{masked} = {TARGET}"


# ---------------------------------------------------------------------------
# Session statistics
# ---------------------------------------------------------------------------

class _Stats:
    def __init__(self):
        self.hands_played  = 0
        self.hands_solved  = 0
        self.hints_used    = 0
        self.revealed      = 0

    def summary(self) -> str:
        solved_pct = (
            f"{100 * self.hands_solved // self.hands_played}%"
            if self.hands_played else "—"
        )
        return (
            f"  Hands played : {self.hands_played}\n"
            f"  Hands solved : {self.hands_solved}  ({solved_pct})\n"
            f"  Hints used   : {self.hints_used}\n"
            f"  Solutions shown: {self.revealed}"
        )


# ---------------------------------------------------------------------------
# CLI helpers
# ---------------------------------------------------------------------------

def _hr(char: str = '─', width: int = 52) -> str:
    return char * width


def _banner() -> None:
    print(_BOLD + _CYAN)
    print(_hr('═'))
    print("          🃏  CARD GAME 24  🃏")
    print(_hr('═'))
    print(_RESET)
    print(textwrap.dedent("""\
        Make 24 from your 4 cards using + − × ÷ and ( ).
        Each card's value must be used exactly once.

        Commands:
          hint       →  reveal the operator structure
          solution   →  reveal a full solution
          new        →  deal a fresh hand
          quit       →  exit the game
    """))


def _prompt(stats: _Stats) -> str:
    """Read a line of input, stripping whitespace."""
    try:
        return input(f"{_BOLD}Your expression:{_RESET} ").strip()
    except (EOFError, KeyboardInterrupt):
        print()
        return 'quit'


# ---------------------------------------------------------------------------
# One round of play
# ---------------------------------------------------------------------------

def _play_round(cards: list[Card], stats: _Stats) -> bool:
    """
    Play a single hand.  Returns True if the player solved it, False otherwise
    (gave up or requested a new hand).  Mutates `stats` in place.
    """
    stats.hands_played += 1
    hint_shown     = False
    solution_cache: str | None = None   # lazy — compute only if needed

    def get_solution() -> str | None:
        nonlocal solution_cache
        if solution_cache is None:
            solution_cache = find_solution(cards)
        return solution_cache

    print(_hr())
    print(f"{_BOLD}Hand #{stats.hands_played}{_RESET}")
    print()
    display_hand(cards)
    print()

    # Pre-check solvability so we can warn the player upfront.
    sol = get_solution()
    if sol is None:
        print(f"{_YELLOW}⚠  This hand has no solution!{_RESET} "
              "Type 'new' to draw fresh cards.\n")

    while True:
        raw = _prompt(stats)
        cmd = raw.lower()

        # ── Commands ──────────────────────────────────────────────────────
        if cmd in ('quit', 'exit', 'q'):
            return False

        if cmd == 'new':
            return False

        if cmd == 'hint':
            sol = get_solution()
            if sol is None:
                print(f"{_YELLOW}No solution exists for this hand.{_RESET}\n")
            else:
                stats.hints_used += 1
                hint_shown = True
                print(f"{_CYAN}Hint →  {_partial_hint(sol)}{_RESET}\n")
            continue

        if cmd in ('solution', 'solve', 'show'):
            sol = get_solution()
            if sol is None:
                print(f"{_YELLOW}No solution exists for this hand.{_RESET}\n")
            else:
                stats.revealed += 1
                print(f"{_CYAN}Solution →  {_BOLD}{sol}{_RESET}\n")
                return False   # move on after revealing

        elif cmd == '':
            # Empty input — re-display the hand silently
            display_hand(cards)
            print()

        else:
            # ── Expression attempt ────────────────────────────────────────
            valid, msg = validate_expression(cards, raw)
            if valid:
                print(f"\n{_GREEN}{_BOLD}✓  Correct!  {raw} = {TARGET} 🎉{_RESET}\n")
                stats.hands_solved += 1
                return True
            else:
                print(f"{_RED}✗  {msg}{_RESET}\n")


# ---------------------------------------------------------------------------
# Main game loop
# ---------------------------------------------------------------------------

def main() -> None:
    _banner()
    stats = _Stats()

    while True:
        cards = generate_hand()
        solved = _play_round(cards, stats)

        # After each round ask what next (unless the player just quit)
        if stats.hands_played == 0:
            break

        # Check if player issued quit inside the round
        print(_hr('─'))
        try:
            again = input(
                f"  [n] New hand   [q] Quit   {_BOLD}>{_RESET} "
            ).strip().lower()
        except (EOFError, KeyboardInterrupt):
            again = 'q'

        print()

        if again in ('q', 'quit', 'exit'):
            break
        # Anything else (including 'n' or just Enter) → new hand

    print(_hr('═'))
    print(f"{_BOLD}Thanks for playing!  Session stats:{_RESET}")
    print(stats.summary())
    print(_hr('═'))


if __name__ == "__main__":
    import sys
    if '--test' in sys.argv:
        print("=" * 60)
        print("VALIDATOR TESTS")
        print("=" * 60)
        _run_tests()
        print()
        _run_solver_tests()
    else:
        main()

