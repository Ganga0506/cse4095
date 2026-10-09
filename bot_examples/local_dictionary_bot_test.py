"""Quick local regression test for the dictionary and random Hangman bots.

This is intentionally separate from the bot package: it emulates the public
server state and holds out words so fallback behavior is exercised locally.
"""

from __future__ import annotations

import random
from collections import defaultdict
from pathlib import Path

from bot_examples.dictionary_bot import DictionaryBot
from bot_examples.random_bot import RandomBot

ROOT = Path(__file__).resolve().parent
WORD_FILES = ("easy.txt", "medium.txt", "hard.txt")
MAX_INCORRECT_GUESSES = 6
GAMES = 500
SEED = 4095


def load_words() -> list[str]:
    """Load the same normalized word universe used by DictionaryBot."""
    words: set[str] = set()
    for filename in WORD_FILES:
        words.update(
            word
            for word in (ROOT / "words" / filename).read_text(encoding="utf-8").splitlines()
            if word.isascii() and word.islower() and word.isalpha()
        )
    return sorted(words)


def index_words(words: list[str]) -> dict[int, tuple[str, ...]]:
    """Build the length index DictionaryBot uses at runtime."""
    grouped: dict[int, list[str]] = defaultdict(list)
    for word in words:
        grouped[len(word)].append(word)
    return {length: tuple(group) for length, group in grouped.items()}


def play(bot: object, word: str) -> tuple[bool, int]:
    """Play one local game and fail fast on duplicate or invalid guesses."""
    guessed: list[str] = []
    incorrect: list[str] = []
    while len(incorrect) < MAX_INCORRECT_GUESSES:
        pattern = " ".join(letter if letter in guessed else "_" for letter in word)
        state = {
            "status": "playing",
            "pattern": pattern,
            "guessed_letters": guessed,
            "incorrect_letters": incorrect,
            "remaining_guesses": MAX_INCORRECT_GUESSES - len(incorrect),
        }
        letter = bot.choose_letter(state)  # type: ignore[attr-defined]
        if not isinstance(letter, str) or len(letter) != 1 or not ("a" <= letter <= "z"):
            raise AssertionError(f"invalid guess {letter!r} for {word!r}")
        if letter in guessed:
            raise AssertionError(f"duplicate guess {letter!r} for {word!r}")
        guessed.append(letter)
        if letter not in word:
            incorrect.append(letter)
        if all(letter in guessed for letter in word):
            return True, MAX_INCORRECT_GUESSES - len(incorrect)
    return False, 0


def evaluate(label: str, bot_factory: object, words: list[str], rng: random.Random) -> None:
    """Print win rate and remaining-lives statistics for sampled words."""
    results = [play(bot_factory(), rng.choice(words)) for _ in range(GAMES)]  # type: ignore[operator]
    wins = [remaining for won, remaining in results if won]
    all_remaining = [remaining for _won, remaining in results]
    print(
        f"{label:<27} wins={len(wins):3}/{GAMES} ({len(wins) / GAMES:.1%})  "
        f"avg_remaining_all={sum(all_remaining) / GAMES:.2f}  "
        f"avg_remaining_wins={sum(wins) / len(wins) if wins else 0.0:.2f}"
    )


def dictionary_factory(training_words: list[str]) -> object:
    """Create a bot whose local training index excludes the held-out words."""
    bot = DictionaryBot()
    bot._words_by_length = index_words(training_words)  # local test configuration
    return bot


def main() -> None:
    """Run normal dictionary and held-out fallback comparisons."""
    all_words = load_words()
    split_rng = random.Random(SEED)
    split_rng.shuffle(all_words)
    holdout_count = len(all_words) // 5
    held_out = all_words[:holdout_count]
    training = all_words[holdout_count:]

    print(f"Full dictionary: {len(all_words)}; training: {len(training)}; held out: {len(held_out)}")

    print("\nIn-dictionary benchmark:")
    evaluate(
        "DictionaryBot",
        lambda: dictionary_factory(all_words),
        all_words,
        random.Random(SEED),
    )
    evaluate(
        "RandomBot",
        lambda: RandomBot(random.Random(SEED)),
        all_words,
        random.Random(SEED),
    )

    print("\n20% held-out fallback benchmark:")
    evaluate(
        "DictionaryBot",
        lambda: dictionary_factory(training),
        held_out,
        random.Random(SEED + 1),
    )
    evaluate(
        "RandomBot",
        lambda: RandomBot(random.Random(SEED + 1)),
        held_out,
        random.Random(SEED + 1),
    )


if __name__ == "__main__":
    main()
