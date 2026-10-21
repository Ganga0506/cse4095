import { useState } from 'react'
import { useNavigate } from 'react-router'

import { PageContainer } from '../components/layout/PageContainer'
import type {
  AppSettings,
  DifficultyLevel,
  MathOperation,
  SessionLength,
} from '../types'
import { storageService } from '../services/storage'

const operations: Array<{ value: MathOperation; label: string }> = [
  { value: 'addition', label: 'Addition' },
  { value: 'subtraction', label: 'Subtraction' },
  { value: 'multiplication', label: 'Multiplication' },
  { value: 'division', label: 'Division' },
]

const sessionLengths: Array<{ value: SessionLength; label: string }> = [
  { value: 5, label: '5 questions' },
  { value: 10, label: '10 questions' },
  { value: 20, label: '20 questions' },
  { value: 'continuous', label: 'Keep going' },
]

const difficulties: Array<{ value: DifficultyLevel; label: string }> = [
  { value: 1, label: 'Level 1 · Beginner' },
  { value: 2, label: 'Level 2 · Easy' },
  { value: 3, label: 'Level 3 · Intermediate' },
  { value: 4, label: 'Level 4 · Advanced' },
]

export function SettingsPage() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState(() => storageService.loadSettings())
  const [storageWarning, setStorageWarning] = useState<string | null>(null)

  function saveSettings(nextSettings: AppSettings) {
    setSettings(nextSettings)

    if (storageService.saveSettings(nextSettings)) {
      setStorageWarning(null)
      return
    }

    setStorageWarning('Your change will work for now, but it could not be saved.')
  }

  function updateSettings(updates: Partial<AppSettings>) {
    saveSettings({ ...settings, ...updates })
  }

  function toggleDefaultOperation(operation: MathOperation) {
    const defaultOperations = settings.defaultOperations.includes(operation)
      ? settings.defaultOperations.filter((selected) => selected !== operation)
      : [...settings.defaultOperations, operation]

    updateSettings({ defaultOperations })
  }

  function clearAllData() {
    const confirmed = window.confirm(
      'Clear all application data? This permanently removes your settings, practice history, and saved answers. This cannot be undone.',
    )

    if (!confirmed) {
      return
    }

    if (!storageService.clear()) {
      setStorageWarning('Your application data could not be cleared on this device.')
      return
    }

    navigate('/', { replace: true })
  }

  return (
    <PageContainer className="settings-page">
      <div className="page-heading">
        <p className="eyebrow">Make it yours</p>
        <h1>Choose your practice preferences</h1>
        <p>Your choices save automatically and will be ready for your next session.</p>
      </div>

      {storageWarning && (
        <p aria-live="polite" className="storage-warning" role="status">
          {storageWarning}
        </p>
      )}

      <div className="settings-panel">
        <fieldset>
          <legend>Practice extras</legend>
          <label className="settings-toggle">
            <input
              checked={settings.soundEffectsEnabled}
              onChange={(event) =>
                updateSettings({ soundEffectsEnabled: event.target.checked })
              }
              type="checkbox"
            />
            <span>
              <strong>Sound effects</strong>
              <small>Play cheerful sounds while you practice.</small>
            </span>
          </label>
          <label className="settings-toggle">
            <input
              checked={settings.cardAnimationEnabled}
              onChange={(event) =>
                updateSettings({ cardAnimationEnabled: event.target.checked })
              }
              type="checkbox"
            />
            <span>
              <strong>Card animation</strong>
              <small>Flip the question card when you reveal your answer.</small>
            </span>
          </label>
          <label className="settings-toggle">
            <input
              checked={settings.showExplanations}
              onChange={(event) =>
                updateSettings({ showExplanations: event.target.checked })
              }
              type="checkbox"
            />
            <span>
              <strong>Show explanations</strong>
              <small>
                Show helpful hints with your answers when they are available.
              </small>
            </span>
          </label>
        </fieldset>

        <fieldset>
          <legend>Default session</legend>
          <label className="settings-select" htmlFor="default-session-length">
            Default session length
            <select
              id="default-session-length"
              onChange={(event) => {
                const value = event.target.value
                updateSettings({
                  defaultSessionLength:
                    value === 'continuous'
                      ? 'continuous'
                      : (Number(value) as 5 | 10 | 20),
                })
              }}
              value={settings.defaultSessionLength}
            >
              {sessionLengths.map(({ value, label }) => (
                <option key={String(value)} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="settings-select" htmlFor="default-difficulty">
            Default challenge level
            <select
              id="default-difficulty"
              onChange={(event) =>
                updateSettings({
                  defaultDifficulty: Number(event.target.value) as DifficultyLevel,
                })
              }
              value={settings.defaultDifficulty}
            >
              {difficulties.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="settings-select" htmlFor="mastery-threshold">
            Correct review answers to master a pattern
            <input
              id="mastery-threshold"
              max={10}
              min={1}
              onChange={(event) =>
                updateSettings({
                  masteryThreshold: Math.min(
                    10,
                    Math.max(1, Number(event.target.value) || 1),
                  ),
                })
              }
              type="number"
              value={settings.masteryThreshold}
            />
          </label>
        </fieldset>

        <fieldset>
          <legend>Default math skills</legend>
          <p className="section-description">
            Choose what should be selected when you start a new session.
          </p>
          <div className="settings-operation-grid">
            {operations.map(({ value, label }) => (
              <label className="settings-operation" key={value}>
                <input
                  checked={settings.defaultOperations.includes(value)}
                  onChange={() => toggleDefaultOperation(value)}
                  type="checkbox"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <section className="danger-zone">
        <div>
          <h2>Clear all application data</h2>
          <p>
            This removes every saved setting, session, and answer from this browser.
          </p>
        </div>
        <button className="button button--danger" onClick={clearAllData} type="button">
          Clear All Application Data
        </button>
      </section>
    </PageContainer>
  )
}
