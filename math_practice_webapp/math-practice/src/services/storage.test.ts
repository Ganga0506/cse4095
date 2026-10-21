import { afterEach, describe, expect, it } from 'vitest'

import type {
  ActivePracticeState,
  AppSettings,
  MistakePattern,
  PracticeSetupConfig,
  Question,
} from '../types'

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
  mode: 'regular',
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

const mistakePattern: MistakePattern = {
  id: 'mistake-1',
  operation: 'addition',
  firstOperand: 3,
  secondOperand: 4,
  correctAnswer: 7,
  difficulty: 1,
  incorrectCount: 1,
  similarCorrectCount: 0,
  lastIncorrectAt: '2026-10-21T10:00:00.000Z',
  mastered: false,
}

function createActivePractice(): ActivePracticeState {
  return {
    configuration,
    session: createPracticeSession(configuration),
    attempts: [],
    currentQuestion: question,
    selectedAnswer: 6,
    reviewPatterns: [],
    reviewPatternIndex: 0,
  }
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

  it('migrates v1 data and filters invalid mistake patterns without losing valid data', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        settings: defaultSettings,
        sessions: [],
        attempts: [],
      }),
    )
    expect(storageService.loadSettings()).toEqual(defaultSettings)
    expect(storageService.loadMistakePatterns()).toEqual([])

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: CURRENT_STORAGE_SCHEMA_VERSION,
        settings: defaultSettings,
        sessions: [],
        attempts: [],
        mistakePatterns: [mistakePattern, { id: 'not-a-complete-pattern' }],
      }),
    )
    expect(storageService.loadSettings()).toEqual(defaultSettings)
    expect(storageService.loadMistakePatterns()).toEqual([mistakePattern])
  })

  it('migrates the former mastery threshold to the new default of three', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 2,
        settings: { ...defaultSettings, masteryThreshold: 80 },
        sessions: [],
        attempts: [],
        mistakePatterns: [],
      }),
    )

    expect(storageService.loadSettings().masteryThreshold).toBe(3)
  })

  it('migrates existing settings with encouraging feedback enabled', () => {
    const legacySettings = { ...defaultSettings }
    Reflect.deleteProperty(legacySettings, 'feedbackEnabled')
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 3,
        settings: legacySettings,
        sessions: [],
        attempts: [],
        mistakePatterns: [],
      }),
    )

    expect(storageService.loadSettings().feedbackEnabled).toBe(true)
    expect(storageService.loadActivePractice()).toBeNull()
  })

  it('persists a validated active session and safely drops an invalid snapshot', () => {
    const activePractice = createActivePractice()

    expect(storageService.saveActivePractice(activePractice)).toBe(true)
    expect(storageService.loadActivePractice()).toEqual(activePractice)

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: CURRENT_STORAGE_SCHEMA_VERSION,
        settings: defaultSettings,
        sessions: [],
        attempts: [],
        mistakePatterns: [],
        activePractice: { ...activePractice, selectedAnswer: 99 },
      }),
    )

    expect(storageService.loadActivePractice()).toBeNull()
    expect(storageService.loadSettings()).toEqual(defaultSettings)
  })

  it('persists validated mistake patterns', () => {
    expect(storageService.saveMistakePatterns([mistakePattern])).toBe(true)
    expect(storageService.loadMistakePatterns()).toEqual([mistakePattern])
    expect(
      storageService.saveMistakePatterns([{ id: 'invalid' } as MistakePattern]),
    ).toBe(false)
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

  it('resets statistics without changing settings, then clears all app data', () => {
    const settings: AppSettings = {
      ...defaultSettings,
      defaultDifficulty: 4,
      defaultOperations: ['division'],
    }
    const session = completeSession(createPracticeSession(configuration))
    const attempt = createPracticeAttempt(session, question, 7, true)

    storageService.saveSettings(settings)
    storageService.saveAttempt(attempt)
    storageService.saveCompletedSession(session)
    storageService.saveMistakePatterns([mistakePattern])
    storageService.saveActivePractice(createActivePractice())

    expect(storageService.clearStatistics()).toBe(true)
    expect(storageService.loadSettings()).toEqual(settings)
    expect(storageService.loadAttempts()).toEqual([])
    expect(storageService.loadCompletedSessions()).toEqual([])
    expect(storageService.loadMistakePatterns()).toEqual([mistakePattern])
    expect(storageService.loadActivePractice()).not.toBeNull()

    expect(storageService.clear()).toBe(true)
    expect(storageService.loadSettings()).toEqual(defaultSettings)
    expect(storageService.loadMistakePatterns()).toEqual([])
    expect(storageService.loadActivePractice()).toBeNull()
  })

  it('clears only the active session snapshot when a session ends', () => {
    const activePractice = createActivePractice()
    storageService.saveActivePractice(activePractice)
    storageService.saveSettings({ ...defaultSettings, defaultDifficulty: 3 })

    expect(storageService.clearActivePractice()).toBe(true)
    expect(storageService.loadActivePractice()).toBeNull()
    expect(storageService.loadSettings().defaultDifficulty).toBe(3)
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
