import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

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
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

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
    expect(
      screen.getByText('The answer is revealed. The correct answer is 56.'),
    ).toHaveAttribute('role', 'status')
  })

  it('shows encouraging feedback when enabled and hides it when disabled', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const user = userEvent.setup()
    const { rerender } = render(
      <QuestionCard currentQuestion={1} question={question} />,
    )

    await user.click(screen.getByRole('button', { name: 'Answer choice 1: 48' }))
    await user.click(screen.getByRole('button', { name: /flip card/i }))
    await user.click(screen.getByRole('button', { name: /i got it wrong/i }))
    expect(
      screen.getByText('That was a brave try. Every question helps you learn.'),
    ).toBeInTheDocument()

    rerender(
      <QuestionCard
        feedbackEnabled={false}
        currentQuestion={2}
        question={{ ...question, id: 'question-2' }}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Answer choice 1: 48' }))
    await user.click(screen.getByRole('button', { name: /flip card/i }))
    await user.click(screen.getByRole('button', { name: /i got it right/i }))
    expect(
      screen.queryByText('Great job! Your careful thinking paid off.'),
    ).not.toBeInTheDocument()
  })

  it('supports Enter, Space, and number keys for answer choices', async () => {
    const user = userEvent.setup()
    render(<QuestionCard currentQuestion={1} question={question} />)

    await user.tab()
    expect(screen.getByRole('button', { name: 'Answer choice 1: 48' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('button', { name: 'Answer choice 1: 48' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await user.tab()
    await user.keyboard(' ')
    expect(screen.getByRole('button', { name: 'Answer choice 2: 54' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    document.body.focus()
    await user.keyboard('3')
    expect(screen.getByRole('button', { name: 'Answer choice 3: 56' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('does not use number shortcuts while a form field has focus', async () => {
    const user = userEvent.setup()
    render(
      <>
        <input aria-label="Practice note" />
        <QuestionCard currentQuestion={1} question={question} />
      </>,
    )

    await user.click(screen.getByRole('textbox', { name: 'Practice note' }))
    await user.keyboard('1')

    expect(screen.getByRole('button', { name: 'Answer choice 1: 48' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('uses semantic choices, announces new questions, and respects reduced motion', () => {
    const addEventListener = vi.fn()
    const removeEventListener = vi.fn()
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener,
        removeEventListener,
      }),
    )

    render(<QuestionCard currentQuestion={2} question={question} totalQuestions={5} />)

    expect(screen.getByRole('group', { name: 'Choose an answer' })).toBeInTheDocument()
    expect(screen.getByText('Question 2 of 5. 7 × 8 = ?')).toHaveAttribute(
      'role',
      'status',
    )
    expect(document.querySelector('.question-card')).toHaveClass(
      'question-card--no-animation',
    )
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

  it('restores a saved answer and reports later answer changes', async () => {
    const user = userEvent.setup()
    const onAnswerSelect = vi.fn()
    render(
      <QuestionCard
        currentQuestion={1}
        initialSelectedAnswer={56}
        onAnswerSelect={onAnswerSelect}
        question={question}
      />,
    )

    expect(screen.getByRole('button', { name: 'Answer choice 3: 56' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: /flip card/i })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Answer choice 2: 54' }))
    expect(onAnswerSelect).toHaveBeenCalledWith(54)
  })
})
