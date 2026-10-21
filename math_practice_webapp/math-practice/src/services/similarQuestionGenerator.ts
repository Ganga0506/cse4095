import type { DifficultyLevel, MathOperation, MistakePattern, Question } from '../types'

import { createQuestionFromOperands, generateQuestion } from './questionGenerator'
import { logDevelopmentError } from '../utils/developmentLog'
import { randomInt } from '../utils/math'
import { isValidQuestion } from '../utils/validation'

export type SimilarQuestionStrategy = 'nearby' | 'reversed' | 'fact-family'

export interface SimilarQuestionOptions {
  previousQuestion?: Question
  strategy?: SimilarQuestionStrategy
}

export interface QuestionOperands {
  operation: MathOperation
  firstOperand: number
  secondOperand: number
}

const MAX_GENERATION_ATTEMPTS = 8

const additionMaximums: Record<DifficultyLevel, number> = {
  1: 10,
  2: 50,
  3: 100,
  4: 1000,
}

const multiplicationMaximums: Record<DifficultyLevel, number> = {
  1: 5,
  2: 10,
  3: 99,
  4: 99,
}

const divisionMaximumDivisors: Record<DifficultyLevel, number> = {
  1: 5,
  2: 10,
  3: 12,
  4: 25,
}

function divisionMaximumDividend(difficulty: DifficultyLevel, divisor: number): number {
  if (difficulty === 3) {
    return 144
  }

  if (difficulty === 4) {
    return 1000
  }

  return divisor * 12
}

function isSameQuestion(
  first: Pick<Question, 'operation' | 'firstOperand' | 'secondOperand'>,
  second: Pick<Question, 'operation' | 'firstOperand' | 'secondOperand'>,
): boolean {
  return (
    first.operation === second.operation &&
    first.firstOperand === second.firstOperand &&
    first.secondOperand === second.secondOperand
  )
}

function choose<T>(items: readonly T[]): T {
  return items[randomInt(0, items.length - 1)]
}

function nearbyNumber(value: number, minimum: number, maximum: number): number {
  const candidates = [-2, -1, 1, 2]
    .map((offset) => value + offset)
    .filter((candidate) => candidate >= minimum && candidate <= maximum)

  return candidates.length > 0 ? choose(candidates) : value
}

function isWithinDifficultyRange(
  operands: QuestionOperands,
  difficulty: DifficultyLevel,
): boolean {
  const { firstOperand, operation, secondOperand } = operands
  const additionMaximum = additionMaximums[difficulty]

  if (!Number.isInteger(firstOperand) || !Number.isInteger(secondOperand)) {
    return false
  }

  switch (operation) {
    case 'addition':
      return (
        firstOperand >= 0 &&
        firstOperand <= additionMaximum &&
        secondOperand >= 0 &&
        secondOperand <= additionMaximum &&
        firstOperand + secondOperand <=
          (difficulty === 1 ? 20 : difficulty === 2 ? 100 : Infinity)
      )
    case 'subtraction':
      return (
        firstOperand >= secondOperand &&
        secondOperand >= 0 &&
        firstOperand <= additionMaximum
      )
    case 'multiplication':
      if (difficulty <= 2) {
        const maximum = multiplicationMaximums[difficulty]
        return (
          firstOperand >= 0 &&
          firstOperand <= maximum &&
          secondOperand >= 0 &&
          secondOperand <= maximum
        )
      }

      if (difficulty === 3) {
        return (
          (firstOperand >= 0 &&
            firstOperand <= 9 &&
            secondOperand >= 0 &&
            secondOperand <= 99) ||
          (secondOperand >= 0 &&
            secondOperand <= 9 &&
            firstOperand >= 0 &&
            firstOperand <= 99)
        )
      }

      return (
        (firstOperand >= 10 &&
          firstOperand <= 99 &&
          secondOperand >= 1 &&
          secondOperand <= 99) ||
        (secondOperand >= 10 &&
          secondOperand <= 99 &&
          firstOperand >= 1 &&
          firstOperand <= 99)
      )
    case 'division':
      return (
        secondOperand >= 1 &&
        secondOperand <= divisionMaximumDivisors[difficulty] &&
        firstOperand >= 0 &&
        firstOperand <= divisionMaximumDividend(difficulty, secondOperand) &&
        firstOperand % secondOperand === 0
      )
  }
}

function nearbyDivisionOperands(pattern: MistakePattern): QuestionOperands {
  const maximumDivisor = divisionMaximumDivisors[pattern.difficulty]
  const currentQuotient = pattern.correctAnswer
  const candidates: QuestionOperands[] = []

  for (const divisorOffset of [-2, -1, 0, 1, 2]) {
    for (const quotientOffset of [-2, -1, 0, 1, 2]) {
      const divisor = pattern.secondOperand + divisorOffset
      const quotient = currentQuotient + quotientOffset
      const dividend = divisor * quotient
      const candidate = {
        operation: 'division' as const,
        firstOperand: dividend,
        secondOperand: divisor,
      }

      if (
        quotient >= 0 &&
        divisor >= 1 &&
        divisor <= maximumDivisor &&
        isWithinDifficultyRange(candidate, pattern.difficulty) &&
        !isSameQuestion(candidate, pattern)
      ) {
        candidates.push(candidate)
      }
    }
  }

  if (candidates.length > 0) {
    return choose(candidates)
  }

  return {
    operation: 'division',
    firstOperand: pattern.secondOperand,
    secondOperand: pattern.secondOperand,
  }
}

export function generateNearbyOperands(pattern: MistakePattern): QuestionOperands {
  const difficulty = pattern.difficulty

  if (pattern.operation === 'division') {
    return nearbyDivisionOperands(pattern)
  }

  if (pattern.operation === 'subtraction') {
    const maximum = additionMaximums[difficulty]
    const firstOperand = nearbyNumber(pattern.firstOperand, 0, maximum)
    const secondOperand = nearbyNumber(pattern.secondOperand, 0, firstOperand)
    const candidate = { operation: 'subtraction' as const, firstOperand, secondOperand }

    if (!isSameQuestion(candidate, pattern)) {
      return candidate
    }

    return {
      operation: 'subtraction',
      firstOperand: pattern.firstOperand,
      secondOperand: Math.max(0, pattern.secondOperand - 1),
    }
  }

  if (pattern.operation === 'multiplication') {
    if (difficulty <= 2) {
      const maximum = multiplicationMaximums[difficulty]
      return {
        operation: 'multiplication',
        firstOperand: nearbyNumber(pattern.firstOperand, 0, maximum),
        secondOperand: nearbyNumber(pattern.secondOperand, 0, maximum),
      }
    }

    if (difficulty === 3) {
      return {
        operation: 'multiplication',
        firstOperand: nearbyNumber(pattern.firstOperand, 0, 9),
        secondOperand: nearbyNumber(pattern.secondOperand, 0, 99),
      }
    }

    return {
      operation: 'multiplication',
      firstOperand: nearbyNumber(pattern.firstOperand, 10, 99),
      secondOperand: nearbyNumber(pattern.secondOperand, 1, 99),
    }
  }

  const maximum = additionMaximums[difficulty]
  return {
    operation: 'addition',
    firstOperand: nearbyNumber(pattern.firstOperand, 0, maximum),
    secondOperand: nearbyNumber(pattern.secondOperand, 0, maximum),
  }
}

export function generateReversedOperands(
  pattern: MistakePattern,
): QuestionOperands | null {
  if (
    (pattern.operation !== 'addition' && pattern.operation !== 'multiplication') ||
    pattern.firstOperand === pattern.secondOperand
  ) {
    return null
  }

  return {
    operation: pattern.operation,
    firstOperand: pattern.secondOperand,
    secondOperand: pattern.firstOperand,
  }
}

export function generateFactFamilyOperands(
  pattern: MistakePattern,
): QuestionOperands | null {
  switch (pattern.operation) {
    case 'addition':
      return {
        operation: 'subtraction',
        firstOperand: pattern.firstOperand + pattern.secondOperand,
        secondOperand: pattern.secondOperand,
      }
    case 'subtraction':
      return {
        operation: 'addition',
        firstOperand: pattern.correctAnswer,
        secondOperand: pattern.secondOperand,
      }
    case 'multiplication': {
      const divisor = pattern.secondOperand || pattern.firstOperand
      if (divisor === 0) {
        return null
      }

      return {
        operation: 'division',
        firstOperand: pattern.correctAnswer,
        secondOperand: divisor,
      }
    }
    case 'division':
      return {
        operation: 'multiplication',
        firstOperand: pattern.secondOperand,
        secondOperand: pattern.correctAnswer,
      }
  }
}

function availableStrategies(pattern: MistakePattern): SimilarQuestionStrategy[] {
  return pattern.operation === 'addition' || pattern.operation === 'multiplication'
    ? ['nearby', 'reversed', 'fact-family']
    : ['nearby', 'fact-family']
}

function operandsForStrategy(
  pattern: MistakePattern,
  strategy: SimilarQuestionStrategy,
): QuestionOperands | null {
  switch (strategy) {
    case 'nearby':
      return generateNearbyOperands(pattern)
    case 'reversed':
      return generateReversedOperands(pattern)
    case 'fact-family':
      return generateFactFamilyOperands(pattern)
  }
}

function createReviewQuestion(
  pattern: MistakePattern,
  operands: QuestionOperands,
  previousQuestion?: Question,
): Question | null {
  if (
    !isWithinDifficultyRange(operands, pattern.difficulty) ||
    isSameQuestion(operands, pattern) ||
    (previousQuestion && isSameQuestion(operands, previousQuestion))
  ) {
    return null
  }

  try {
    const question = createQuestionFromOperands(
      operands.operation,
      operands.firstOperand,
      operands.secondOperand,
      pattern.difficulty,
      'mistake-review',
      pattern.id,
    )

    return isValidQuestion(question) ? question : null
  } catch (error) {
    logDevelopmentError('Could not create a similar review question.', error)
    return null
  }
}

export function generateSimilarQuestion(
  pattern: MistakePattern,
  options: SimilarQuestionOptions = {},
): Question {
  const strategies: SimilarQuestionStrategy[] = options.strategy
    ? [options.strategy, 'nearby']
    : availableStrategies(pattern)

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const strategy = options.strategy
      ? strategies[attempt % strategies.length]
      : choose(strategies)
    const operands = operandsForStrategy(pattern, strategy)
    if (!operands) {
      continue
    }

    const question = createReviewQuestion(pattern, operands, options.previousQuestion)
    if (question) {
      return question
    }
  }

  logDevelopmentError(
    `Using a fallback mistake-review question after ${MAX_GENERATION_ATTEMPTS} failed attempts.`,
  )
  const fallback = generateQuestion(pattern.operation, pattern.difficulty)
  return {
    ...fallback,
    source: 'mistake-review',
    mistakePatternId: pattern.id,
  }
}
