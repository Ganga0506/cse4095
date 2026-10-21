import type {
  AppStatistics,
  DifficultyLevel,
  MathOperation,
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
