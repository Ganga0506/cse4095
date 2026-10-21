import { describe, expect, it } from 'vitest'

import type { MistakePattern, PracticeAttempt } from '../types'

import {
  calculateAccuracy,
  calculateMistakeStatistics,
  calculateStatistics,
  mergeArchivedAttemptStatistics,
  mergeStatistics,
  sortMistakePatterns,
  summarizeAttempts,
} from './statistics'

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

function createPattern(overrides: Partial<MistakePattern> = {}): MistakePattern {
  return {
    id: 'pattern-1',
    operation: 'addition',
    firstOperand: 4,
    secondOperand: 3,
    correctAnswer: 7,
    difficulty: 1,
    incorrectCount: 1,
    similarCorrectCount: 0,
    lastIncorrectAt: '2026-10-21T10:00:00.000Z',
    mastered: false,
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

  it('merges archived and recent attempts without losing aggregate statistics', () => {
    const archivedAttempts = [
      createAttempt({ id: 'archived-1', selfReportedCorrect: true }),
      createAttempt({
        id: 'archived-2',
        operation: 'division',
        difficulty: 4,
        selfReportedCorrect: false,
        source: 'mistake-review',
      }),
    ]
    const recentAttempts = [
      createAttempt({
        id: 'recent-1',
        operation: 'multiplication',
        difficulty: 3,
        source: 'mistake-review',
      }),
    ]

    const archived = summarizeAttempts(archivedAttempts)
    const recent = summarizeAttempts(recentAttempts)
    const mergedArchive = mergeArchivedAttemptStatistics(archived, recent)
    const mergedStatistics = mergeStatistics(
      archived.appStatistics,
      recent.appStatistics,
    )

    expect(mergedArchive.appStatistics).toEqual(mergedStatistics)
    expect(mergedStatistics).toMatchObject({
      attempted: 3,
      correct: 2,
      incorrect: 1,
    })
    expect(mergedArchive).toMatchObject({
      mistakeReviewAttempted: 2,
      mistakeReviewCorrect: 1,
    })
  })

  it('calculates aggregate statistics for five thousand attempts', () => {
    const attempts = Array.from({ length: 5_000 }, (_, index) =>
      createAttempt({
        id: `attempt-${index}`,
        operation: ['addition', 'subtraction', 'multiplication', 'division'][
          index % 4
        ] as PracticeAttempt['operation'],
        difficulty: ((index % 4) + 1) as 1 | 2 | 3 | 4,
        selfReportedCorrect: index % 3 !== 0,
      }),
    )
    const startedAt = performance.now()
    const statistics = calculateStatistics(attempts)
    const elapsedMilliseconds = performance.now() - startedAt

    expect(statistics.attempted).toBe(5_000)
    expect(statistics.correct + statistics.incorrect).toBe(5_000)
    // A generous guard keeps this useful on slower classroom devices.
    expect(elapsedMilliseconds).toBeLessThan(1_000)
  })
})

describe('mistake statistics calculations', () => {
  it('calculates review totals and separates active and mastered patterns', () => {
    const activePattern = createPattern({ incorrectCount: 3 })
    const masteredPattern = createPattern({
      id: 'pattern-2',
      operation: 'multiplication',
      mastered: true,
      similarCorrectCount: 3,
    })
    const statistics = calculateMistakeStatistics(
      [activePattern, masteredPattern],
      [
        createAttempt({ id: 'review-1', source: 'mistake-review' }),
        createAttempt({
          id: 'review-2',
          source: 'mistake-review',
          selfReportedCorrect: false,
        }),
        createAttempt({ id: 'regular-1', source: 'regular' }),
      ],
    )

    expect(statistics).toMatchObject({
      activePatternCount: 1,
      masteredPatternCount: 1,
      similarQuestionsPracticed: 2,
      reviewQuestionsCorrect: 1,
      mostMissedOperations: ['addition'],
      mostMissedFacts: [activePattern],
    })
  })

  it('keeps every most-missed operation and fact when counts are tied', () => {
    const addition = createPattern({ id: 'addition', incorrectCount: 4 })
    const subtraction = createPattern({
      id: 'subtraction',
      operation: 'subtraction',
      incorrectCount: 4,
    })
    const lessFrequent = createPattern({
      id: 'less-frequent',
      operation: 'multiplication',
      incorrectCount: 2,
    })
    const statistics = calculateMistakeStatistics(
      [lessFrequent, addition, subtraction],
      [],
    )

    expect(statistics.mostMissedOperations).toEqual(['addition', 'subtraction'])
    expect(statistics.mostMissedFacts).toEqual([addition, subtraction])
    expect(sortMistakePatterns([lessFrequent, addition, subtraction])).toEqual([
      addition,
      subtraction,
      lessFrequent,
    ])
  })

  it('returns empty mistake insights when no patterns exist', () => {
    expect(calculateMistakeStatistics([], [])).toMatchObject({
      activePatternCount: 0,
      masteredPatternCount: 0,
      similarQuestionsPracticed: 0,
      reviewQuestionsCorrect: 0,
      mostMissedOperations: [],
      mostMissedFacts: [],
      sortedPatterns: [],
    })
  })
})
