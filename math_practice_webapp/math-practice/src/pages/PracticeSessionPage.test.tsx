import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { PracticeSetupConfig } from '../types'
import type { MistakePattern } from '../types'
import { storageService } from '../services/storage'

import { PracticeSessionPage } from './PracticeSessionPage'
import { PracticeSetupPage } from './PracticeSetupPage'
import { SessionSummaryPage } from './SessionSummaryPage'

const fiveQuestionConfiguration: PracticeSetupConfig = {
  operations: ['addition'],
  difficulty: 1,
  sessionLength: 5,
  mode: 'regular',
}

const reviewPattern: MistakePattern = {
  id: 'mistake-review-1',
  operation: 'addition',
  firstOperand: 4,
  secondOperand: 3,
  correctAnswer: 7,
  difficulty: 1,
  incorrectCount: 1,
  similarCorrectCount: 0,
  lastIncorrectAt: '2026-10-21T10:00:00.000Z',
  mastered: false,
}

function renderSession(configuration?: PracticeSetupConfig) {
  return render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: '/practice/session',
          state: configuration ? { configuration } : null,
        },
      ]}
    >
      <Routes>
        <Route path="/practice/setup" element={<PracticeSetupPage />} />
        <Route path="/practice/session" element={<PracticeSessionPage />} />
        <Route path="/practice/summary" element={<SessionSummaryPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

async function answerCurrentQuestion(user: ReturnType<typeof userEvent.setup>) {
  const answerChoice = screen.getAllByRole('button', { name: /^answer choice 1:/i })[0]
  await user.click(answerChoice)
  await user.click(screen.getByRole('button', { name: /flip card/i }))
  await user.click(screen.getByRole('button', { name: /i got it right/i }))
}

async function recordCurrentQuestionAsWrong(user: ReturnType<typeof userEvent.setup>) {
  const answerChoice = screen.getAllByRole('button', { name: /^answer choice 1:/i })[0]
  await user.click(answerChoice)
  await user.click(screen.getByRole('button', { name: /flip card/i }))
  await user.click(screen.getByRole('button', { name: /i got it wrong/i }))
}

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('PracticeSessionPage', () => {
  it('redirects to setup when session setup data is missing', async () => {
    renderSession()

    expect(
      await screen.findByRole('heading', { name: /let's make your math plan/i }),
    ).toBeInTheDocument()
  })

  it('redirects to setup when a review session has no active mistake patterns', async () => {
    renderSession({ ...fiveQuestionConfiguration, mode: 'mistake-review' })

    expect(
      await screen.findByRole('heading', { name: /let's make your math plan/i }),
    ).toBeInTheDocument()
  })

  it('completes a five-question session end to end and shows the summary', async () => {
    const user = userEvent.setup()
    renderSession(fiveQuestionConfiguration)

    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')

    for (let questionNumber = 1; questionNumber <= 5; questionNumber += 1) {
      await answerCurrentQuestion(user)

      if (questionNumber < 5) {
        await screen.findByText(`Question ${questionNumber + 1} of 5`)
      }
    }

    expect(
      await screen.findByRole('heading', { name: /great effort/i }),
    ).toBeInTheDocument()
    expect(screen.getByText('5 correct answers')).toBeInTheDocument()
    expect(screen.getByText('Questions attempted').parentElement).toHaveTextContent('5')
    expect(storageService.loadAttempts()).toHaveLength(5)
    expect(storageService.loadCompletedSessions()).toHaveLength(1)
    expect(screen.getByRole('button', { name: /practice again/i })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /practice mistakes/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /change settings/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /view statistics/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /return home/i })).toBeInTheDocument()
  })

  it('ends a continuous session end to end and shows its partial summary', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    renderSession({ ...fiveQuestionConfiguration, sessionLength: 'continuous' })

    expect(screen.getByText('Question 1')).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()

    await answerCurrentQuestion(user)
    await screen.findByText('Question 2')
    await answerCurrentQuestion(user)
    await screen.findByText('Question 3')

    await user.click(screen.getByRole('button', { name: /end session/i }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /great effort/i })).toBeInTheDocument()
    })
    expect(screen.getByText('2 correct answers')).toBeInTheDocument()
    expect(screen.getByText('Questions attempted').parentElement).toHaveTextContent('2')
  })

  it('stores an incorrect self-reported answer as a mistake pattern', async () => {
    const user = userEvent.setup()
    renderSession(fiveQuestionConfiguration)

    await recordCurrentQuestionAsWrong(user)
    await screen.findByText('Question 2 of 5')

    expect(storageService.loadMistakePatterns()).toHaveLength(1)
    expect(storageService.loadMistakePatterns()[0]).toMatchObject({
      operation: 'addition',
      difficulty: 1,
      incorrectCount: 1,
      similarCorrectCount: 0,
    })
  })

  it('records correct review progress on the source mistake pattern', async () => {
    storageService.saveMistakePatterns([reviewPattern])
    const user = userEvent.setup()
    renderSession({
      operations: ['addition'],
      difficulty: 1,
      sessionLength: 5,
      mode: 'mistake-review',
    })

    await answerCurrentQuestion(user)
    await screen.findByText('Question 2 of 5')

    expect(storageService.loadMistakePatterns()[0]).toMatchObject({
      id: reviewPattern.id,
      similarCorrectCount: 1,
      mastered: false,
    })
    expect(storageService.loadAttempts()[0]).toMatchObject({
      source: 'mistake-review',
      mistakePatternId: reviewPattern.id,
    })
  })
})
