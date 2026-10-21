import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Route, Routes } from 'react-router'
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
      <Link to="/statistics">Leave practice</Link>
      <Routes>
        <Route path="/practice/setup" element={<PracticeSetupPage />} />
        <Route path="/practice/session" element={<PracticeSessionPage />} />
        <Route path="/practice/summary" element={<SessionSummaryPage />} />
        <Route path="/statistics" element={<h1>Statistics destination</h1>} />
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
  it('shows a friendly recovery message when session setup data is missing', async () => {
    renderSession()

    expect(
      await screen.findByRole('heading', {
        name: /let’s start a new practice session/i,
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /return home/i })).toBeInTheDocument()
  })

  it('shows a friendly recovery message when a review session has no active mistakes', async () => {
    renderSession({ ...fiveQuestionConfiguration, mode: 'mistake-review' })

    expect(
      await screen.findByRole('heading', {
        name: /let’s start a new practice session/i,
      }),
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
    expect(storageService.loadActivePractice()).toBeNull()
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
    expect(storageService.loadActivePractice()).toBeNull()
  })

  it('restores the active question and a selected answer after a refresh', async () => {
    const user = userEvent.setup()
    const firstRender = renderSession(fiveQuestionConfiguration)
    const answerChoice = screen.getAllByRole('button', {
      name: /^answer choice 2:/i,
    })[0]
    const questionText = document.querySelector('.math-question')?.textContent

    await user.click(answerChoice)
    await waitFor(() => {
      expect(storageService.loadActivePractice()?.selectedAnswer).toBe(
        Number(answerChoice.getAttribute('aria-label')?.replace(/^.*: /, '')),
      )
    })

    firstRender.unmount()
    renderSession()

    expect(screen.getByText(questionText ?? '')).toBeInTheDocument()
    expect(
      screen.getAllByRole('button', { name: /^answer choice 2:/i })[0],
    ).toHaveAttribute('aria-pressed', 'true')
  })

  it('lets a child continue or end an active session before leaving', async () => {
    const user = userEvent.setup()
    renderSession(fiveQuestionConfiguration)

    await user.click(screen.getByRole('link', { name: /leave practice/i }))
    expect(screen.getByRole('dialog', { name: /keep practicing/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /continue session/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /leave practice/i }))
    await user.click(screen.getByRole('button', { name: /end and leave/i }))

    expect(
      await screen.findByRole('heading', { name: /statistics destination/i }),
    ).toBeInTheDocument()
    expect(storageService.loadActivePractice()).toBeNull()
    expect(storageService.loadCompletedSessions()).toHaveLength(1)
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

  it('completes a mixed-operation session and records only enabled operations', async () => {
    const user = userEvent.setup()
    const configuration: PracticeSetupConfig = {
      ...fiveQuestionConfiguration,
      operations: ['addition', 'subtraction', 'multiplication', 'division'],
    }
    renderSession(configuration)

    for (let questionNumber = 1; questionNumber <= 5; questionNumber += 1) {
      await answerCurrentQuestion(user)
      if (questionNumber < 5) {
        await screen.findByText(`Question ${questionNumber + 1} of 5`)
      }
    }

    expect(
      await screen.findByRole('heading', { name: /great effort/i }),
    ).toBeInTheDocument()
    expect(storageService.loadAttempts()).toHaveLength(5)
    expect(
      storageService
        .loadAttempts()
        .every((attempt) => configuration.operations.includes(attempt.operation)),
    ).toBe(true)
  })

  it('masters a mistake pattern through a review session', async () => {
    storageService.saveMistakePatterns([reviewPattern])
    storageService.saveSettings({
      ...storageService.loadSettings(),
      masteryThreshold: 1,
    })
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
      mastered: true,
    })
  })

  it('can complete a full session using only keyboard activation', async () => {
    const user = userEvent.setup()
    renderSession(fiveQuestionConfiguration)

    for (let questionNumber = 1; questionNumber <= 5; questionNumber += 1) {
      const choice = screen.getAllByRole('button', {
        name: /^answer choice 1:/i,
      })[0]
      choice.focus()
      await user.keyboard('{Enter}')

      const flipButton = screen.getByRole('button', { name: /flip card/i })
      flipButton.focus()
      await user.keyboard(' ')

      const rightButton = screen.getByRole('button', { name: /i got it right/i })
      rightButton.focus()
      await user.keyboard('{Enter}')

      if (questionNumber < 5) {
        await screen.findByText(`Question ${questionNumber + 1} of 5`)
      }
    }

    expect(
      await screen.findByRole('heading', { name: /great effort/i }),
    ).toBeInTheDocument()
  })
})
