"""A dictionary-based Hangman bot.

The bot narrows a local word list using only the public game state, then
guesses the letter found in the greatest number of remaining candidates.
"""

from __future__ import annotations

import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from bot_examples.runner import run_cli

ALPHABET = "abcdefghijklmnopqrstuvwxyz"
FREQUENCY_ORDER = "etaoinshrdlucmfwypvbgkjqxz"
WORD_FILES = ("easy.txt", "medium.txt", "hard.txt")


def _load_words_by_length() -> dict[int, tuple[str, ...]]:
    """Load unique lowercase dictionary words, grouped by their length."""
    words_dir = ROOT / "words"
    words: set[str] = set()
    for filename in WORD_FILES:
        try:
            lines = (words_dir / filename).read_text(encoding="utf-8").splitlines()
        except OSError:
            continue
        words.update(word for word in lines if word.isascii() and word.islower() and word.isalpha())

    by_length: dict[int, list[str]] = defaultdict(list)
    for word in sorted(words):
        by_length[len(word)].append(word)
    return {length: tuple(group) for length, group in by_length.items()}


class DictionaryBot:
    """Choose high-coverage letters from dictionary words matching the pattern."""

    def __init__(self) -> None:
        self._words_by_length = _load_words_by_length()

    def choose_letter(self, state: dict) -> str:
        """Return an unused lowercase letter based only on public game state."""
        pattern = str(state.get("pattern") or "").split()
        guessed_values = state.get("guessed_letters") or []
        if not isinstance(guessed_values, (list, tuple, set, frozenset, str)):
            guessed_values = []
        guessed = {str(letter).lower() for letter in guessed_values}
        unused = [letter for letter in FREQUENCY_ORDER if letter not in guessed]
        if not unused:
            # A real game ends before this can happen; preserve the interface for
            # malformed or synthetic states without raising an exception.
            return "a"

        candidates = self._matching_words(pattern, state.get("incorrect_letters") or [])
        if candidates:
            return self._most_common_unused_letter(candidates, unused)

        same_length_words = self._words_by_length.get(len(pattern), ())
        if same_length_words:
            incorrect = _letter_set(state.get("incorrect_letters") or [])
            # There is no exact dictionary match, but failed guesses are still
            # reliable information.  Keep a word-length prior only over words
            # that could still contain the hidden word's remaining letters.
            possible_words = tuple(
                word for word in same_length_words if not any(letter in word for letter in incorrect)
            )
            return self._most_common_unused_letter(possible_words or same_length_words, unused)
        return unused[0]

    def _matching_words(self, pattern: list[str], incorrect_letters: object) -> tuple[str, ...]:
        """Return words consistent with revealed letters and failed guesses."""
        incorrect = _letter_set(incorrect_letters)
        revealed = {letter for letter in pattern if len(letter) == 1 and letter in ALPHABET}
        matches: list[str] = []
        for word in self._words_by_length.get(len(pattern), ()):
            if any(letter in word for letter in incorrect):
                continue
            if all(
                (token == "_" and letter not in revealed) or token == letter
                for token, letter in zip(pattern, word)
            ):
                matches.append(word)
        return tuple(matches)

    @staticmethod
    def _most_common_unused_letter(words: tuple[str, ...], unused: list[str]) -> str:
        """Pick the unused letter occurring in the most distinct words."""
        counts = {letter: 0 for letter in unused}
        for word in words:
            for letter in set(word):
                if letter in counts:
                    counts[letter] += 1
        return max(unused, key=lambda letter: (counts[letter], -FREQUENCY_ORDER.index(letter)))


def _letter_set(values: object) -> set[str]:
    """Normalize a server letter list without letting malformed state crash a bot."""
    if not isinstance(values, (list, tuple, set, frozenset, str)):
        return set()
    return {str(letter).lower() for letter in values if isinstance(letter, str)}


if __name__ == "__main__":
    sys.exit(run_cli(DictionaryBot(), "Dictionary bot"))
