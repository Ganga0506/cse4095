import type { MistakePattern, Question } from '../types'

import { createId } from '../utils/ids'

export const DEFAULT_MASTERY_THRESHOLD = 3

export function getActiveMistakePatterns(patterns: MistakePattern[]): MistakePattern[] {
  return patterns.filter((pattern) => !pattern.mastered)
}

function patternPriority(pattern: MistakePattern, now: number): number {
  const ageInDays = Math.max(
    0,
    (now - Date.parse(pattern.lastIncorrectAt)) / 86_400_000,
  )
  const recencyScore = Math.max(0, 30 - ageInDays)
  const reviewNeedScore = Math.max(0, 10 - pattern.similarCorrectCount)

  return pattern.incorrectCount * 1_000 + recencyScore * 10 + reviewNeedScore
}

function shuffleTies<T>(items: T[], random: () => number): T[] {
  const shuffled = [...items]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }

  return shuffled
}

export function prioritizeMistakePatterns(
  patterns: MistakePattern[],
  now = Date.now(),
  random: () => number = Math.random,
): MistakePattern[] {
  const scoredPatterns = getActiveMistakePatterns(patterns).map((pattern) => ({
    pattern,
    score: patternPriority(pattern, now),
  }))
  const scoreGroups = new Map<number, MistakePattern[]>()

  for (const { pattern, score } of scoredPatterns) {
    scoreGroups.set(score, [...(scoreGroups.get(score) ?? []), pattern])
  }

  return [...scoreGroups.entries()]
    .sort(([firstScore], [secondScore]) => secondScore - firstScore)
    .flatMap(([, tiedPatterns]) => shuffleTies(tiedPatterns, random))
}

export function recordReviewResult(
  patterns: MistakePattern[],
  patternId: string,
  wasCorrect: boolean,
  masteryThreshold = DEFAULT_MASTERY_THRESHOLD,
  recordedAt = new Date().toISOString(),
): MistakePattern[] {
  return patterns.map((pattern) => {
    if (pattern.id !== patternId) {
      return pattern
    }

    if (!wasCorrect) {
      return {
        ...pattern,
        incorrectCount: pattern.incorrectCount + 1,
        similarCorrectCount: 0,
        lastIncorrectAt: recordedAt,
        mastered: false,
      }
    }

    const similarCorrectCount = pattern.similarCorrectCount + 1

    return {
      ...pattern,
      similarCorrectCount,
      mastered: similarCorrectCount >= masteryThreshold,
    }
  })
}

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
