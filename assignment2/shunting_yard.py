"""
Two-Stack (Shunting Yard) Arithmetic Expression Evaluator
==========================================================

Supports: + - * / , parentheses, decimals, multi-digit numbers,
whitespace, and unary +/-. Does NOT use eval().
"""


def tokenize(expression):
    """
    Convert an arithmetic expression string into a list of token tuples.

    Token formats:
        ('NUMBER', float)
        ('OP', '+' | '-' | '*' | '/')      -> binary operators
        ('UOP', '+' | '-')                  -> unary operators
        ('LPAREN', '(')
        ('RPAREN', ')')

    Raises:
        ValueError: on invalid characters, malformed numbers, etc.
    """
    tokens = []
    i = 0
    n = len(expression)

    def prev_allows_unary():
        """Determine if a +/- at this position should be treated as unary,
        based on the token that came immediately before it."""
        if not tokens:
            return True  # start of expression
        last_type, last_val = tokens[-1]
        if last_type == 'LPAREN':
            return True
        if last_type in ('OP', 'UOP'):
            return True
        return False  # after NUMBER or RPAREN -> binary

    while i < n:
        ch = expression[i]

        if ch.isspace():
            i += 1
            continue

        if ch.isdigit() or ch == '.':
            start = i
            dot_count = 0
            while i < n and (expression[i].isdigit() or expression[i] == '.'):
                if expression[i] == '.':
                    dot_count += 1
                    if dot_count > 1:
                        raise ValueError(
                            f"Invalid number '{expression[start:i+1]}': "
                            f"multiple decimal points at position {i}."
                        )
                i += 1
            num_str = expression[start:i]
            if num_str == '.':
                raise ValueError(
                    f"Invalid number '.' at position {start}: "
                    f"a decimal point must have digits around it."
                )
            tokens.append(('NUMBER', float(num_str)))
            continue

        if ch in '+-':
            if prev_allows_unary():
                tokens.append(('UOP', ch))
            else:
                tokens.append(('OP', ch))
            i += 1
            continue

        if ch in '*/':
            # '*' and '/' have no unary form -- catch this early with a
            # clear message instead of letting it fail deeper in evaluate().
            if prev_allows_unary():
                raise ValueError(
                    f"Unexpected operator '{ch}' at position {i}: "
                    f"'*' and '/' cannot be used as unary operators."
                )
            tokens.append(('OP', ch))
            i += 1
            continue

        if ch == '(':
            tokens.append(('LPAREN', ch))
            i += 1
            continue

        if ch == ')':
            tokens.append(('RPAREN', ch))
            i += 1
            continue

        raise ValueError(f"Invalid character '{ch}' at position {i}.")

    return tokens


def precedence(token):
    """
    Return the precedence level of an operator token: ('OP'|'UOP', symbol).
    Higher number = binds tighter / evaluated first.

    Unary +/- : 3   (highest -- binds before * and /)
    * , /     : 2
    binary +/-: 1
    """
    ttype, op = token
    if ttype == 'UOP':
        return 3
    if op in ('*', '/'):
        return 2
    if op in ('+', '-'):
        return 1
    raise ValueError(f"Unknown operator token: {token}")


def is_right_associative(token):
    """Unary operators are right-associative; binary +-*/ are left-associative."""
    ttype, _ = token
    return ttype == 'UOP'


def apply_operator(numbers, operators):
    """
    Pop one operator off `operators`, pop the operand(s) it needs off
    `numbers`, compute the result, and push it back onto `numbers`.

    Mutates both stacks in place.
    """
    if not operators:
        raise ValueError("Internal error: no operator to apply.")

    ttype, op = operators.pop()

    if ttype == 'UOP':
        if not numbers:
            raise ValueError(
                f"Malformed expression: unary '{op}' has no operand to act on."
            )
        a = numbers.pop()
        numbers.append(-a if op == '-' else a)
        return

    # Binary operator: needs two operands
    if len(numbers) < 2:
        raise ValueError(
            f"Malformed expression: operator '{op}' is missing an operand."
        )
    b = numbers.pop()
    a = numbers.pop()

    if op == '+':
        numbers.append(a + b)
    elif op == '-':
        numbers.append(a - b)
    elif op == '*':
        numbers.append(a * b)
    elif op == '/':
        if b == 0:
            raise ValueError("Division by zero.")
        numbers.append(a / b)
    else:
        raise ValueError(f"Unknown operator: {op}")


def evaluate(expression_string):
    """
    Evaluate an arithmetic expression string using the two-stack
    (Shunting Yard) algorithm. Supports +, -, *, /, parentheses,
    decimals, and unary +/-.
    """
    tokens = tokenize(expression_string)

    if not tokens:
        raise ValueError("Empty expression.")

    numbers = []    # operand stack
    operators = []  # operator/paren stack

    for token in tokens:
        ttype, value = token

        if ttype == 'NUMBER':
            numbers.append(value)

        elif ttype == 'LPAREN':
            operators.append(token)

        elif ttype == 'RPAREN':
            # Pop and apply until we find the matching '('
            found_match = False
            while operators:
                if operators[-1][0] == 'LPAREN':
                    operators.pop()
                    found_match = True
                    break
                apply_operator(numbers, operators)
            if not found_match:
                raise ValueError("Mismatched parentheses: unexpected ')'.")

        elif ttype in ('OP', 'UOP'):
            # Pop operators of higher (or equal, if left-assoc) precedence
            # before pushing the current one.
            while operators and operators[-1][0] != 'LPAREN':
                top = operators[-1]
                if is_right_associative(token):
                    if precedence(top) > precedence(token):
                        apply_operator(numbers, operators)
                    else:
                        break
                else:
                    if precedence(top) >= precedence(token):
                        apply_operator(numbers, operators)
                    else:
                        break
            operators.append(token)

        else:
            raise ValueError(f"Unexpected token: {token}")

    # Drain any remaining operators
    while operators:
        if operators[-1][0] == 'LPAREN':
            raise ValueError("Mismatched parentheses: unclosed '('.")
        apply_operator(numbers, operators)

    if len(numbers) != 1:
        raise ValueError("Malformed expression: could not reduce to a single value.")

    return numbers[0]


def main():
    """
    Interactive CLI loop: repeatedly prompt for an expression, evaluate it,
    and print the result. Type 'exit' or 'quit' to stop.
    """
    print("Two-Stack Arithmetic Expression Evaluator")
    print("Supports: + - * / ( ) decimals, and unary +/-")
    print("Type 'exit' or 'quit' to leave.\n")

    while True:
        try:
            expression = input(">> ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nGoodbye!")
            break

        if not expression:
            continue

        if expression.lower() in ('exit', 'quit'):
            print("Goodbye!")
            break

        try:
            result = evaluate(expression)
        except ValueError as e:
            # All of our expected, "clean" errors (bad chars, mismatched
            # parens, division by zero, missing operands, etc.) are raised
            # as ValueError with a user-friendly message.
            print(f"Error: {e}")
        except Exception as e:
            # Safety net for anything unanticipated -- keeps the CLI from
            # crashing outright on a bug rather than exiting the program.
            print(f"Unexpected error: {e}")
        else:
            # Print whole numbers without a trailing '.0' for a cleaner
            # look, but keep genuine decimals as-is.
            if result == int(result):
                print(int(result))
            else:
                print(result)


if __name__ == '__main__':
    main()
