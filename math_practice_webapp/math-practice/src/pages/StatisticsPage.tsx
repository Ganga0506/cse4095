import { useState } from 'react'

import { PageContainer } from '../components/layout/PageContainer'
import { AppErrorMessage } from '../components/common/AppErrorMessage'
import type {
  DifficultyLevel,
  MathOperation,
  MistakePattern,
  OperationStatistics,
} from '../types'
import { storageService } from '../services/storage'
import {
  calculateAccuracy,
  calculateMistakeStatistics,
  calculateStatistics,
} from '../services/statistics'

const operations: Array<{ value: MathOperation; label: string }> = [
  { value: 'addition', label: 'Addition' },
  { value: 'subtraction', label: 'Subtraction' },
  { value: 'multiplication', label: 'Multiplication' },
  { value: 'division', label: 'Division' },
]

const difficulties: Array<{ value: DifficultyLevel; label: string }> = [
  { value: 1, label: 'Level 1 · Beginner' },
  { value: 2, label: 'Level 2 · Easy' },
  { value: 3, label: 'Level 3 · Intermediate' },
  { value: 4, label: 'Level 4 · Advanced' },
]

function formatSessionDate(date: string): string {
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

const operationSymbols: Record<MathOperation, string> = {
  addition: '+',
  subtraction: '−',
  multiplication: '×',
  division: '÷',
}

function formatFact(pattern: MistakePattern): string {
  return `${pattern.firstOperand} ${operationSymbols[pattern.operation]} ${pattern.secondOperand} = ${pattern.correctAnswer}`
}

function StatisticsCard({
  label,
  statistics,
}: {
  label: string
  statistics: OperationStatistics
}) {
  const accuracy = calculateAccuracy(statistics.correct, statistics.attempted)

  return (
    <article className="statistics-card">
      <h3>{label}</h3>
      <p className="statistics-card__accuracy">{accuracy}% accurate</p>
      <dl className="statistics-card__details">
        <div>
          <dt>Attempted</dt>
          <dd>{statistics.attempted}</dd>
        </div>
        <div>
          <dt>Correct</dt>
          <dd>{statistics.correct}</dd>
        </div>
        <div>
          <dt>Incorrect</dt>
          <dd>{statistics.incorrect}</dd>
        </div>
      </dl>
    </article>
  )
}

export function StatisticsPage() {
  const [, setRevision] = useState(0)
  const [storageWarning, setStorageWarning] = useState<string | null>(null)
  const [mistakeView, setMistakeView] = useState<'active' | 'mastered'>('active')
  const attempts = storageService.loadAttempts()
  const mistakePatterns = storageService.loadMistakePatterns()
  const settings = storageService.loadSettings()
  const sessions = storageService
    .loadCompletedSessions()
    .slice()
    .sort(
      (first, second) =>
        Date.parse(second.completedAt ?? second.startedAt) -
        Date.parse(first.completedAt ?? first.startedAt),
    )
  const statistics = calculateStatistics(attempts)
  const mistakeStatistics = calculateMistakeStatistics(mistakePatterns, attempts)
  const overallAccuracy = calculateAccuracy(statistics.correct, statistics.attempted)
  const hasStatistics = attempts.length > 0 || sessions.length > 0
  const hasMistakes = mistakePatterns.length > 0
  const displayedPatterns = mistakeStatistics.sortedPatterns.filter((pattern) =>
    mistakeView === 'active' ? !pattern.mastered : pattern.mastered,
  )

  function resetStatistics() {
    const confirmed = window.confirm(
      'Reset all practice statistics? Your completed sessions and answers will be permanently removed. Your settings will stay the same.',
    )

    if (!confirmed) {
      return
    }

    if (storageService.clearStatistics()) {
      setStorageWarning(null)
      setRevision((currentRevision) => currentRevision + 1)
      return
    }

    setStorageWarning('Your statistics could not be reset on this device.')
  }

  return (
    <PageContainer className="statistics-page">
      <div className="page-heading statistics-page__heading">
        <div>
          <p className="eyebrow">Your progress</p>
          <h1>See how far you&apos;ve come</h1>
          <p>Every practice question helps your math muscles grow.</p>
        </div>
        <button
          className="button button--danger"
          disabled={!hasStatistics}
          onClick={resetStatistics}
          type="button"
        >
          Reset Statistics
        </button>
      </div>

      {storageWarning && <AppErrorMessage kind="storage" inline />}

      {!hasStatistics && (
        <section className="empty-state">
          <h2>Your progress will appear here</h2>
          <p>Finish a practice session to see your results by skill and level.</p>
        </section>
      )}

      <section
        aria-labelledby="overall-statistics-heading"
        className="statistics-section"
      >
        <div className="section-heading">
          <h2 id="overall-statistics-heading">Overall progress</h2>
          <p>Keep going—small steps add up.</p>
        </div>
        <div className="overall-statistics" role="list">
          <div role="listitem">
            <span>Attempted</span>
            <strong>{statistics.attempted}</strong>
          </div>
          <div role="listitem">
            <span>Correct</span>
            <strong>{statistics.correct}</strong>
          </div>
          <div role="listitem">
            <span>Incorrect</span>
            <strong>{statistics.incorrect}</strong>
          </div>
          <div role="listitem">
            <span>Accuracy</span>
            <strong>{overallAccuracy}%</strong>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="operation-statistics-heading"
        className="statistics-section"
      >
        <div className="section-heading">
          <h2 id="operation-statistics-heading">By math skill</h2>
          <p>See which kind of math you&apos;ve been practicing.</p>
        </div>
        <div className="statistics-card-grid">
          {operations.map(({ value, label }) => (
            <StatisticsCard
              key={value}
              label={label}
              statistics={statistics.byOperation[value]}
            />
          ))}
        </div>
      </section>

      <section
        aria-labelledby="difficulty-statistics-heading"
        className="statistics-section"
      >
        <div className="section-heading">
          <h2 id="difficulty-statistics-heading">By challenge level</h2>
          <p>Notice how you&apos;re growing at every level.</p>
        </div>
        <div className="statistics-card-grid">
          {difficulties.map(({ value, label }) => (
            <StatisticsCard
              key={value}
              label={label}
              statistics={statistics.byDifficulty[value]}
            />
          ))}
        </div>
      </section>

      <section
        aria-labelledby="mistake-statistics-heading"
        className="statistics-section"
      >
        <div className="section-heading">
          <h2 id="mistake-statistics-heading">Mistake review</h2>
          <p>Use these clues to focus on the facts that need another try.</p>
        </div>

        <div className="overall-statistics mistake-statistics" role="list">
          <div role="listitem">
            <span>Active patterns</span>
            <strong>{mistakeStatistics.activePatternCount}</strong>
          </div>
          <div role="listitem">
            <span>Mastered patterns</span>
            <strong>{mistakeStatistics.masteredPatternCount}</strong>
          </div>
          <div role="listitem">
            <span>Similar questions practiced</span>
            <strong>{mistakeStatistics.similarQuestionsPracticed}</strong>
          </div>
          <div role="listitem">
            <span>Review questions correct</span>
            <strong>{mistakeStatistics.reviewQuestionsCorrect}</strong>
          </div>
        </div>

        {!hasMistakes ? (
          <div className="empty-state empty-state--compact">
            <h3>No mistake patterns yet</h3>
            <p>
              Mark a regular-practice question as wrong to save it here for a helpful
              review later.
            </p>
          </div>
        ) : (
          <>
            <div className="mistake-insight-grid">
              <article className="mistake-insight">
                <h3>Most missed skill</h3>
                <p>
                  {mistakeStatistics.mostMissedOperations
                    .map(
                      (operation) =>
                        operations.find(({ value }) => value === operation)?.label,
                    )
                    .join(' and ')}
                </p>
              </article>
              <article className="mistake-insight">
                <h3>Tricky number facts</h3>
                <ul>
                  {mistakeStatistics.mostMissedFacts.map((pattern) => (
                    <li key={pattern.id}>{formatFact(pattern)}</li>
                  ))}
                </ul>
              </article>
            </div>

            <div className="mistake-details-heading">
              <div>
                <h3>Mistake details</h3>
                <p>Patterns are sorted by how often they have been missed.</p>
              </div>
              <div aria-label="Mistake pattern view" className="mistake-view-tabs">
                <button
                  aria-pressed={mistakeView === 'active'}
                  className="button button--secondary"
                  onClick={() => setMistakeView('active')}
                  type="button"
                >
                  Active ({mistakeStatistics.activePatternCount})
                </button>
                <button
                  aria-pressed={mistakeView === 'mastered'}
                  className="button button--secondary"
                  onClick={() => setMistakeView('mastered')}
                  type="button"
                >
                  Mastered ({mistakeStatistics.masteredPatternCount})
                </button>
              </div>
            </div>

            {displayedPatterns.length === 0 ? (
              <div className="empty-state empty-state--compact">
                <p>
                  {mistakeView === 'active'
                    ? 'Every saved pattern is mastered right now—nice work!'
                    : 'Keep practicing similar questions to master your first pattern.'}
                </p>
              </div>
            ) : (
              <div className="mistake-pattern-list">
                {displayedPatterns.map((pattern) => {
                  const progress = Math.min(
                    pattern.similarCorrectCount,
                    settings.masteryThreshold,
                  )

                  return (
                    <article className="mistake-pattern" key={pattern.id}>
                      <div>
                        <h4>{formatFact(pattern)}</h4>
                        <p>
                          Last incorrect {formatSessionDate(pattern.lastIncorrectAt)}
                        </p>
                      </div>
                      <dl>
                        <div>
                          <dt>Incorrect</dt>
                          <dd>{pattern.incorrectCount}</dd>
                        </div>
                        <div>
                          <dt>Mastery progress</dt>
                          <dd>
                            {progress} / {settings.masteryThreshold}
                          </dd>
                        </div>
                      </dl>
                    </article>
                  )
                })}
              </div>
            )}
          </>
        )}
      </section>

      <section aria-labelledby="recent-sessions-heading" className="statistics-section">
        <div className="section-heading">
          <h2 id="recent-sessions-heading">Recent sessions</h2>
          <p>Your newest sessions appear first.</p>
        </div>
        {sessions.length === 0 ? (
          <div className="empty-state empty-state--compact">
            <p>No completed sessions yet. Your next one will show up here.</p>
          </div>
        ) : (
          <div className="recent-session-list">
            {sessions.map((session) => (
              <article className="recent-session" key={session.id}>
                <div>
                  <h3>{formatSessionDate(session.completedAt ?? session.startedAt)}</h3>
                  <p>
                    {session.operations
                      .map(
                        (operation) =>
                          operations.find(({ value }) => value === operation)?.label,
                      )
                      .join(', ')}
                    {' · '}
                    {
                      difficulties.find(({ value }) => value === session.difficulty)
                        ?.label
                    }
                  </p>
                </div>
                <dl>
                  <div>
                    <dt>Attempted</dt>
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
                    <dt>Accuracy</dt>
                    <dd>{calculateAccuracy(session.correct, session.attempted)}%</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </section>
    </PageContainer>
  )
}
