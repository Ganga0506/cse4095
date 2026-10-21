import type {
  AppStatistics,
  DifficultyLevel,
  MathOperation,
  MistakePattern,
  MistakeStatistics,
  OperationStatistics,
  PracticeAttempt,
} from '../types'

const operations: MathOperation[] = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
]
const difficulties: DifficultyLevel[] = [1, 2, 3, 4]

function emptyTotals(): OperationStatistics {
  return { attempted: 0, correct: 0, incorrect: 0 }
}

function createEmptyStatistics(): AppStatistics {
  return {
    attempted: 0,
    correct: 0,
    incorrect: 0,
    byOperation: Object.fromEntries(
      operations.map((operation) => [operation, emptyTotals()]),
    ) as Record<MathOperation, OperationStatistics>,
    byDifficulty: Object.fromEntries(
      difficulties.map((difficulty) => [difficulty, emptyTotals()]),
    ) as Record<DifficultyLevel, OperationStatistics>,
  }
}

export function calculateAccuracy(correct: number, attempted: number): number {
  return attempted === 0 ? 0 : Math.round((correct / attempted) * 100)
}

export function calculateStatistics(attempts: PracticeAttempt[]): AppStatistics {
  return attempts.reduce<AppStatistics>((statistics, attempt) => {
    const resultKey = attempt.selfReportedCorrect ? 'correct' : 'incorrect'
    const operationStatistics = statistics.byOperation[attempt.operation]
    const difficultyStatistics = statistics.byDifficulty[attempt.difficulty]

    statistics.attempted += 1
    statistics[resultKey] += 1
    operationStatistics.attempted += 1
    operationStatistics[resultKey] += 1
    difficultyStatistics.attempted += 1
    difficultyStatistics[resultKey] += 1

    return statistics
  }, createEmptyStatistics())
}

export function sortMistakePatterns(patterns: MistakePattern[]): MistakePattern[] {
  return [...patterns].sort((first, second) => {
    if (second.incorrectCount !== first.incorrectCount) {
      return second.incorrectCount - first.incorrectCount
    }

    const dateDifference =
      Date.parse(second.lastIncorrectAt) - Date.parse(first.lastIncorrectAt)
    if (dateDifference !== 0) {
      return dateDifference
    }

    return first.id.localeCompare(second.id)
  })
}

export function calculateMistakeStatistics(
  patterns: MistakePattern[],
  attempts: PracticeAttempt[],
): MistakeStatistics {
  const sortedPatterns = sortMistakePatterns(patterns)
  const reviewAttempts = attempts.filter(
    (attempt) => attempt.source === 'mistake-review',
  )
  const operationMisses = new Map<MathOperation, number>()

  for (const pattern of patterns) {
    operationMisses.set(
      pattern.operation,
      (operationMisses.get(pattern.operation) ?? 0) + pattern.incorrectCount,
    )
  }

  const highestOperationMisses = Math.max(0, ...operationMisses.values())
  const mostMissedOperations =
    highestOperationMisses === 0
      ? []
      : operations.filter(
          (operation) => operationMisses.get(operation) === highestOperationMisses,
        )
  const highestFactMisses = Math.max(
    0,
    ...patterns.map((pattern) => pattern.incorrectCount),
  )

  return {
    activePatternCount: patterns.filter((pattern) => !pattern.mastered).length,
    masteredPatternCount: patterns.filter((pattern) => pattern.mastered).length,
    similarQuestionsPracticed: reviewAttempts.length,
    reviewQuestionsCorrect: reviewAttempts.filter(
      (attempt) => attempt.selfReportedCorrect,
    ).length,
    mostMissedFacts:
      highestFactMisses === 0
        ? []
        : sortedPatterns.filter(
            (pattern) => pattern.incorrectCount === highestFactMisses,
          ),
    mostMissedOperations,
    sortedPatterns,
  }
}
