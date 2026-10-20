import { afterEach, describe, expect, it, vi } from 'vitest'

import { generateAnswerChoices, generateIncorrectChoices } from './answerChoices'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('generateIncorrectChoices', () => {
  it.each([
    {
      operation: 'addition' as const,
      firstOperand: 7,
      secondOperand: 3,
      correctAnswer: 10,
    },
    {
      operation: 'subtraction' as const,
      firstOperand: 10,
      secondOperand: 3,
      correctAnswer: 7,
    },
    {
      operation: 'multiplication' as const,
      firstOperand: 8,
      secondOperand: 7,
      correctAnswer: 56,
    },
    {
      operation: 'division' as const,
      firstOperand: 56,
      secondOperand: 7,
      correctAnswer: 8,
    },
  ])('creates three plausible, distinct $operation distractors', (input) => {
    const distractors = generateIncorrectChoices(input)

    expect(distractors).toHaveLength(3)
    expect(new Set(distractors)).toHaveLength(3)
    expect(distractors).not.toContain(input.correctAnswer)
    expect(distractors.every((choice) => Number.isInteger(choice) && choice >= 0)).toBe(
      true,
    )
  })

  it('uses a common addition mistake for subtraction', () => {
    const distractors = generateIncorrectChoices({
      operation: 'subtraction',
      firstOperand: 10,
      secondOperand: 3,
      correctAnswer: 7,
    })

    expect(distractors).toContain(13)
  })

  it('includes nearby-number distractors', () => {
    const distractors = generateIncorrectChoices({
      operation: 'addition',
      firstOperand: 7,
      secondOperand: 3,
      correctAnswer: 10,
    })

    expect(distractors).toContain(9)
    expect(distractors).toContain(11)
  })

  it('uses nearby multiplication facts', () => {
    const distractors = generateIncorrectChoices({
      operation: 'multiplication',
      firstOperand: 8,
      secondOperand: 7,
      correctAnswer: 56,
    })

    expect(distractors.some((choice) => choice === 49 || choice === 63)).toBe(true)
  })

  it('uses fact-family values for division', () => {
    const distractors = generateIncorrectChoices({
      operation: 'division',
      firstOperand: 56,
      secondOperand: 7,
      correctAnswer: 8,
    })

    expect(distractors).toContain(7)
    expect(distractors).toContain(56)
  })

  it('handles an answer near zero without negative or fractional choices', () => {
    const distractors = generateIncorrectChoices({
      operation: 'addition',
      firstOperand: 0,
      secondOperand: 0,
      correctAnswer: 0,
    })

    expect(distractors).toEqual([1, 2, 3])
  })
})

describe('generateAnswerChoices', () => {
  const input = {
    operation: 'multiplication' as const,
    firstOperand: 8,
    secondOperand: 7,
    correctAnswer: 56,
  }

  it('combines the correct answer with three unique distractors', () => {
    const choices = generateAnswerChoices(input)

    expect(choices).toHaveLength(4)
    expect(new Set(choices)).toHaveLength(4)
    expect(choices.filter((choice) => choice === input.correctAnswer)).toHaveLength(1)
  })

  it('does not leave the correct answer in a fixed position', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const firstChoices = generateAnswerChoices(input)

    vi.spyOn(Math, 'random').mockReturnValue(0.999999)
    const secondChoices = generateAnswerChoices(input)

    expect(firstChoices.indexOf(input.correctAnswer)).not.toBe(
      secondChoices.indexOf(input.correctAnswer),
    )
  })
})
