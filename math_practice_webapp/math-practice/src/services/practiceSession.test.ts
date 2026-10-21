import { afterEach, describe, expect, it, vi } from 'vitest'

import type { PracticeSetupConfig, Question } from '../types'

import {
  applyAttempt,
  completeSession,
  createPracticeAttempt,
  createPracticeSession,
  generateNextQuestion,
  isSessionComplete,
  isValidPracticeSetup,
} from './practiceSession'

const configuration: PracticeSetupConfig = {
  operations: ['addition'],
  difficulty: 1,
  sessionLength: 5,
}

const question: Question = {
  id: 'question-1',
  operation: 'addition',
  firstOperand: 4,
  secondOperand: 5,
  correctAnswer: 9,
  displayText: '4 + 5 = ?',
  choices: [7, 8, 9, 10],
  difficulty: 1,
  source: 'regular',
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('practice session helpers', () => {
  it('creates session state from a valid setup configuration', () => {
    vi.spyOn(Date, 'now').mockReturnValue(100)
    vi.spyOn(Math, 'random').mockReturnValue(0.1)

    const session = createPracticeSession(configuration)

    expect(session.operations).toEqual(['addition'])
    expect(session.difficulty).toBe(1)
    expect(session.sessionLength).toBe(5)
    expect(session.currentQuestionIndex).toBe(0)
    expect(session.attempted).toBe(0)
    expect(session.isActive).toBe(true)
  })

  it('creates and applies one self-reported attempt', () => {
    const session = createPracticeSession(configuration)
    const attempt = createPracticeAttempt(session, question, 9, true)
    const updatedSession = applyAttempt(session, attempt)

    expect(attempt.sessionId).toBe(session.id)
    expect(attempt.selectedAnswer).toBe(9)
    expect(updatedSession.attempted).toBe(1)
    expect(updatedSession.correct).toBe(1)
    expect(updatedSession.incorrect).toBe(0)
    expect(updatedSession.currentQuestionIndex).toBe(1)
  })

  it('detects fixed-length completion and timestamps the completed session', () => {
    const almostComplete = {
      ...createPracticeSession(configuration),
      attempted: 5,
      correct: 3,
      incorrect: 2,
    }
    expect(isSessionComplete(almostComplete)).toBe(true)
    const completedSession = completeSession(almostComplete)
    expect(completedSession.isActive).toBe(false)
    expect(completedSession.completedAt).toBeDefined()
  })

  it('does not complete a continuous session automatically', () => {
    const continuousSession = {
      ...createPracticeSession({ ...configuration, sessionLength: 'continuous' }),
      attempted: 100,
    }

    expect(isSessionComplete(continuousSession)).toBe(false)
  })

  it('retries generation when the next question would repeat the current question', () => {
    const nextQuestion = {
      ...question,
      id: 'question-2',
      firstOperand: 6,
      secondOperand: 1,
    }
    const questionFactory = vi
      .fn()
      .mockReturnValueOnce(question)
      .mockReturnValueOnce(nextQuestion)

    const generatedQuestion = generateNextQuestion(
      configuration,
      question,
      questionFactory,
    )

    expect(generatedQuestion).toEqual(nextQuestion)
    expect(questionFactory).toHaveBeenCalledTimes(2)
  })

  it('validates complete setup data and rejects incomplete data', () => {
    expect(isValidPracticeSetup(configuration)).toBe(true)
    expect(isValidPracticeSetup({ ...configuration, operations: [] })).toBe(false)
    expect(isValidPracticeSetup({ ...configuration, difficulty: 5 as 1 })).toBe(false)
  })
})
