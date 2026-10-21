import type { MistakePattern } from './mistake'
import type {
  DifficultyLevel,
  MathOperation,
  Question,
  QuestionSource,
} from './question'

export type SessionLength = 5 | 10 | 20 | 'continuous'
export type PracticeMode = 'regular' | 'mistake-review'

export interface PracticeSetupConfig {
  operations: MathOperation[]
  difficulty: DifficultyLevel
  sessionLength: SessionLength
  mode: PracticeMode
}

export interface PracticeAttempt {
  id: string
  questionId: string
  operation: MathOperation
  firstOperand: number
  secondOperand: number
  correctAnswer: number
  selectedAnswer: number
  selfReportedCorrect: boolean
  difficulty: DifficultyLevel
  source: QuestionSource
  mistakePatternId?: string
  attemptedAt: string
  sessionId: string
}

export interface PracticeSession {
  id: string
  startedAt: string
  completedAt?: string
  operations: MathOperation[]
  difficulty: DifficultyLevel
  sessionLength: SessionLength
  attempted: number
  correct: number
  incorrect: number
  currentQuestionIndex: number
  isActive: boolean
}

/**
 * The in-progress work needed to let a child safely return after a refresh.
 * Completed sessions are stored separately for statistics and history.
 */
export interface ActivePracticeState {
  configuration: PracticeSetupConfig
  session: PracticeSession
  attempts: PracticeAttempt[]
  currentQuestion: Question
  selectedAnswer: number | null
  reviewPatterns: MistakePattern[]
  reviewPatternIndex: number
}
