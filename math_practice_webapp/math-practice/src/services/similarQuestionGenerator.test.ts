import { describe, expect, it } from 'vitest'

import type { MistakePattern, Question } from '../types'

import {
  generateSimilarQuestion,
  type SimilarQuestionStrategy,
} from './similarQuestionGenerator'
import { isValidQuestion } from '../utils/validation'

function createPattern(overrides: Partial<MistakePattern> = {}): MistakePattern {
  return {
    id: 'mistake-1',
    operation: 'addition',
    firstOperand: 5,
    secondOperand: 4,
    correctAnswer: 9,
    difficulty: 1,
    incorrectCount: 1,
    similarCorrectCount: 0,
    lastIncorrectAt: '2026-10-21T10:00:00.000Z',
    mastered: false,
    ...overrides,
  }
}

function expectReviewQuestion(question: Question, pattern: MistakePattern) {
  expect(isValidQuestion(question)).toBe(true)
  expect(question.source).toBe('mistake-review')
  expect(question.mistakePatternId).toBe(pattern.id)
  expect(question.difficulty).toBe(pattern.difficulty)
  expect(question.choices).toHaveLength(4)
}

describe('similar question generation', () => {
  it('creates a nearby addition question within its difficulty range', () => {
    const pattern = createPattern()
    const question = generateSimilarQuestion(pattern, { strategy: 'nearby' })

    expectReviewQuestion(question, pattern)
    expect(question.operation).toBe('addition')
    expect(question.firstOperand).toBeLessThanOrEqual(10)
    expect(question.secondOperand).toBeLessThanOrEqual(10)
    expect(question.firstOperand + question.secondOperand).toBeLessThanOrEqual(20)
    expect(question).not.toMatchObject({ firstOperand: 5, secondOperand: 4 })
  })

  it('reverses addition and multiplication operands only', () => {
    const additionPattern = createPattern()
    const multiplicationPattern = createPattern({
      id: 'mistake-2',
      operation: 'multiplication',
      firstOperand: 6,
      secondOperand: 7,
      correctAnswer: 42,
      difficulty: 2,
    })

    const reversedAddition = generateSimilarQuestion(additionPattern, {
      strategy: 'reversed',
    })
    const reversedMultiplication = generateSimilarQuestion(multiplicationPattern, {
      strategy: 'reversed',
    })

    expect(reversedAddition).toMatchObject({
      operation: 'addition',
      firstOperand: 4,
      secondOperand: 5,
    })
    expect(reversedMultiplication).toMatchObject({
      operation: 'multiplication',
      firstOperand: 7,
      secondOperand: 6,
    })
  })

  it('creates a valid addition fact-family subtraction question', () => {
    const pattern = createPattern()
    const question = generateSimilarQuestion(pattern, { strategy: 'fact-family' })

    expectReviewQuestion(question, pattern)
    expect(question).toMatchObject({
      operation: 'subtraction',
      firstOperand: 9,
      secondOperand: 4,
      correctAnswer: 5,
    })
  })

  it('creates a valid subtraction fact-family addition question', () => {
    const pattern = createPattern({
      operation: 'subtraction',
      firstOperand: 20,
      secondOperand: 7,
      correctAnswer: 13,
      difficulty: 2,
    })
    const question = generateSimilarQuestion(pattern, { strategy: 'fact-family' })

    expectReviewQuestion(question, pattern)
    expect(question).toMatchObject({
      operation: 'addition',
      firstOperand: 13,
      secondOperand: 7,
      correctAnswer: 20,
    })
  })

  it('creates a valid multiplication fact-family division question', () => {
    const pattern = createPattern({
      operation: 'multiplication',
      firstOperand: 6,
      secondOperand: 7,
      correctAnswer: 42,
      difficulty: 2,
    })
    const question = generateSimilarQuestion(pattern, { strategy: 'fact-family' })

    expectReviewQuestion(question, pattern)
    expect(question).toMatchObject({
      operation: 'division',
      firstOperand: 42,
      secondOperand: 7,
      correctAnswer: 6,
    })
  })

  it('creates a valid division fact-family multiplication question', () => {
    const pattern = createPattern({
      operation: 'division',
      firstOperand: 36,
      secondOperand: 6,
      correctAnswer: 6,
      difficulty: 2,
    })
    const question = generateSimilarQuestion(pattern, { strategy: 'fact-family' })

    expectReviewQuestion(question, pattern)
    expect(question).toMatchObject({
      operation: 'multiplication',
      firstOperand: 6,
      secondOperand: 6,
      correctAnswer: 36,
    })
  })

  it('keeps nearby subtraction and division questions valid', () => {
    const subtractionPattern = createPattern({
      operation: 'subtraction',
      firstOperand: 2,
      secondOperand: 1,
      correctAnswer: 1,
    })
    const divisionPattern = createPattern({
      operation: 'division',
      firstOperand: 12,
      secondOperand: 3,
      correctAnswer: 4,
    })

    const subtractionQuestion = generateSimilarQuestion(subtractionPattern, {
      strategy: 'nearby',
    })
    const divisionQuestion = generateSimilarQuestion(divisionPattern, {
      strategy: 'nearby',
    })

    expectReviewQuestion(subtractionQuestion, subtractionPattern)
    expect(subtractionQuestion.firstOperand).toBeGreaterThanOrEqual(
      subtractionQuestion.secondOperand,
    )
    expectReviewQuestion(divisionQuestion, divisionPattern)
    expect(divisionQuestion.firstOperand % divisionQuestion.secondOperand).toBe(0)
    expect(divisionQuestion.secondOperand).toBeGreaterThan(0)
  })

  it('avoids repeating the immediately previous review question', () => {
    const pattern = createPattern()
    const previousQuestion: Question = {
      id: 'previous-question',
      operation: 'addition',
      firstOperand: 4,
      secondOperand: 5,
      displayText: '4 + 5 = ?',
      correctAnswer: 9,
      choices: [9, 8, 10, 7],
      difficulty: 1,
      source: 'mistake-review',
      mistakePatternId: pattern.id,
    }

    const question = generateSimilarQuestion(pattern, {
      strategy: 'reversed' as SimilarQuestionStrategy,
      previousQuestion,
    })

    expect(question).not.toMatchObject({
      operation: 'addition',
      firstOperand: 4,
      secondOperand: 5,
    })
  })
})
