import heapq
from itertools import count


# Initial and goal configurations
INITIAL_STATE = (8, 7, 6,
                 5, 4, 3,
                 2, 1, 0)

GOAL_STATE = (1, 2, 3,
              4, 5, 6,
              7, 8, 0)


def get_neighbors(state):
    """
    Return all valid states reachable by moving the blank (0)
    up, down, left, or right.
    """
    neighbors = []

    blank = state.index(0)
    row = blank // 3
    col = blank % 3

    moves = [
        (-1, 0),  # up
        (1, 0),   # down
        (0, -1),  # left
        (0, 1)    # right
    ]

    for row_change, col_change in moves:
        new_row = row + row_change
        new_col = col + col_change

        if 0 <= new_row < 3 and 0 <= new_col < 3:
            new_blank = new_row * 3 + new_col

            new_state = list(state)
            new_state[blank], new_state[new_blank] = (
                new_state[new_blank],
                new_state[blank]
            )

            neighbors.append(tuple(new_state))

    return neighbors


def manhattan_distance(state, goal):
    """
    Compute the Manhattan-distance heuristic.

    For each tile 1 through 8, add:
        |current_row - goal_row| + |current_col - goal_col|

    The blank tile (0) is excluded.
    """
    distance = 0

    for tile in range(1, 9):
        current_index = state.index(tile)
        goal_index = goal.index(tile)

        current_row, current_col = divmod(current_index, 3)
        goal_row, goal_col = divmod(goal_index, 3)

        distance += abs(current_row - goal_row) + abs(current_col - goal_col)

    return distance


def reconstruct_path(parent, goal_state):
    """
    Follow parent pointers from the goal back to the initial state,
    then reverse the result.
    """
    path = []
    current = goal_state

    while current is not None:
        path.append(current)
        current = parent[current]

    path.reverse()
    return path


def astar(initial_state, goal_state):
    """
    Solve the 8-puzzle using A* search.

    Priority queue entries have the form:
        (f, count, state)

    where:
        g = cost from the initial state
        h = Manhattan-distance heuristic
        f = g + h
        count = tie-breaker so states themselves are not compared

    Returns:
        path
        states_expanded
        states_discovered
    """

    # Tie-breaker counter for heap entries
    tie_breaker = count()

    # Best known path cost from the initial state to each state
    g_score = {initial_state: 0}

    # Parent pointers for reconstructing the final path
    parent = {initial_state: None}

    # Track every unique state generated/discovered
    discovered = {initial_state}
    states_discovered = 1

    # Track states that have actually been expanded
    expanded = set()
    states_expanded = 0

    # Initial priority is f = g + h = 0 + h
    initial_h = manhattan_distance(initial_state, goal_state)

    priority_queue = [
        (initial_h, next(tie_breaker), initial_state)
    ]

    while priority_queue:
        f, _, current = heapq.heappop(priority_queue)

        # Ignore an old heap entry if this state has already been expanded
        # with its best known cost.
        if current in expanded:
            continue

        current_g = g_score[current]

        # Ignore stale heap entries whose f-value no longer matches
        # the state's best known g-score.
        expected_f = current_g + manhattan_distance(current, goal_state)
        if f != expected_f:
            continue

        # A state counts as expanded when it is validly popped
        expanded.add(current)
        states_expanded += 1

        # With Manhattan distance, the first valid time the goal is
        # expanded gives an optimal solution.
        if current == goal_state:
            path = reconstruct_path(parent, current)
            return path, states_expanded, states_discovered

        for neighbor in get_neighbors(current):
            tentative_g = current_g + 1

            # If this is a new state, count it as discovered.
            if neighbor not in discovered:
                discovered.add(neighbor)
                states_discovered += 1

            # If this route is better than any previously known route,
            # update the best g-score and parent.
            if tentative_g < g_score.get(neighbor, float("inf")):
                g_score[neighbor] = tentative_g
                parent[neighbor] = current

                h = manhattan_distance(neighbor, goal_state)
                new_f = tentative_g + h

                heapq.heappush(
                    priority_queue,
                    (new_f, next(tie_breaker), neighbor)
                )

    # If the queue becomes empty, no solution exists.
    return None, states_expanded, states_discovered


def print_grid(state, step):
    """
    Print one puzzle state in the same 3x3 format as bfs.py.
    """
    print(f"Step {step}")
    print("**********")

    for i in range(0, 9, 3):
        print(state[i], state[i + 1], state[i + 2])

    print("**********")
    print()


def main():
    """
    Run the A* solver and display the optimal path and statistics.
    """
    path, states_expanded, states_discovered = astar(
        INITIAL_STATE,
        GOAL_STATE
    )

    if path is None:
        print("No solution found.")
        print(f"Total states expanded: {states_expanded}")
        print(f"Total states generated/discovered: {states_discovered}")
        return

    # Print every state along the optimal path
    for step, state in enumerate(path):
        print_grid(state, step)

    optimal_moves = len(path) - 1

    print("Search Statistics")
    print("-----------------")
    print(f"Total optimal moves: {optimal_moves}")
    print(f"Total states expanded: {states_expanded}")
    print(f"Total states generated/discovered: {states_discovered}")


if __name__ == "__main__":
    main()
