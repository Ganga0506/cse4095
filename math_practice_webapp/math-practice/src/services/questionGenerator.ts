import type { DifficultyLevel, MathOperation, Question, QuestionSource } from '../types'

import { generateAnswerChoices } from './answerChoices'
import { createId } from '../utils/ids'
import { randomInt } from '../utils/math'
import { isValidQuestion } from '../utils/validation'

const MAX_QUESTION_ATTEMPTS = 3

interface NumberRange {
  min: number
  max: number
}

const additionRanges: Record<DifficultyLevel, NumberRange> = {
  1: { min: 0, max: 10 },
  2: { min: 0, max: 50 },
  3: { min: 0, max: 100 },
  4: { min: 0, max: 1000 },
}

const subtractionRanges: Record<DifficultyLevel, NumberRange> = additionRanges

const multiplicationRanges: Record<DifficultyLevel, NumberRange> = {
  1: { min: 0, max: 5 },
  2: { min: 0, max: 10 },
  3: { min: 0, max: 99 },
  4: { min: 1, max: 99 },
}

const operationSymbols: Record<MathOperation, string> = {
  addition: '+',
  subtraction: '−',
  multiplication: '×',
  division: '÷',
}

export function createQuestionFromOperands(
  operation: MathOperation,
  firstOperand: number,
  secondOperand: number,
  difficulty: DifficultyLevel,
  source: QuestionSource = 'regular',
  mistakePatternId?: string,
): Question {
  const correctAnswer = calculateAnswer(operation, firstOperand, secondOperand)

  return {
    id: createId('question'),
    operation,
    firstOperand,
    secondOperand,
    displayText: `${firstOperand} ${operationSymbols[operation]} ${secondOperand} = ?`,
    correctAnswer,
    choices: generateAnswerChoices({
      operation,
      firstOperand,
      secondOperand,
      correctAnswer,
    }),
    difficulty,
    source,
    ...(mistakePatternId ? { mistakePatternId } : {}),
  }
}

function calculateAnswer(
  operation: MathOperation,
  firstOperand: number,
  secondOperand: number,
): number {
  switch (operation) {
    case 'addition':
      return firstOperand + secondOperand
    case 'subtraction':
      return firstOperand - secondOperand
    case 'multiplication':
      return firstOperand * secondOperand
    case 'division':
      return firstOperand / secondOperand
  }
}

export function generateAdditionQuestion(difficulty: DifficultyLevel): Question {
  const range = additionRanges[difficulty]
  const firstOperand = randomInt(range.min, range.max)
  const secondOperand = randomInt(range.min, range.max)

  return createQuestionFromOperands('addition', firstOperand, secondOperand, difficulty)
}

export function generateSubtractionQuestion(difficulty: DifficultyLevel): Question {
  const range = subtractionRanges[difficulty]
  const firstValue = randomInt(range.min, range.max)
  const secondValue = randomInt(range.min, range.max)
  const firstOperand = Math.max(firstValue, secondValue)
  const secondOperand = Math.min(firstValue, secondValue)

  return createQuestionFromOperands(
    'subtraction',
    firstOperand,
    secondOperand,
    difficulty,
  )
}

export function generateMultiplicationQuestion(difficulty: DifficultyLevel): Question {
  if (difficulty <= 2) {
    const range = multiplicationRanges[difficulty]
    return createQuestionFromOperands(
      'multiplication',
      randomInt(range.min, range.max),
      randomInt(range.min, range.max),
      difficulty,
    )
  }

  if (difficulty === 3) {
    return createQuestionFromOperands(
      'multiplication',
      randomInt(0, 9),
      randomInt(0, 99),
      difficulty,
    )
  }

  return createQuestionFromOperands(
    'multiplication',
    randomInt(10, 99),
    randomInt(1, 99),
    difficulty,
  )
}

export function generateDivisionQuestion(difficulty: DifficultyLevel): Question {
  const divisorRange: Record<DifficultyLevel, NumberRange> = {
    1: { min: 1, max: 5 },
    2: { min: 1, max: 10 },
    3: { min: 1, max: 12 },
    4: { min: 1, max: 25 },
  }
  const divisor = randomInt(divisorRange[difficulty].min, divisorRange[difficulty].max)
  const maximumDividend =
    difficulty === 3 ? 144 : difficulty === 4 ? 1000 : divisor * 12
  const quotient = randomInt(0, Math.floor(maximumDividend / divisor))
  const dividend = divisor * quotient

  return createQuestionFromOperands('division', dividend, divisor, difficulty)
}

function selectOperation(
  operationOrOperations: MathOperation | readonly MathOperation[],
): MathOperation {
  if (typeof operationOrOperations === 'string') {
    return operationOrOperations
  }

  if (operationOrOperations.length === 0) {
    throw new Error('At least one operation is required to generate a question.')
  }

  return operationOrOperations[randomInt(0, operationOrOperations.length - 1)]
}

function createQuestionForOperation(
  operation: MathOperation,
  difficulty: DifficultyLevel,
): Question {
  switch (operation) {
    case 'addition':
      return generateAdditionQuestion(difficulty)
    case 'subtraction':
      return generateSubtractionQuestion(difficulty)
    case 'multiplication':
      return generateMultiplicationQuestion(difficulty)
    case 'division':
      return generateDivisionQuestion(difficulty)
  }
}

export function generateQuestion(
  operationOrOperations: MathOperation | readonly MathOperation[],
  difficulty: DifficultyLevel,
): Question {
  const operation = selectOperation(operationOrOperations)

  for (let attempt = 0; attempt < MAX_QUESTION_ATTEMPTS; attempt += 1) {
    const question = createQuestionForOperation(operation, difficulty)
    if (isValidQuestion(question)) {
      return question
    }
  }

  throw new Error('Unable to generate a valid math question. Please try again.')
}
