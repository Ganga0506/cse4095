import { useState } from 'react'

import { PageContainer } from '../components/layout/PageContainer'
import type { DifficultyLevel, MathOperation, OperationStatistics } from '../types'
import { storageService } from '../services/storage'
import { calculateAccuracy, calculateStatistics } from '../services/statistics'

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
  const attempts = storageService.loadAttempts()
  const sessions = storageService
    .loadCompletedSessions()
    .slice()
    .sort(
      (first, second) =>
        Date.parse(second.completedAt ?? second.startedAt) -
        Date.parse(first.completedAt ?? first.startedAt),
    )
  const statistics = calculateStatistics(attempts)
  const overallAccuracy = calculateAccuracy(statistics.correct, statistics.attempted)
  const hasStatistics = attempts.length > 0 || sessions.length > 0

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

      {storageWarning && (
        <p aria-live="polite" className="storage-warning" role="status">
          {storageWarning}
        </p>
      )}

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
