import { Link, useLocation } from 'react-router'

import { PageContainer } from '../components/layout/PageContainer'
import type { MathOperation, PracticeSetupConfig } from '../types'

const operationLabels: Record<MathOperation, string> = {
  addition: 'Addition',
  subtraction: 'Subtraction',
  multiplication: 'Multiplication',
  division: 'Division',
}

interface PracticeSessionLocationState {
  configuration?: PracticeSetupConfig
}

export function PracticeSessionPage() {
  const location = useLocation()
  const state = location.state as PracticeSessionLocationState | null
  const configuration = state?.configuration

  if (!configuration) {
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

  const lengthLabel =
    configuration.sessionLength === 'continuous'
      ? 'Keep going until you choose to stop'
      : `${configuration.sessionLength} questions`

  return (
    <PageContainer className="placeholder-page">
      <p className="eyebrow">Your session is ready</p>
      <h1>Great choices!</h1>
      <p>The question-card practice experience arrives in the next phase.</p>
      <dl className="session-preview">
        <div>
          <dt>Math skills</dt>
          <dd>
            {configuration.operations
              .map((operation) => operationLabels[operation])
              .join(', ')}
          </dd>
        </div>
        <div>
          <dt>Challenge level</dt>
          <dd>Level {configuration.difficulty}</dd>
        </div>
        <div>
          <dt>Practice length</dt>
          <dd>{lengthLabel}</dd>
        </div>
      </dl>
      <Link className="button button--secondary" to="/practice/setup">
        Change setup
      </Link>
    </PageContainer>
  )
}
