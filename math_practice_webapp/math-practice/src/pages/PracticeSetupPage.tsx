import { type FormEvent, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { DifficultySelector } from '../components/practice/DifficultySelector'
import { OperationSelector } from '../components/practice/OperationSelector'
import { SessionLengthSelector } from '../components/practice/SessionLengthSelector'
import { PageContainer } from '../components/layout/PageContainer'
import type {
  DifficultyLevel,
  MathOperation,
  PracticeMode,
  SessionLength,
} from '../types'
import { getActiveMistakePatterns } from '../services/mistakePatterns'
import { storageService } from '../services/storage'

export function PracticeSetupPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [settings] = useState(() => storageService.loadSettings())
  const [activeMistakePatterns] = useState(() =>
    getActiveMistakePatterns(storageService.loadMistakePatterns()),
  )
  const requestedMode = (location.state as { mode?: PracticeMode } | null)?.mode
  const [mode, setMode] = useState<PracticeMode>(requestedMode ?? 'regular')
  const [operations, setOperations] = useState<MathOperation[]>(
    () => settings.defaultOperations,
  )
  const [difficulty, setDifficulty] = useState<DifficultyLevel | null>(
    () => settings.defaultDifficulty,
  )
  const [sessionLength, setSessionLength] = useState<SessionLength>(
    () => settings.defaultSessionLength,
  )
  const isReviewMode = mode === 'mistake-review'
  const isReady = isReviewMode
    ? activeMistakePatterns.length > 0
    : operations.length > 0 && difficulty !== null

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!isReady || (!isReviewMode && difficulty === null)) {
      return
    }

    const reviewOperations = [
      ...new Set(activeMistakePatterns.map((pattern) => pattern.operation)),
    ]
    const reviewDifficulty = activeMistakePatterns[0]?.difficulty

    if (isReviewMode && (!reviewDifficulty || reviewOperations.length === 0)) {
      return
    }

    navigate('/practice/session', {
      state: {
        configuration: {
          operations: isReviewMode ? reviewOperations : operations,
          difficulty: isReviewMode ? reviewDifficulty : difficulty,
          sessionLength,
          mode,
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
        <fieldset className="setup-section review-mode-selector">
          <legend>Choose your practice mode</legend>
          <div className="review-mode-grid">
            <label className="choice-card">
              <input
                checked={!isReviewMode}
                name="practice-mode"
                onChange={() => setMode('regular')}
                type="radio"
                value="regular"
              />
              <span className="choice-card__content">
                <strong>Regular practice</strong>
                <span>Choose the math skills and challenge level you want today.</span>
              </span>
            </label>
            <label className="choice-card">
              <input
                checked={isReviewMode}
                disabled={activeMistakePatterns.length === 0}
                name="practice-mode"
                onChange={() => setMode('mistake-review')}
                type="radio"
                value="mistake-review"
              />
              <span className="choice-card__content">
                <strong>Practice mistakes</strong>
                <span>
                  Review similar questions from {activeMistakePatterns.length} active{' '}
                  {activeMistakePatterns.length === 1
                    ? 'mistake pattern'
                    : 'mistake patterns'}
                  .
                </span>
              </span>
            </label>
          </div>
          {activeMistakePatterns.length === 0 && (
            <p aria-live="polite" className="validation-message">
              Practice mistakes unlocks after you mark a question as wrong in a regular
              session.
            </p>
          )}
        </fieldset>

        {isReviewMode ? (
          <section className="review-mode-note">
            <h2>Ready to review your tricky questions?</h2>
            <p>
              We&apos;ll mix questions from your active mistake patterns and celebrate
              each one you master.
            </p>
          </section>
        ) : (
          <>
            <OperationSelector
              onChange={setOperations}
              selectedOperations={operations}
            />
            <DifficultySelector
              onChange={setDifficulty}
              selectedDifficulty={difficulty}
            />
          </>
        )}
        <SessionLengthSelector
          onChange={setSessionLength}
          selectedLength={sessionLength}
        />

        <div className="setup-submit">
          {!isReady && (
            <p aria-live="polite" className="validation-message">
              {isReviewMode
                ? 'Add an active mistake pattern before starting review practice.'
                : 'Choose at least one math skill and one challenge level to begin.'}
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
