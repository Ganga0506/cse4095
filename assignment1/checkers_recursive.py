r"""
checkers_recursive.py

Recursive solution to the "2n checkers" puzzle.

Board of 2n checkers:
    0 = red,  1 = black
Start :  n reds followed by n blacks    -> [0]*n + [1]*n
Goal  :  alternating, starting with red -> [0,1,0,1,...,0,1]

The only legal move is swapping two *adjacent* checkers.

------------------------------------------------------------------
The recursive idea
------------------------------------------------------------------
Look at the sub-board occupying positions [offset, offset+2*size-1].
As long as it still looks like  R^size B^size  (a smaller copy of
the very same puzzle), we can solve it like this:

  * If size <= 1, the sub-board is already correct - nothing to do.

  * Otherwise the first black checker sits at relative position
    `size` (absolute offset+size). Walk it one step left at a time,
    swapping with its red neighbour, until it lands right after the
    leading red checker (absolute offset+1). That takes exactly
    size-1 swaps and produces:

        [0, 1,  R^(size-1)  B^(size-1)]
         \___/  \_____________________/
        already      the SAME puzzle again, one size
        correct      smaller, shifted right by 2

  * Recurse on (offset+2, size-1).

Total number of swaps performed:
    (n-1) + (n-2) + ... + 1 + 0 = n(n-1)/2
This also happens to be the *minimum* possible number of adjacent
swaps for this configuration (it equals the number of inversions
between the start and target arrangements), so the recursion isn't
just correct, it's optimal.
"""

from typing import List, Tuple


def solve_checkers(n: int) -> Tuple[List[Tuple[int, int]], List[int]]:
    """
    Build the initial n-red / n-black board and recursively transform
    it into the alternating target board.

    Returns
    -------
    moves : the (i, j) adjacent-index pairs, in the order they must be
            swapped on the ORIGINAL board to reach the target.
    final : the resulting board (equals [0, 1, 0, 1, ...]).
    """
    arr = [0] * n + [1] * n
    moves: List[Tuple[int, int]] = []

    def recurse(offset: int, size: int) -> None:
        # Base case: an empty board, or a single "0,1" pair, needs no work.
        if size <= 1:
            return

        # Slide the sub-board's first black checker (relative position
        # `size`) left to relative position 1, one adjacent swap at a time.
        black_pos = offset + size
        target_pos = offset + 1
        while black_pos > target_pos:
            i, j = black_pos - 1, black_pos
            arr[i], arr[j] = arr[j], arr[i]
            moves.append((i, j))
            black_pos -= 1

        # positions [offset, offset+1] are now correct; recurse on the
        # remaining sub-board, which is a fresh copy of the same puzzle.
        recurse(offset + 2, size - 1)

    recurse(0, n)
    return moves, arr


def replay(n: int, verbose: bool = True) -> List[List[int]]:
    """
    Re-apply the recorded moves to a fresh board, returning every
    intermediate board state (including the initial and final ones).
    Handy for printing or animating the process.
    """
    board = [0] * n + [1] * n
    moves, _ = solve_checkers(n)

    history = [board[:]]
    if verbose:
        print(f"n = {n}")
        print(f"start : {board}")

    for step, (i, j) in enumerate(moves, start=1):
        board[i], board[j] = board[j], board[i]
        history.append(board[:])
        if verbose:
            print(f"swap {step:>2}: positions ({i}, {j}) -> {board}")

    target = [k % 2 for k in range(2 * n)]
    if verbose:
        ok = board == target
        print(f"target: {target}")
        print(
            f"success: {ok}  |  total swaps: {len(moves)}  "
            f"(minimum possible = n(n-1)/2 = {n * (n - 1) // 2})"
        )

    return history


if __name__ == "__main__":
    for n in (1, 2, 3, 4, 5):
        replay(n)
        print("-" * 60)
