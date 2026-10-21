import { render } from '@testing-library/react'
import { axe } from 'jest-axe'
import { afterEach, describe, expect, it } from 'vitest'

import App from './App'
import { QuestionCard } from './components/practice/QuestionCard'
import type { Question } from './types'

const question: Question = {
  id: 'accessible-question',
  operation: 'addition',
  firstOperand: 4,
  secondOperand: 3,
  displayText: '4 + 3 = ?',
  correctAnswer: 7,
  choices: [7, 6, 8, 5],
  difficulty: 1,
  source: 'regular',
}

afterEach(() => {
  localStorage.clear()
})

describe('automated accessibility checks', () => {
  it('finds no axe violations on the home page', async () => {
    const { container } = render(<App />)
    const results = await axe(container, {
      rules: { 'color-contrast': { enabled: false } },
    })

    expect(results.violations).toEqual([])
  })

  it('finds no axe violations on a question card', async () => {
    const { container } = render(
      <QuestionCard currentQuestion={1} question={question} totalQuestions={5} />,
    )
    const results = await axe(container, {
      rules: { 'color-contrast': { enabled: false } },
    })

    expect(results.violations).toEqual([])
  })
})
