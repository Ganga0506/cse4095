# CSE4095

Coursework and assignments for CSE4095.

---

## Assignment 1 — Recursive Checker Swap

### Problem
Given a row of `2n` checkers, with the leftmost `n` red (`0`) and the rightmost `n` black (`1`), transform the arrangement into an alternating sequence `[0, 1, 0, 1, ..., 0, 1]` using only adjacent swaps. The solution is implemented as a **recursive** Python function.

**Example (n = 3):**
- Initial: `[0, 0, 0, 1, 1, 1]`
- Target: `[0, 1, 0, 1, 0, 1]`

### Files
- `assignment1/checker_swap.py` — recursive Python solution
- `assignment1/animation.html` — animation page illustrating the recursive swap process

### How to Run
```bash
python checker_swap.py
```
Open `animation.html` in a browser to view the step-by-step animation.

### AI Chat Log
Full chat used to complete this assignment: [Claude conversation](https://claude.ai/share/c3b0d8e0-07a7-462a-b1bc-4f7b54602820)

---

## Assignment 2 — Two-Stack Expression Evaluator

### Problem
Evaluate arithmetic expressions containing integers, decimals, basic operators (+, -, *, /), parentheses, and unary operators (+, -) using a two-stack algorithm (operand stack and operator stack). The program handles operator precedence, left-to-right associativity, and error checking without using eval().

**Example (n = 3):**
Input: (1+5)/6-2*3
Target: -5.0

### Files
- `assignment1/shunting_yard.py` — two-stack Python evaluation solution
- `assignment1/shunting_yard.html` — animation page illustrating the two-stack evaluation process

### How to Run
```bash
python assignment2/evaluator.py
  ```
Open shunting_yard.html in a browser to view the step-by-step animation.

---

## Assignment 3 — 
