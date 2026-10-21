import type { MistakePattern, Question } from '../types'

import { createId } from '../utils/ids'

export function isSameMistakePattern(
  pattern: MistakePattern,
  question: Question,
): boolean {
  return (
    pattern.operation === question.operation &&
    pattern.firstOperand === question.firstOperand &&
    pattern.secondOperand === question.secondOperand &&
    pattern.correctAnswer === question.correctAnswer &&
    pattern.difficulty === question.difficulty
  )
}

export function recordMistakePattern(
  patterns: MistakePattern[],
  question: Question,
  recordedAt = new Date().toISOString(),
): MistakePattern[] {
  const existingPattern = patterns.find((pattern) =>
    isSameMistakePattern(pattern, question),
  )

  if (!existingPattern) {
    return [
      ...patterns,
      {
        id: createId('mistake'),
        operation: question.operation,
        firstOperand: question.firstOperand,
        secondOperand: question.secondOperand,
        correctAnswer: question.correctAnswer,
        difficulty: question.difficulty,
        incorrectCount: 1,
        similarCorrectCount: 0,
        lastIncorrectAt: recordedAt,
        mastered: false,
      },
    ]
  }

  return patterns.map((pattern) =>
    pattern.id === existingPattern.id
      ? {
          ...pattern,
          incorrectCount: pattern.incorrectCount + 1,
          similarCorrectCount: 0,
          lastIncorrectAt: recordedAt,
          mastered: false,
        }
      : pattern,
  )
}
