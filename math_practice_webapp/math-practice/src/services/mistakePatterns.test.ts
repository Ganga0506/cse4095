import { describe, expect, it } from 'vitest'

import type { MistakePattern, Question } from '../types'

import {
  getActiveMistakePatterns,
  prioritizeMistakePatterns,
  recordMistakePattern,
  recordReviewResult,
} from './mistakePatterns'

const question: Question = {
  id: 'question-1',
  operation: 'multiplication',
  firstOperand: 6,
  secondOperand: 7,
  displayText: '6 × 7 = ?',
  correctAnswer: 42,
  choices: [42, 36, 48, 49],
  difficulty: 2,
  source: 'regular',
}

describe('recordMistakePattern', () => {
  it('creates a complete pattern for a new incorrect question', () => {
    const patterns = recordMistakePattern([], question, '2026-10-21T10:00:00.000Z')

    expect(patterns).toHaveLength(1)
    expect(patterns[0]).toMatchObject({
      operation: 'multiplication',
      firstOperand: 6,
      secondOperand: 7,
      correctAnswer: 42,
      difficulty: 2,
      incorrectCount: 1,
      similarCorrectCount: 0,
      lastIncorrectAt: '2026-10-21T10:00:00.000Z',
      mastered: false,
    })
  })

  it('updates an existing pattern without creating a duplicate', () => {
    const existingPattern: MistakePattern = {
      id: 'mistake-1',
      operation: 'multiplication',
      firstOperand: 6,
      secondOperand: 7,
      correctAnswer: 42,
      difficulty: 2,
      incorrectCount: 2,
      similarCorrectCount: 3,
      lastIncorrectAt: '2026-10-20T10:00:00.000Z',
      mastered: true,
    }

    const patterns = recordMistakePattern(
      [existingPattern],
      question,
      '2026-10-21T10:00:00.000Z',
    )

    expect(patterns).toHaveLength(1)
    expect(patterns[0]).toMatchObject({
      id: 'mistake-1',
      incorrectCount: 3,
      similarCorrectCount: 0,
      lastIncorrectAt: '2026-10-21T10:00:00.000Z',
      mastered: false,
    })
  })
})

function createPattern(overrides: Partial<MistakePattern> = {}): MistakePattern {
  return {
    id: 'mistake-1',
    operation: 'addition',
    firstOperand: 4,
    secondOperand: 3,
    correctAnswer: 7,
    difficulty: 1,
    incorrectCount: 1,
    similarCorrectCount: 0,
    lastIncorrectAt: '2026-10-20T00:00:00.000Z',
    mastered: false,
    ...overrides,
  }
}

describe('mistake review prioritization and mastery', () => {
  it('prioritizes frequently missed, recent, and lightly reviewed patterns', () => {
    const now = Date.parse('2026-10-21T00:00:00.000Z')
    const frequent = createPattern({ id: 'frequent', incorrectCount: 5 })
    const lessFrequent = createPattern({ id: 'less-frequent', incorrectCount: 2 })
    expect(prioritizeMistakePatterns([lessFrequent, frequent], now)[0].id).toBe(
      'frequent',
    )

    const recent = createPattern({
      id: 'recent',
      lastIncorrectAt: '2026-10-20T23:00:00.000Z',
    })
    const older = createPattern({
      id: 'older',
      lastIncorrectAt: '2026-09-20T00:00:00.000Z',
    })
    expect(prioritizeMistakePatterns([older, recent], now)[0].id).toBe('recent')

    const needsReview = createPattern({ id: 'needs-review', similarCorrectCount: 0 })
    const reviewedMore = createPattern({ id: 'reviewed-more', similarCorrectCount: 8 })
    expect(prioritizeMistakePatterns([reviewedMore, needsReview], now)[0].id).toBe(
      'needs-review',
    )
  })

  it('randomizes otherwise tied patterns and excludes mastered ones', () => {
    const first = createPattern({ id: 'first' })
    const second = createPattern({ id: 'second' })
    const mastered = createPattern({ id: 'mastered', mastered: true })
    const now = Date.parse('2026-10-21T00:00:00.000Z')

    expect(prioritizeMistakePatterns([first, second, mastered], now, () => 0)).toEqual([
      second,
      first,
    ])
    expect(getActiveMistakePatterns([first, mastered])).toEqual([first])
  })

  it('masters a pattern at the configurable threshold and reactivates it after a miss', () => {
    const pattern = createPattern({ similarCorrectCount: 2 })
    const mastered = recordReviewResult([pattern], pattern.id, true, 3)

    expect(mastered[0]).toMatchObject({ similarCorrectCount: 3, mastered: true })
    expect(getActiveMistakePatterns(mastered)).toEqual([])

    const reactivated = recordReviewResult(
      mastered,
      pattern.id,
      false,
      3,
      '2026-10-21T10:00:00.000Z',
    )
    expect(reactivated[0]).toMatchObject({
      incorrectCount: 2,
      similarCorrectCount: 0,
      mastered: false,
      lastIncorrectAt: '2026-10-21T10:00:00.000Z',
    })
  })
})
