import type {
  DifficultyLevel,
  MathOperation,
  PracticeAttempt,
  PracticeSession,
  PracticeSetupConfig,
  Question,
  SessionLength,
} from '../types'

import { generateQuestion } from './questionGenerator'
import { createId } from '../utils/ids'

const MAX_REPEAT_AVOIDANCE_ATTEMPTS = 12

const validOperations: MathOperation[] = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
]

const validDifficulties: DifficultyLevel[] = [1, 2, 3, 4]
const validSessionLengths: SessionLength[] = [5, 10, 20, 'continuous']

export function isValidPracticeSetup(
  configuration: unknown,
): configuration is PracticeSetupConfig {
  if (!configuration || typeof configuration !== 'object') {
    return false
  }

  const candidate = configuration as Partial<PracticeSetupConfig>

  return Boolean(
    Array.isArray(candidate.operations) &&
    candidate.operations.length > 0 &&
    candidate.operations.every((operation) => validOperations.includes(operation)) &&
    validDifficulties.includes(candidate.difficulty as DifficultyLevel) &&
    validSessionLengths.includes(candidate.sessionLength as SessionLength),
  )
}

export function createPracticeSession(
  configuration: PracticeSetupConfig,
): PracticeSession {
  return {
    id: createId('session'),
    startedAt: new Date().toISOString(),
    operations: configuration.operations,
    difficulty: configuration.difficulty,
    sessionLength: configuration.sessionLength,
    attempted: 0,
    correct: 0,
    incorrect: 0,
    currentQuestionIndex: 0,
    isActive: true,
  }
}

export function createPracticeAttempt(
  session: PracticeSession,
  question: Question,
  selectedAnswer: number,
  selfReportedCorrect: boolean,
): PracticeAttempt {
  return {
    id: createId('attempt'),
    questionId: question.id,
    operation: question.operation,
    firstOperand: question.firstOperand,
    secondOperand: question.secondOperand,
    correctAnswer: question.correctAnswer,
    selectedAnswer,
    selfReportedCorrect,
    difficulty: question.difficulty,
    source: question.source,
    attemptedAt: new Date().toISOString(),
    sessionId: session.id,
  }
}

export function applyAttempt(
  session: PracticeSession,
  attempt: PracticeAttempt,
): PracticeSession {
  return {
    ...session,
    attempted: session.attempted + 1,
    correct: session.correct + (attempt.selfReportedCorrect ? 1 : 0),
    incorrect: session.incorrect + (attempt.selfReportedCorrect ? 0 : 1),
    currentQuestionIndex: session.currentQuestionIndex + 1,
  }
}

export function isSessionComplete(session: PracticeSession): boolean {
  return (
    session.sessionLength !== 'continuous' && session.attempted >= session.sessionLength
  )
}

export function completeSession(session: PracticeSession): PracticeSession {
  return {
    ...session,
    completedAt: new Date().toISOString(),
    isActive: false,
  }
}

export function isSameQuestion(first: Question, second: Question): boolean {
  return (
    first.operation === second.operation &&
    first.firstOperand === second.firstOperand &&
    first.secondOperand === second.secondOperand
  )
}

type QuestionFactory = (
  operations: MathOperation | readonly MathOperation[],
  difficulty: DifficultyLevel,
) => Question

export function generateNextQuestion(
  configuration: PracticeSetupConfig,
  previousQuestion: Question,
  questionFactory: QuestionFactory = generateQuestion,
): Question {
  let candidate = questionFactory(configuration.operations, configuration.difficulty)

  for (
    let attempt = 0;
    attempt < MAX_REPEAT_AVOIDANCE_ATTEMPTS &&
    isSameQuestion(candidate, previousQuestion);
    attempt += 1
  ) {
    candidate = questionFactory(configuration.operations, configuration.difficulty)
  }

  return candidate
}
