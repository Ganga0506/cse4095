import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router'

import { DifficultySelector } from '../components/practice/DifficultySelector'
import { OperationSelector } from '../components/practice/OperationSelector'
import { SessionLengthSelector } from '../components/practice/SessionLengthSelector'
import { PageContainer } from '../components/layout/PageContainer'
import type { DifficultyLevel, MathOperation, SessionLength } from '../types'

export function PracticeSetupPage() {
  const navigate = useNavigate()
  const [operations, setOperations] = useState<MathOperation[]>([])
  const [difficulty, setDifficulty] = useState<DifficultyLevel | null>(null)
  const [sessionLength, setSessionLength] = useState<SessionLength>(10)
  const isReady = operations.length > 0 && difficulty !== null

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!isReady || difficulty === null) {
      return
    }

    navigate('/practice/session', {
      state: {
        configuration: {
          operations,
          difficulty,
          sessionLength,
        },
      },
    })
  }

  return (
    <PageContainer className="setup-page">
      <div className="page-heading">
        <p className="eyebrow">Set up your practice</p>
        <h1>Let&apos;s make your math plan</h1>
        <p>Choose what you want to work on today. You can change it any time.</p>
      </div>

      <form className="setup-form" onSubmit={handleSubmit}>
        <OperationSelector onChange={setOperations} selectedOperations={operations} />
        <DifficultySelector onChange={setDifficulty} selectedDifficulty={difficulty} />
        <SessionLengthSelector
          onChange={setSessionLength}
          selectedLength={sessionLength}
        />

        <div className="setup-submit">
          {!isReady && (
            <p aria-live="polite" className="validation-message">
              Choose at least one math skill and one challenge level to begin.
            </p>
          )}
          <button
            className="button button--primary button--start"
            disabled={!isReady}
            type="submit"
          >
            Start Session <span aria-hidden="true">→</span>
          </button>
        </div>
      </form>
    </PageContainer>
  )
}
