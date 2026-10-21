import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { Question } from '../../types'

import { QuestionCard } from './QuestionCard'

const question: Question = {
  id: 'question-1',
  operation: 'multiplication',
  firstOperand: 7,
  secondOperand: 8,
  displayText: '7 × 8 = ?',
  correctAnswer: 56,
  choices: [48, 54, 56, 64],
  difficulty: 2,
  source: 'regular',
}

describe('QuestionCard', () => {
  it('requires an answer before the card can be flipped', async () => {
    const user = userEvent.setup()
    render(<QuestionCard currentQuestion={3} question={question} totalQuestions={10} />)

    const flipButton = screen.getByRole('button', { name: /flip card/i })
    expect(screen.getByText('Question 3 of 10')).toBeInTheDocument()
    expect(flipButton).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Answer choice 1: 48' }))
    expect(screen.getByRole('button', { name: 'Answer choice 1: 48' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await user.click(screen.getByRole('button', { name: 'Answer choice 2: 54' }))
    expect(screen.getByRole('button', { name: 'Answer choice 1: 48' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(flipButton).toBeEnabled()
  })

  it('reveals the answer and records only one self-reported result', async () => {
    const user = userEvent.setup()
    const onResult = vi.fn()
    render(<QuestionCard currentQuestion={1} onResult={onResult} question={question} />)

    await user.click(screen.getByRole('button', { name: 'Answer choice 3: 56' }))
    await user.click(screen.getByRole('button', { name: /flip card/i }))

    expect(screen.getByText('7 × 8 = 56')).toBeInTheDocument()
    expect(screen.getByText('Correct answer')).toBeInTheDocument()
    expect(screen.getByText('Your answer')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /i got it right/i }))
    expect(onResult).toHaveBeenCalledOnce()
    expect(onResult).toHaveBeenCalledWith('correct', 56)
    expect(screen.getByRole('button', { name: /i got it wrong/i })).toBeDisabled()
  })

  it('resets its answer and flip state for a new question', async () => {
    const user = userEvent.setup()
    const { rerender } = render(
      <QuestionCard animationEnabled={false} currentQuestion={1} question={question} />,
    )

    await user.click(screen.getByRole('button', { name: 'Answer choice 1: 48' }))
    await user.click(screen.getByRole('button', { name: /flip card/i }))
    expect(screen.getByText('7 × 8 = 56')).toBeInTheDocument()

    rerender(
      <QuestionCard
        animationEnabled={false}
        currentQuestion={2}
        question={{
          ...question,
          id: 'question-2',
          displayText: '9 × 4 = ?',
          correctAnswer: 36,
        }}
      />,
    )

    expect(screen.getByText('9 × 4 = ?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /flip card/i })).toBeDisabled()
    expect(document.querySelector('.question-card')).toHaveClass(
      'question-card--no-animation',
    )
  })
})
