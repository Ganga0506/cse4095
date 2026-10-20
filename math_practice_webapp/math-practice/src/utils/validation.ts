import type { Question } from '../types'

function calculateAnswer(question: Question): number | null {
  switch (question.operation) {
    case 'addition':
      return question.firstOperand + question.secondOperand
    case 'subtraction':
      return question.firstOperand - question.secondOperand
    case 'multiplication':
      return question.firstOperand * question.secondOperand
    case 'division':
      if (
        question.secondOperand === 0 ||
        question.firstOperand % question.secondOperand !== 0
      ) {
        return null
      }
      return question.firstOperand / question.secondOperand
  }
}

export function isValidQuestion(question: Question): boolean {
  const calculatedAnswer = calculateAnswer(question)
  const uniqueChoices = new Set(question.choices)

  return (
    Number.isFinite(question.correctAnswer) &&
    calculatedAnswer === question.correctAnswer &&
    question.choices.length === 4 &&
    uniqueChoices.size === 4 &&
    uniqueChoices.has(question.correctAnswer) &&
    question.choices.every((choice) => Number.isInteger(choice))
  )
}
