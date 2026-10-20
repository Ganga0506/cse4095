import type { MathOperation } from '../types'

import { shuffle } from '../utils/shuffle'

const DISTRACTOR_COUNT = 3
const MAX_DISTRACTOR_ATTEMPTS = 50

export interface DistractorInput {
  operation: MathOperation
  firstOperand: number
  secondOperand: number
  correctAnswer: number
  allowNegative?: boolean
}

function getOperationSpecificCandidates({
  operation,
  firstOperand,
  secondOperand,
  correctAnswer,
}: DistractorInput): number[] {
  switch (operation) {
    case 'addition':
      return [
        correctAnswer - 1,
        correctAnswer + 1,
        correctAnswer - firstOperand,
        correctAnswer - secondOperand,
        correctAnswer + firstOperand,
        correctAnswer + secondOperand,
      ]
    case 'subtraction':
      return [
        firstOperand + secondOperand,
        correctAnswer - 1,
        correctAnswer + 1,
        correctAnswer + secondOperand,
        Math.abs(secondOperand - firstOperand),
      ]
    case 'multiplication':
      return [
        (firstOperand - 1) * secondOperand,
        (firstOperand + 1) * secondOperand,
        correctAnswer - 1,
        correctAnswer + 1,
        firstOperand * (secondOperand - 1),
        firstOperand * (secondOperand + 1),
      ]
    case 'division':
      return [
        correctAnswer + 1,
        correctAnswer - 1,
        secondOperand,
        firstOperand,
        correctAnswer * secondOperand,
        correctAnswer + secondOperand,
      ]
  }
}

function addCandidate(
  choices: Set<number>,
  candidate: number,
  correctAnswer: number,
  allowNegative: boolean,
) {
  if (
    Number.isInteger(candidate) &&
    candidate !== correctAnswer &&
    (allowNegative || candidate >= 0)
  ) {
    choices.add(candidate)
  }
}

export function generateIncorrectChoices(input: DistractorInput): number[] {
  const allowNegative = input.allowNegative ?? false
  const choices = new Set<number>()
  const candidates = getOperationSpecificCandidates(input)

  for (const candidate of candidates) {
    addCandidate(choices, candidate, input.correctAnswer, allowNegative)
    if (choices.size === DISTRACTOR_COUNT) {
      return [...choices]
    }
  }

  for (
    let attempt = 1;
    choices.size < DISTRACTOR_COUNT && attempt <= MAX_DISTRACTOR_ATTEMPTS;
    attempt += 1
  ) {
    const offset = Math.ceil(attempt / 2)
    const candidate = input.correctAnswer + (attempt % 2 === 0 ? -offset : offset)
    addCandidate(choices, candidate, input.correctAnswer, allowNegative)
  }

  if (choices.size !== DISTRACTOR_COUNT) {
    throw new Error('Unable to create three unique answer choices.')
  }

  return [...choices]
}

export function generateAnswerChoices(input: DistractorInput): number[] {
  return shuffle([input.correctAnswer, ...generateIncorrectChoices(input)])
}
