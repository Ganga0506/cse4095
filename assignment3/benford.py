import sys
import math
try:
    import matplotlib.pyplot as plt
    HAS_MATPLOTLIB = True
except ImportError:
    HAS_MATPLOTLIB = False

# ------------------------------------------------------------------------------
# 1. Benford's Law Calculations & Analysis
# ------------------------------------------------------------------------------

def get_benford_probabilities() -> dict[int, float]:
    """Returns theoretical Benford's Law percentages for digits 1-9."""
    return {d: math.log10(1 + 1 / d) * 100 for d in range(1, 10)}

def first_digit_from_log10(log_val: float) -> int:
    """
    Extracts the first digit of a number given its base-10 logarithm.
    x = 10^log_val = 10^(k + f) where f is the fractional part.
    Mantissa m = 10^f, first digit = int(m).
    """
    frac_part = log_val - math.floor(log_val)
    mantissa = 10 ** frac_part
    
    # Add floating-point tolerance (1e-12) to handle precision edge cases like 7.999999999999999
    digit = int(mantissa + 1e-12)
    return max(1, min(9, digit))

# ------------------------------------------------------------------------------
# 2. Sequence Generators (Logarithmic for scalability)
# ------------------------------------------------------------------------------

def analyze_fibonacci(n: int) -> dict[int, int]:
    """Generates counts of first digits for the first n Fibonacci numbers."""
    counts = {d: 0 for d in range(1, 10)}
    phi = (1 + math.sqrt(5)) / 2
    log10_phi = math.log10(phi)
    log10_sqrt5 = math.log10(5) / 2
    
    # Use exact integer values for k <= 20 to prevent Binet approximation error on small n
    a, b = 1, 1
    exact_limit = min(n, 20)
    
    for k in range(1, exact_limit + 1):
        if k == 1:
            val = 1
        elif k == 2:
            val = 1
        else:
            val = a + b
            a, b = b, val
        first_digit = int(str(val)[0])
        counts[first_digit] += 1

    # Switch to logarithmic Binet approximation for large k (k > 20)
    for k in range(21, n + 1):
        log_fk = k * log10_phi - log10_sqrt5
        counts[first_digit_from_log10(log_fk)] += 1
        
    return counts

def analyze_power2(n: int) -> dict[int, int]:
    """Generates counts of first digits for 2^0, 2^1, ..., 2^(n-1)."""
    counts = {d: 0 for d in range(1, 10)}
    log10_2 = math.log10(2)
    
    for k in range(n):
        log_val = k * log10_2
        counts[first_digit_from_log10(log_val)] += 1
        
    return counts

def analyze_factorial(n: int) -> dict[int, int]:
    """Generates counts of first digits for 1!, 2!, ..., n!."""
    counts = {d: 0 for d in range(1, 10)}
    running_log = 0.0
    
    for k in range(1, n + 1):
        running_log += math.log10(k)
        counts[first_digit_from_log10(running_log)] += 1
        
    return counts

def analyze_powers_of_3(n: int) -> dict[int, int]:
    """Custom sequence: 3^0, 3^1, ..., 3^(n-1)."""
    counts = {d: 0 for d in range(1, 10)}
    log10_3 = math.log10(3)
    
    for k in range(n):
        log_val = k * log10_3
        counts[first_digit_from_log10(log_val)] += 1
        
    return counts

# ------------------------------------------------------------------------------
# 3. Output Formatting & Visualization
# ------------------------------------------------------------------------------

def display_results(sequence_name: str, n: int, counts: dict[int, int]):
    """Displays formatted results comparing observed vs expected Benford distributions."""
    benford_probs = get_benford_probabilities()
    total_count = sum(counts.values())

    print(f"\n=========================================================")
    print(f" Benford's Law Analysis: {sequence_name.upper()} (n = {n:,})")
    print(f"=========================================================")
    print(f"{'Digit':<7}{'Count':<12}{'Observed':<12}{'Benford':<12}{'Difference':<12}")
    print("-" * 57)

    for d in range(1, 10):
        obs_pct = (counts[d] / total_count) * 100
        ben_pct = benford_probs[d]
        diff = obs_pct - ben_pct
        print(f"{d:<7}{counts[d]:<12}{obs_pct:>6.2f}%{ben_pct:>11.2f}%{diff:>11.2f}%")

    print("-" * 57)
    print(f"Total Sequence Terms Analyzed: {total_count:,}\n")

def plot_results(sequence_name: str, n: int, counts: dict[int, int]):
    """Visualizes observed vs Benford distribution using Matplotlib."""
    if not HAS_MATPLOTLIB:
        print("[Note] Install 'matplotlib' to enable automatic graph visualizations.")
        return

    digits = list(range(1, 10))
    total_count = sum(counts.values())
    obs_pcts = [(counts[d] / total_count) * 100 for d in digits]
    ben_pcts = [get_benford_probabilities()[d] for d in digits]

    x = range(len(digits))
    width = 0.35

    fig, ax = plt.subplots(figsize=(9, 5))
    ax.bar([i - width/2 for i in x], obs_pcts, width, label='Observed', color='#1f77b4')
    ax.bar([i + width/2 for i in x], ben_pcts, width, label="Benford's Law", color='#ff7f0e', alpha=0.8)

    ax.set_xlabel('First Digit')
    ax.set_ylabel('Percentage (%)')
    ax.set_title(f"Benford's Law Verification: {sequence_name.title()} (n = {n:,})")
    ax.set_xticks(x)
    ax.set_xticklabels(digits)
    ax.legend()
    ax.grid(axis='y', linestyle='--', alpha=0.7)

    plt.tight_layout()
    plt.show()

# ------------------------------------------------------------------------------
# 4. Main CLI Entry Point
# ------------------------------------------------------------------------------

def main():
    sequences = {
        'fibonacci': analyze_fibonacci,
        'power2': analyze_power2,
        'factorial': analyze_factorial,
        'power3': analyze_powers_of_3
    }

    if len(sys.argv) < 3:
        print("Usage: python benford.py <sequence> <n> [--plot]")
        print("Available sequences: fibonacci, power2, factorial, power3")
        sys.exit(1)

    seq_choice = sys.argv[1].lower()
    if seq_choice not in sequences:
        print(f"Error: Unknown sequence '{seq_choice}'.")
        print(f"Supported options: {', '.join(sequences.keys())}")
        sys.exit(1)

    try:
        n = int(sys.argv[2])
        if n <= 0:
            raise ValueError
    except ValueError:
        print("Error: 'n' must be a positive integer.")
        sys.exit(1)

    # Run analysis
    analyzer_func = sequences[seq_choice]
    counts = analyzer_func(n)

    # Output text summary
    display_results(seq_choice, n, counts)

    # Optional plot rendering
    if "--plot" in sys.argv:
        plot_results(seq_choice, n, counts)

if __name__ == "__main__":
    main()