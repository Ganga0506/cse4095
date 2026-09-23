from collections import deque


# Initial and goal configurations
INITIAL_STATE = (8, 7, 6,
                 5, 4, 3,
                 2, 1, 0)

GOAL_STATE = (1, 2, 3,
              4, 5, 6,
              7, 8, 0)


def get_neighbors(state):
    """Return every state reachable by one legal move of the blank."""
    neighbors = []
    blank = state.index(0)
    row, col = divmod(blank, 3)

    # Move the blank up, down, left, or right.
    moves = [
        (-1, 0),
        (1, 0),
        (0, -1),
        (0, 1),
    ]

    for row_change, col_change in moves:
        new_row = row + row_change
        new_col = col + col_change

        if 0 <= new_row < 3 and 0 <= new_col < 3:
            new_blank = new_row * 3 + new_col
            new_state = list(state)
            new_state[blank], new_state[new_blank] = (
                new_state[new_blank],
                new_state[blank],
            )
            neighbors.append(tuple(new_state))

    return neighbors


def reconstruct_path(parent, goal_state):
    """Follow parent pointers from the goal back to the initial state."""
    path = []
    current = goal_state

    while current is not None:
        path.append(current)
        current = parent[current]

    path.reverse()
    return path


def bfs(initial_state, goal_state):
    """
    Solve the 8-puzzle using Breadth-First Search.

    Returns:
        path: Optimal path from the initial state to the goal.
        states_expanded: Number of states removed from the queue.
        states_discovered: Number of unique states added to discovered.
    """
    queue = deque([initial_state])
    discovered = {initial_state}
    parent = {initial_state: None}

    states_expanded = 0
    states_discovered = 1

    while queue:
        current = queue.popleft()
        states_expanded += 1

        if current == goal_state:
            path = reconstruct_path(parent, current)
            return path, states_expanded, states_discovered

        for neighbor in get_neighbors(current):
            if neighbor not in discovered:
                # Mark a state discovered when it is enqueued so it cannot
                # be added to the queue multiple times.
                discovered.add(neighbor)
                states_discovered += 1
                parent[neighbor] = current
                queue.append(neighbor)

    return None, states_expanded, states_discovered


def print_grid(state, step):
    """Print one puzzle state as a formatted 3x3 grid."""
    print(f"Step {step}")
    print("**********")

    for index in range(0, 9, 3):
        print(state[index], state[index + 1], state[index + 2])

    print("**********")
    print()


def main():
    path, states_expanded, states_discovered = bfs(
        INITIAL_STATE,
        GOAL_STATE,
    )

    if path is None:
        print("No solution found.")
        print(f"Total states expanded: {states_expanded}")
        print(f"Total states discovered: {states_discovered}")
        return

    for step, state in enumerate(path):
        print_grid(state, step)

    optimal_moves = len(path) - 1

    print("Search Statistics")
    print("-----------------")
    print(f"Total optimal moves: {optimal_moves}")
    print(f"Total states expanded: {states_expanded}")
    print(f"Total states discovered: {states_discovered}")


if __name__ == "__main__":
    main()
