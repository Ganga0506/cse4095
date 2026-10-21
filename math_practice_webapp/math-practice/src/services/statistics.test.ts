import { describe, expect, it } from 'vitest'

import type { PracticeAttempt } from '../types'

import { calculateAccuracy, calculateStatistics } from './statistics'

function createAttempt(overrides: Partial<PracticeAttempt> = {}): PracticeAttempt {
  return {
    id: 'attempt-1',
    questionId: 'question-1',
    operation: 'addition',
    firstOperand: 2,
    secondOperand: 3,
    correctAnswer: 5,
    selectedAnswer: 5,
    selfReportedCorrect: true,
    difficulty: 1,
    source: 'regular',
    attemptedAt: '2026-10-21T10:00:00.000Z',
    sessionId: 'session-1',
    ...overrides,
  }
}

describe('statistics calculations', () => {
  it('returns zero accuracy when there are no attempts', () => {
    expect(calculateAccuracy(0, 0)).toBe(0)

    expect(calculateStatistics([])).toMatchObject({
      attempted: 0,
      correct: 0,
      incorrect: 0,
    })
  })

  it('calculates overall totals and rounded accuracy', () => {
    const statistics = calculateStatistics([
      createAttempt({ id: 'attempt-1', selfReportedCorrect: true }),
      createAttempt({ id: 'attempt-2', selfReportedCorrect: false }),
      createAttempt({ id: 'attempt-3', selfReportedCorrect: true }),
    ])

    expect(statistics).toMatchObject({ attempted: 3, correct: 2, incorrect: 1 })
    expect(calculateAccuracy(statistics.correct, statistics.attempted)).toBe(67)
  })

  it('groups every operation with correct and incorrect totals', () => {
    const statistics = calculateStatistics([
      createAttempt({ operation: 'addition', selfReportedCorrect: true }),
      createAttempt({
        id: 'attempt-2',
        operation: 'subtraction',
        selfReportedCorrect: false,
      }),
      createAttempt({
        id: 'attempt-3',
        operation: 'multiplication',
        selfReportedCorrect: true,
      }),
      createAttempt({
        id: 'attempt-4',
        operation: 'division',
        selfReportedCorrect: false,
      }),
    ])

    expect(statistics.byOperation.addition).toEqual({
      attempted: 1,
      correct: 1,
      incorrect: 0,
    })
    expect(statistics.byOperation.subtraction).toEqual({
      attempted: 1,
      correct: 0,
      incorrect: 1,
    })
    expect(statistics.byOperation.multiplication).toEqual({
      attempted: 1,
      correct: 1,
      incorrect: 0,
    })
    expect(statistics.byOperation.division).toEqual({
      attempted: 1,
      correct: 0,
      incorrect: 1,
    })
  })

  it('groups every difficulty level with correct and incorrect totals', () => {
    const statistics = calculateStatistics([
      createAttempt({ difficulty: 1, selfReportedCorrect: true }),
      createAttempt({ id: 'attempt-2', difficulty: 2, selfReportedCorrect: false }),
      createAttempt({ id: 'attempt-3', difficulty: 3, selfReportedCorrect: true }),
      createAttempt({ id: 'attempt-4', difficulty: 4, selfReportedCorrect: false }),
    ])

    expect(statistics.byDifficulty[1]).toEqual({
      attempted: 1,
      correct: 1,
      incorrect: 0,
    })
    expect(statistics.byDifficulty[2]).toEqual({
      attempted: 1,
      correct: 0,
      incorrect: 1,
    })
    expect(statistics.byDifficulty[3]).toEqual({
      attempted: 1,
      correct: 1,
      incorrect: 0,
    })
    expect(statistics.byDifficulty[4]).toEqual({
      attempted: 1,
      correct: 0,
      incorrect: 1,
    })
  })
})
