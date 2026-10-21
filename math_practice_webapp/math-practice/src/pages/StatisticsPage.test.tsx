import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { MistakePattern, PracticeAttempt } from '../types'
import { completeSession, createPracticeSession } from '../services/practiceSession'
import { storageService } from '../services/storage'

import { StatisticsPage } from './StatisticsPage'

const activePattern: MistakePattern = {
  id: 'active-pattern',
  operation: 'addition',
  firstOperand: 4,
  secondOperand: 3,
  correctAnswer: 7,
  difficulty: 1,
  incorrectCount: 3,
  similarCorrectCount: 1,
  lastIncorrectAt: '2026-10-21T10:00:00.000Z',
  mastered: false,
}

const masteredPattern: MistakePattern = {
  ...activePattern,
  id: 'mastered-pattern',
  operation: 'multiplication',
  firstOperand: 6,
  secondOperand: 7,
  correctAnswer: 42,
  similarCorrectCount: 3,
  mastered: true,
}

function createReviewAttempt(
  overrides: Partial<PracticeAttempt> = {},
): PracticeAttempt {
  return {
    id: 'review-attempt',
    questionId: 'review-question',
    operation: 'addition',
    firstOperand: 5,
    secondOperand: 3,
    correctAnswer: 8,
    selectedAnswer: 8,
    selfReportedCorrect: true,
    difficulty: 1,
    source: 'mistake-review',
    mistakePatternId: activePattern.id,
    attemptedAt: '2026-10-21T10:05:00.000Z',
    sessionId: 'session-1',
    ...overrides,
  }
}

function renderStatistics() {
  return render(
    <MemoryRouter>
      <StatisticsPage />
    </MemoryRouter>,
  )
}

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('StatisticsPage mistake review section', () => {
  it('shows a friendly empty state when no mistake patterns are saved', () => {
    renderStatistics()

    expect(
      screen.getByRole('heading', { name: /no mistake patterns yet/i }),
    ).toBeInTheDocument()
    expect(screen.getByText('Active patterns').parentElement).toHaveTextContent('0')
  })

  it('shows active details and lets mastered patterns be viewed separately', async () => {
    storageService.saveMistakePatterns([activePattern, masteredPattern])
    storageService.saveAttempt(createReviewAttempt())
    storageService.saveAttempt(
      createReviewAttempt({ id: 'incorrect-review', selfReportedCorrect: false }),
    )
    const user = userEvent.setup()
    renderStatistics()

    expect(screen.getByText('Active patterns').parentElement).toHaveTextContent('1')
    expect(screen.getByText('Mastered patterns').parentElement).toHaveTextContent('1')
    expect(
      screen.getByText('Similar questions practiced').parentElement,
    ).toHaveTextContent('2')
    expect(
      screen.getByText('Review questions correct').parentElement,
    ).toHaveTextContent('1')
    const activeDetails = screen
      .getByRole('heading', { name: '4 + 3 = 7' })
      .closest('article')
    expect(activeDetails).toHaveTextContent('Incorrect3')
    expect(activeDetails).toHaveTextContent('Mastery progress1 / 3')

    await user.click(screen.getByRole('button', { name: 'Mastered (1)' }))

    const masteredDetails = screen
      .getByRole('heading', { name: '6 × 7 = 42' })
      .closest('article')
    expect(masteredDetails).toHaveTextContent('Mastery progress3 / 3')
  })

  it('resets statistics only after confirmation and preserves them when cancelled', async () => {
    const completedSession = completeSession(
      createPracticeSession({
        operations: ['addition'],
        difficulty: 1,
        sessionLength: 5,
        mode: 'regular',
      }),
    )
    storageService.saveCompletedSession(completedSession)
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()
    renderStatistics()

    const resetButton = screen.getByRole('button', { name: /reset statistics/i })
    await user.click(resetButton)
    expect(confirm).toHaveBeenCalledOnce()
    expect(storageService.loadCompletedSessions()).toEqual([completedSession])

    confirm.mockReturnValue(true)
    await user.click(resetButton)
    expect(storageService.loadCompletedSessions()).toEqual([])
    expect(resetButton).toBeDisabled()
  })
})
