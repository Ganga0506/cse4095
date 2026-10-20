import { useState } from 'react'
import { Link, useLocation } from 'react-router'

import { QuestionCard, type SelfReportedResult } from '../components/practice/QuestionCard'
import { PageContainer } from '../components/layout/PageContainer'
import { generateQuestion } from '../services/questionGenerator'
import type { PracticeSetupConfig } from '../types'

interface PracticeSessionLocationState {
  configuration?: PracticeSetupConfig
}

function createPracticeQuestion(configuration: PracticeSetupConfig) {
  return generateQuestion(configuration.operations, configuration.difficulty)
}

export function PracticeSessionPage() {
  const location = useLocation()
  const state = location.state as PracticeSessionLocationState | null
  const configuration = state?.configuration
  const [animationEnabled, setAnimationEnabled] = useState(true)
  const [resultMessage, setResultMessage] = useState('')
  const [question] = useState(() =>
    configuration ? createPracticeQuestion(configuration) : null,
  )

  if (!configuration || !question) {
    return (
      <PageContainer className="placeholder-page">
        <p className="eyebrow">No session yet</p>
        <h1>Set up your practice first</h1>
        <p>Choose your math skills and challenge level before starting a session.</p>
        <Link className="button button--primary" to="/practice/setup">
          Go to Practice Setup
        </Link>
      </PageContainer>
    )
  }

  const totalQuestions =
    configuration.sessionLength === 'continuous' ? undefined : configuration.sessionLength

  function handleResult(result: SelfReportedResult) {
    setResultMessage(
      result === 'correct'
        ? 'You marked this answer correct. Session scoring arrives in Phase 7.'
        : 'You marked this answer for more practice. Session scoring arrives in Phase 7.',
    )
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

      <QuestionCard
        animationEnabled={animationEnabled}
        currentQuestion={1}
        onResult={handleResult}
        question={question}
        totalQuestions={totalQuestions}
      />

      {resultMessage && <p className="session-result-message" role="status">{resultMessage}</p>}
    </PageContainer>
  )
}
