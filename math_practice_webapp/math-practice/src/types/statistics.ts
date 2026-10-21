import type { DifficultyLevel, MathOperation } from './question'
import type { MistakePattern } from './mistake'

export interface OperationStatistics {
  attempted: number
  correct: number
  incorrect: number
}

export interface AppStatistics {
  attempted: number
  correct: number
  incorrect: number
  byOperation: Record<MathOperation, OperationStatistics>
  byDifficulty: Record<DifficultyLevel, OperationStatistics>
}

/** Aggregate totals for detailed attempts that have aged out of local storage. */
export interface ArchivedAttemptStatistics {
  appStatistics: AppStatistics
  mistakeReviewAttempted: number
  mistakeReviewCorrect: number
}

export interface MistakeStatistics {
  activePatternCount: number
  masteredPatternCount: number
  similarQuestionsPracticed: number
  reviewQuestionsCorrect: number
  mostMissedFacts: MistakePattern[]
  mostMissedOperations: MathOperation[]
  sortedPatterns: MistakePattern[]
}
