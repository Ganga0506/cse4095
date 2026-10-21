import { describe, expect, it } from 'vitest'

import type { MistakePattern, Question } from '../types'

import { recordMistakePattern } from './mistakePatterns'

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
