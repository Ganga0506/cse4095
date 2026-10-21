import { useLocation, useNavigate } from 'react-router'

import { AppErrorMessage } from '../components/common/AppErrorMessage'
import { PageContainer } from '../components/layout/PageContainer'
import { isValidPracticeSetup } from '../services/practiceSession'
import type {
  MathOperation,
  PracticeAttempt,
  PracticeSession,
  PracticeSetupConfig,
} from '../types'

const operationLabels: Record<MathOperation, string> = {
  addition: 'Addition',
  subtraction: 'Subtraction',
  multiplication: 'Multiplication',
  division: 'Division',
}

interface SessionSummaryLocationState {
  configuration?: PracticeSetupConfig
  session?: PracticeSession
  attempts?: PracticeAttempt[]
}

function isValidSummaryState(
  state: SessionSummaryLocationState | null,
): state is Required<SessionSummaryLocationState> {
  return Boolean(
    state &&
    isValidPracticeSetup(state.configuration) &&
    state.session &&
    Array.isArray(state.attempts),
  )
}

export function SessionSummaryPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as SessionSummaryLocationState | null

  if (!isValidSummaryState(state)) {
    return (
      <PageContainer className="summary-page">
        <AppErrorMessage kind="missing-session" />
      </PageContainer>
    )
  }

  const { attempts, configuration, session } = state
  const accuracy =
    session.attempted === 0
      ? 0
      : Math.round((session.correct / session.attempted) * 100)
  const mistakeReviewCount = attempts.filter(
    (attempt) => attempt.source === 'mistake-review',
  ).length

  function practiceAgain() {
    navigate('/practice/session', { state: { configuration } })
  }

  return (
    <PageContainer className="summary-page">
      <div className="summary-heading">
        <p className="eyebrow">Session complete</p>
        <h1>Great effort!</h1>
        <p>You finished your practice session. Here&apos;s how it went.</p>
      </div>

      <section aria-label="Session score" className="summary-score">
        <p>Accuracy</p>
        <strong>{accuracy}%</strong>
        <span>{session.correct} correct answers</span>
      </section>

      <dl className="summary-details">
        <div>
          <dt>Questions attempted</dt>
          <dd>{session.attempted}</dd>
        </div>
        <div>
          <dt>Correct</dt>
          <dd>{session.correct}</dd>
        </div>
        <div>
          <dt>Incorrect</dt>
          <dd>{session.incorrect}</dd>
        </div>
        <div>
          <dt>Operations</dt>
          <dd>
            {configuration.operations
              .map((operation) => operationLabels[operation])
              .join(', ')}
          </dd>
        </div>
        <div>
          <dt>Difficulty</dt>
          <dd>Level {configuration.difficulty}</dd>
        </div>
        <div>
          <dt>Mistake-review questions</dt>
          <dd>{mistakeReviewCount}</dd>
        </div>
      </dl>

      <div className="summary-actions">
        <button
          className="button button--primary"
          onClick={practiceAgain}
          type="button"
        >
          Practice Again
        </button>
        <button
          className="button button--secondary"
          onClick={() =>
            navigate('/practice/setup', { state: { mode: 'mistake-review' } })
          }
          type="button"
        >
          Practice Mistakes
        </button>
        <button
          className="button button--secondary"
          onClick={() => navigate('/settings')}
          type="button"
        >
          Change Settings
        </button>
        <button
          className="button button--secondary"
          onClick={() => navigate('/statistics')}
          type="button"
        >
          View Statistics
        </button>
        <button
          className="button button--secondary"
          onClick={() => navigate('/')}
          type="button"
        >
          Return Home
        </button>
      </div>
    </PageContainer>
  )
}
