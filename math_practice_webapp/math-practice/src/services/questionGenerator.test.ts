import { afterEach, describe, expect, it, vi } from 'vitest'

import type { DifficultyLevel, MathOperation, Question } from '../types'
import { isValidQuestion } from '../utils/validation'
import {
  generateAdditionQuestion,
  generateDivisionQuestion,
  generateMultiplicationQuestion,
  generateQuestion,
  generateSubtractionQuestion,
  MAX_QUESTION_ATTEMPTS,
} from './questionGenerator'

afterEach(() => {
  vi.restoreAllMocks()
})

function expectValidQuestion(
  question: Question,
  operation: MathOperation,
  difficulty: DifficultyLevel,
) {
  expect(question.operation).toBe(operation)
  expect(question.difficulty).toBe(difficulty)
  expect(question.displayText).toContain('= ?')
  expect(question.source).toBe('regular')
  expect(isValidQuestion(question)).toBe(true)
}

describe('generateAdditionQuestion', () => {
  it.each([
    [1, 10, 20],
    [2, 50, 100],
    [3, 100, 200],
    [4, 1000, 2000],
  ] as const)(
    'keeps level %i operands and results within their limits',
    (difficulty, operandMax, resultMax) => {
      for (let index = 0; index < 40; index += 1) {
        const question = generateAdditionQuestion(difficulty)
        expectValidQuestion(question, 'addition', difficulty)
        expect(question.firstOperand).toBeGreaterThanOrEqual(0)
        expect(question.firstOperand).toBeLessThanOrEqual(operandMax)
        expect(question.secondOperand).toBeGreaterThanOrEqual(0)
        expect(question.secondOperand).toBeLessThanOrEqual(operandMax)
        expect(question.correctAnswer).toBeLessThanOrEqual(resultMax)
      }
    },
  )

  it('can generate the minimum and maximum level-one values', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    expect(generateAdditionQuestion(1).correctAnswer).toBe(0)

    vi.spyOn(Math, 'random').mockReturnValue(0.999999)
    expect(generateAdditionQuestion(1).correctAnswer).toBe(20)
  })
})

describe('generateSubtractionQuestion', () => {
  it.each([1, 2, 3, 4] as const)(
    'never generates a negative level %i answer',
    (difficulty) => {
      for (let index = 0; index < 40; index += 1) {
        const question = generateSubtractionQuestion(difficulty)
        expectValidQuestion(question, 'subtraction', difficulty)
        expect(question.firstOperand).toBeGreaterThanOrEqual(question.secondOperand)
        expect(question.correctAnswer).toBeGreaterThanOrEqual(0)
      }
    },
  )
})

describe('generateMultiplicationQuestion', () => {
  it('uses factors from zero through five in level one', () => {
    for (let index = 0; index < 40; index += 1) {
      const question = generateMultiplicationQuestion(1)
      expectValidQuestion(question, 'multiplication', 1)
      expect(question.firstOperand).toBeGreaterThanOrEqual(0)
      expect(question.firstOperand).toBeLessThanOrEqual(5)
      expect(question.secondOperand).toBeGreaterThanOrEqual(0)
      expect(question.secondOperand).toBeLessThanOrEqual(5)
    }
  })

  it('uses factors from zero through ten in level two', () => {
    for (let index = 0; index < 40; index += 1) {
      const question = generateMultiplicationQuestion(2)
      expectValidQuestion(question, 'multiplication', 2)
      expect(question.firstOperand).toBeLessThanOrEqual(10)
      expect(question.secondOperand).toBeLessThanOrEqual(10)
    }
  })

  it('uses a one-digit by up-to-two-digit factor in level three', () => {
    for (let index = 0; index < 40; index += 1) {
      const question = generateMultiplicationQuestion(3)
      expectValidQuestion(question, 'multiplication', 3)
      expect(question.firstOperand).toBeLessThanOrEqual(9)
      expect(question.secondOperand).toBeLessThanOrEqual(99)
    }
  })

  it('uses larger factors in level four', () => {
    for (let index = 0; index < 40; index += 1) {
      const question = generateMultiplicationQuestion(4)
      expectValidQuestion(question, 'multiplication', 4)
      expect(question.firstOperand).toBeGreaterThanOrEqual(10)
      expect(question.firstOperand).toBeLessThanOrEqual(99)
      expect(question.secondOperand).toBeGreaterThanOrEqual(1)
      expect(question.secondOperand).toBeLessThanOrEqual(99)
    }
  })
})

describe('generateDivisionQuestion', () => {
  it.each([
    [1, 5],
    [2, 10],
    [3, 12],
    [4, 25],
  ] as const)(
    'uses nonzero level %i divisors and whole-number answers',
    (difficulty, divisorMax) => {
      for (let index = 0; index < 40; index += 1) {
        const question = generateDivisionQuestion(difficulty)
        expectValidQuestion(question, 'division', difficulty)
        expect(question.secondOperand).toBeGreaterThanOrEqual(1)
        expect(question.secondOperand).toBeLessThanOrEqual(divisorMax)
        expect(Number.isInteger(question.correctAnswer)).toBe(true)
        expect(question.firstOperand % question.secondOperand).toBe(0)
        if (difficulty === 3) {
          expect(question.firstOperand).toBeLessThanOrEqual(144)
        }
      }
    },
  )
})

describe('generateQuestion', () => {
  it.each(['addition', 'subtraction', 'multiplication', 'division'] as const)(
    'generates valid %s questions at every level',
    (operation) => {
      for (const difficulty of [1, 2, 3, 4] as const) {
        const question = generateQuestion(operation, difficulty)
        expectValidQuestion(question, operation, difficulty)
      }
    },
  )

  it('randomly selects an operation from an enabled list', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999999)

    const question = generateQuestion(['addition', 'division'], 2)

    expect(question.operation).toBe('division')
  })

  it('rejects an empty operation list', () => {
    expect(() => generateQuestion([], 1)).toThrow(/at least one operation/i)
  })

  it('retries an invalid generated question and logs the development diagnostic', () => {
    const invalidQuestion: Question = {
      ...generateAdditionQuestion(1),
      choices: [3, 3, 4, 5],
    }
    const validQuestion = generateAdditionQuestion(1)
    const questionFactory = vi
      .fn<(operation: MathOperation, difficulty: DifficultyLevel) => Question>()
      .mockReturnValueOnce(invalidQuestion)
      .mockReturnValue(validQuestion)
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const question = generateQuestion('addition', 1, questionFactory)

    expect(question).toBe(validQuestion)
    expect(questionFactory).toHaveBeenCalledTimes(2)
    expect(log).toHaveBeenCalledWith(
      expect.stringMatching(/discarded an invalid addition question/i),
      undefined,
    )
  })

  it('uses a valid fallback question after the retry limit', () => {
    const invalidQuestion: Question = {
      ...generateAdditionQuestion(1),
      correctAnswer: Number.NaN,
    }
    const questionFactory = vi.fn().mockReturnValue(invalidQuestion)
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const question = generateQuestion('division', 4, questionFactory)

    expect(questionFactory).toHaveBeenCalledTimes(MAX_QUESTION_ATTEMPTS)
    expect(question.operation).toBe('division')
    expect(question.difficulty).toBe(4)
    expect(isValidQuestion(question)).toBe(true)
    expect(log).toHaveBeenCalledWith(
      expect.stringMatching(/using a fallback division question/i),
      undefined,
    )
  })
})
