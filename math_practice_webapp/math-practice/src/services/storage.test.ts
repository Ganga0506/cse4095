import { afterEach, describe, expect, it } from 'vitest'

import type { AppSettings, PracticeSetupConfig, Question } from '../types'

import {
  CURRENT_STORAGE_SCHEMA_VERSION,
  defaultSettings,
  storageService,
  STORAGE_KEY,
} from './storage'
import {
  completeSession,
  createPracticeAttempt,
  createPracticeSession,
} from './practiceSession'

const configuration: PracticeSetupConfig = {
  operations: ['addition'],
  difficulty: 1,
  sessionLength: 5,
}

const question: Question = {
  id: 'question-1',
  operation: 'addition',
  firstOperand: 3,
  secondOperand: 4,
  displayText: '3 + 4 = ?',
  correctAnswer: 7,
  choices: [7, 6, 8, 5],
  difficulty: 1,
  source: 'regular',
}

function createUnavailableStorage(): Storage {
  const unavailable = () => {
    throw new Error('Storage is unavailable')
  }

  return {
    clear: unavailable,
    getItem: unavailable,
    key: unavailable,
    length: 0,
    removeItem: unavailable,
    setItem: unavailable,
  } as unknown as Storage
}

function createFullStorage(): Storage {
  return {
    clear: () => undefined,
    getItem: () => null,
    key: () => null,
    length: 0,
    removeItem: () => undefined,
    setItem: () => {
      throw new DOMException('Storage quota exceeded', 'QuotaExceededError')
    },
  } as unknown as Storage
}

afterEach(() => {
  localStorage.clear()
})

describe('storageService', () => {
  it('uses safe defaults when no stored data exists', () => {
    expect(storageService.loadSettings()).toEqual(defaultSettings)
    expect(storageService.loadCompletedSessions()).toEqual([])
    expect(storageService.loadAttempts()).toEqual([])
  })

  it('saves and loads selected settings with a schema version', () => {
    const settings: AppSettings = {
      ...defaultSettings,
      defaultDifficulty: 3,
      defaultOperations: ['multiplication'],
      defaultSessionLength: 20,
    }

    expect(storageService.saveSettings(settings)).toBe(true)
    expect(storageService.loadSettings()).toEqual(settings)

    const savedData = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as {
      schemaVersion: number
    }
    expect(savedData.schemaVersion).toBe(CURRENT_STORAGE_SCHEMA_VERSION)
  })

  it('recovers from corrupted, invalid, or unsupported stored data', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid JSON')
    expect(storageService.loadSettings()).toEqual(defaultSettings)

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: CURRENT_STORAGE_SCHEMA_VERSION,
        settings: { ...defaultSettings, defaultDifficulty: 99 },
        sessions: [],
        attempts: [],
      }),
    )
    expect(storageService.loadSettings()).toEqual(defaultSettings)

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ schemaVersion: CURRENT_STORAGE_SCHEMA_VERSION + 1 }),
    )
    expect(storageService.loadCompletedSessions()).toEqual([])

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 0 }))
    expect(storageService.loadAttempts()).toEqual([])
  })

  it('persists completed sessions and all required attempt fields', () => {
    const session = completeSession(createPracticeSession(configuration))
    const attempt = createPracticeAttempt(session, question, 6, false)

    expect(storageService.saveAttempt(attempt)).toBe(true)
    expect(storageService.saveCompletedSession(session)).toBe(true)
    expect(storageService.loadCompletedSessions()).toEqual([session])
    expect(storageService.loadAttempts()).toEqual([attempt])

    expect(storageService.loadAttempts()[0]).toMatchObject({
      selectedAnswer: 6,
      selfReportedCorrect: false,
      operation: 'addition',
      difficulty: 1,
      sessionId: session.id,
      attemptedAt: expect.any(String),
    })
  })

  it('returns safe values when storage is unavailable or full', () => {
    const unavailableStorage = createUnavailableStorage()
    const fullStorage = createFullStorage()
    const session = completeSession(createPracticeSession(configuration))

    expect(storageService.loadSettings(unavailableStorage)).toEqual(defaultSettings)
    expect(storageService.saveSettings(defaultSettings, unavailableStorage)).toBe(false)
    expect(storageService.saveCompletedSession(session, fullStorage)).toBe(false)
  })
})
