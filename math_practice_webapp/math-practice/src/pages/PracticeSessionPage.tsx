import { useEffect, useState } from 'react'
import { useBeforeUnload, useLocation, useNavigate } from 'react-router'

import {
  QuestionCard,
  type SelfReportedResult,
} from '../components/practice/QuestionCard'
import { ProgressBar } from '../components/practice/ProgressBar'
import { AppErrorMessage } from '../components/common/AppErrorMessage'
import { PageContainer } from '../components/layout/PageContainer'
import { usePracticeSession } from '../hooks/usePracticeSession'
import { getActiveMistakePatterns } from '../services/mistakePatterns'
import { isValidPracticeSetup } from '../services/practiceSession'
import { getFeedbackMessage } from '../services/feedback'
import { storageService } from '../services/storage'
import type { ActivePracticeState, PracticeSetupConfig } from '../types'

interface PracticeSessionLocationState {
  configuration?: PracticeSetupConfig
}

export function PracticeSessionPage() {
  const location = useLocation()
  const state = location.state as PracticeSessionLocationState | null
  const restoredPractice = state?.configuration
    ? null
    : storageService.loadActivePractice()
  const configuration = state?.configuration ?? restoredPractice?.configuration

  if (!isValidPracticeSetup(configuration)) {
    return (
      <PageContainer>
        <AppErrorMessage kind="missing-session" />
      </PageContainer>
    )
  }

  if (
    configuration.mode === 'mistake-review' &&
    !restoredPractice &&
    getActiveMistakePatterns(storageService.loadMistakePatterns()).length === 0
  ) {
    return (
      <PageContainer>
        <AppErrorMessage kind="missing-session" />
      </PageContainer>
    )
  }

  return (
    <ActivePracticeSession
      configuration={configuration}
      restoredPractice={restoredPractice}
    />
  )
}

interface ActivePracticeSessionProps {
  configuration: PracticeSetupConfig
  restoredPractice: ActivePracticeState | null
}

interface PendingDestination {
  pathname: string
  search: string
  hash: string
}

function ActivePracticeSession({
  configuration,
  restoredPractice,
}: ActivePracticeSessionProps) {
  const navigate = useNavigate()
  const [animationEnabled, setAnimationEnabled] = useState(
    () => storageService.loadSettings().cardAnimationEnabled,
  )
  const [feedbackEnabled] = useState(
    () => storageService.loadSettings().feedbackEnabled,
  )
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)
  const [pendingDestination, setPendingDestination] =
    useState<PendingDestination | null>(null)
  const {
    attempts,
    currentQuestion,
    endSession,
    recordResult,
    selectedAnswer,
    session,
    setSelectedAnswer,
    setStorageWarning,
    storageWarning,
  } = usePracticeSession(configuration, restoredPractice)
  const totalQuestions =
    session.sessionLength === 'continuous' ? undefined : session.sessionLength
  const isContinuous = totalQuestions === undefined

  useEffect(() => {
    if (!feedbackMessage) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => setFeedbackMessage(null), 3_000)
    return () => window.clearTimeout(timeoutId)
  }, [feedbackMessage])

  useBeforeUnload(
    (event) => {
      if (!session.isActive) {
        return
      }

      event.preventDefault()
      event.returnValue = ''
    },
    { capture: true },
  )

  useEffect(() => {
    function interceptInternalNavigation(event: MouseEvent) {
      if (
        !session.isActive ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return
      }

      const target = event.target
      const link =
        target instanceof Element ? target.closest<HTMLAnchorElement>('a[href]') : null
      if (!link || link.target || link.hasAttribute('download')) {
        return
      }

      const destination = new URL(link.href, window.location.href)
      if (destination.origin !== window.location.origin) {
        return
      }

      const isCurrentPage =
        destination.pathname === window.location.pathname &&
        destination.search === window.location.search &&
        destination.hash === window.location.hash
      if (isCurrentPage) {
        return
      }

      event.preventDefault()
      event.stopPropagation()
      setPendingDestination({
        pathname: destination.pathname,
        search: destination.search,
        hash: destination.hash,
      })
    }

    document.addEventListener('click', interceptInternalNavigation, true)
    return () =>
      document.removeEventListener('click', interceptInternalNavigation, true)
  }, [session.isActive])

  function navigateToSummary() {
    const completedSession = endSession()
    navigate('/practice/summary', {
      replace: true,
      state: { configuration, ...completedSession },
    })
  }

  function handleResult(result: SelfReportedResult, selectedAnswer: number) {
    setFeedbackMessage(feedbackEnabled ? getFeedbackMessage(result) : null)
    const outcome = recordResult(result, selectedAnswer)

    if (outcome.kind === 'completed') {
      navigate('/practice/summary', {
        replace: true,
        state: { configuration, ...outcome.completedSession },
      })
    }
  }

  function handleEndSession() {
    const shouldEnd = window.confirm('End this practice session and view your summary?')
    if (shouldEnd) {
      navigateToSummary()
    }
  }

  function continueSession() {
    setPendingDestination(null)
  }

  function endAndLeave() {
    if (!pendingDestination) {
      return
    }

    endSession()
    navigate(
      `${pendingDestination.pathname}${pendingDestination.search}${pendingDestination.hash}`,
    )
  }

  function handleAnimationChange(enabled: boolean) {
    setAnimationEnabled(enabled)

    const settings = storageService.loadSettings()
    if (!storageService.saveSettings({ ...settings, cardAnimationEnabled: enabled })) {
      setStorageWarning(
        'Your card preference will work for now, but it could not be saved on this device.',
      )
    }
  }

  return (
    <PageContainer className="practice-session-page">
      <div className="practice-session-header">
        <div>
          <p className="eyebrow">Practice time</p>
          <h1>Take your time—you&apos;ve got this!</h1>
        </div>
        <label className="animation-setting">
          <input
            checked={animationEnabled}
            onChange={(event) => handleAnimationChange(event.target.checked)}
            type="checkbox"
          />
          <span>Use card-flip animation</span>
        </label>
      </div>

      {totalQuestions !== undefined && (
        <ProgressBar completed={attempts.length} total={totalQuestions} />
      )}

      <QuestionCard
        animationEnabled={animationEnabled}
        currentQuestion={session.currentQuestionIndex + 1}
        feedbackEnabled={feedbackEnabled}
        initialSelectedAnswer={selectedAnswer}
        onAnswerSelect={setSelectedAnswer}
        onResult={handleResult}
        question={currentQuestion}
        totalQuestions={totalQuestions}
      />

      {feedbackMessage && (
        <p aria-live="polite" className="session-feedback" role="status">
          {feedbackMessage}
        </p>
      )}

      {storageWarning && <AppErrorMessage kind="storage" inline />}

      {isContinuous && (
        <button
          className="button button--secondary end-session-button"
          onClick={handleEndSession}
          type="button"
        >
          End Session
        </button>
      )}

      {pendingDestination && (
        <div
          aria-describedby="leave-session-description"
          aria-labelledby="leave-session-title"
          aria-modal="true"
          className="leave-session-dialog"
          role="dialog"
        >
          <div className="leave-session-dialog__content">
            <h2 id="leave-session-title">Keep practicing?</h2>
            <p id="leave-session-description">
              Your current question is saved. Continue to keep practicing, or end this
              session and leave.
            </p>
            <div className="leave-session-dialog__actions">
              <button
                className="button button--secondary"
                onClick={continueSession}
                type="button"
              >
                Continue Session
              </button>
              <button
                className="button button--primary"
                onClick={endAndLeave}
                type="button"
              >
                End and Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  )
}
