import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'

import {
  QuestionCard,
  type SelfReportedResult,
} from '../components/practice/QuestionCard'
import { ProgressBar } from '../components/practice/ProgressBar'
import { PageContainer } from '../components/layout/PageContainer'
import { usePracticeSession } from '../hooks/usePracticeSession'
import { isValidPracticeSetup } from '../services/practiceSession'
import type { PracticeSetupConfig } from '../types'

interface PracticeSessionLocationState {
  configuration?: PracticeSetupConfig
}

export function PracticeSessionPage() {
  const location = useLocation()
  const state = location.state as PracticeSessionLocationState | null

  if (!isValidPracticeSetup(state?.configuration)) {
    return <Navigate replace to="/practice/setup" />
  }

  return <ActivePracticeSession configuration={state.configuration} />
}

interface ActivePracticeSessionProps {
  configuration: PracticeSetupConfig
}

function ActivePracticeSession({ configuration }: ActivePracticeSessionProps) {
  const navigate = useNavigate()
  const [animationEnabled, setAnimationEnabled] = useState(true)
  const { attempts, currentQuestion, endSession, recordResult, session } =
    usePracticeSession(configuration)
  const totalQuestions =
    session.sessionLength === 'continuous' ? undefined : session.sessionLength
  const isContinuous = totalQuestions === undefined

  function navigateToSummary() {
    const completedSession = endSession()
    navigate('/practice/summary', {
      replace: true,
      state: { configuration, ...completedSession },
    })
  }

  function handleResult(result: SelfReportedResult, selectedAnswer: number) {
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
            onChange={(event) => setAnimationEnabled(event.target.checked)}
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
        onResult={handleResult}
        question={currentQuestion}
        totalQuestions={totalQuestions}
      />

      {isContinuous && (
        <button
          className="button button--secondary end-session-button"
          onClick={handleEndSession}
          type="button"
        >
          End Session
        </button>
      )}
    </PageContainer>
  )
}
