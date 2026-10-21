import type {
  ActivePracticeState,
  ArchivedAttemptStatistics,
  AppSettings,
  DifficultyLevel,
  MathOperation,
  MistakePattern,
  PracticeAttempt,
  PracticeSession,
  PracticeSetupConfig,
  Question,
  SessionLength,
} from '../types'
import { logDevelopmentError } from '../utils/developmentLog'
import {
  createEmptyArchivedAttemptStatistics,
  mergeArchivedAttemptStatistics,
  summarizeAttempts,
} from './statistics'

export const CURRENT_STORAGE_SCHEMA_VERSION = 6
export const STORAGE_KEY = 'math-practice:data'
export const MAX_STORED_SESSIONS = 25
export const MAX_STORED_ATTEMPTS = 1_000

interface StoredAppData {
  schemaVersion: number
  settings: AppSettings
  sessions: PracticeSession[]
  attempts: PracticeAttempt[]
  archivedAttemptStatistics: ArchivedAttemptStatistics
  mistakePatterns: MistakePattern[]
  activePractice: ActivePracticeState | null
}

type StoredRecord = Record<string, unknown>
type StorageMigration = (data: StoredRecord) => StoredRecord | null

const validOperations: MathOperation[] = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
]
const validDifficulties: DifficultyLevel[] = [1, 2, 3, 4]
const validSessionLengths: SessionLength[] = [5, 10, 20, 'continuous']

// Add a migration here whenever the stored schema changes. Each key migrates
// the matching version to the next version.
const migrations: Record<number, StorageMigration> = {
  1: (data) => ({ ...data, schemaVersion: 2, mistakePatterns: [] }),
  2: (data) => ({
    ...data,
    schemaVersion: 3,
    settings: isRecord(data.settings)
      ? { ...data.settings, masteryThreshold: defaultSettings.masteryThreshold }
      : data.settings,
  }),
  3: (data) => ({
    ...data,
    schemaVersion: 4,
    settings: isRecord(data.settings)
      ? { ...data.settings, feedbackEnabled: defaultSettings.feedbackEnabled }
      : data.settings,
  }),
  4: (data) => ({ ...data, schemaVersion: 5, activePractice: null }),
  5: (data) => ({
    ...data,
    schemaVersion: 6,
    archivedAttemptStatistics: createEmptyArchivedAttemptStatistics(),
  }),
}

export const defaultSettings: AppSettings = {
  soundEffectsEnabled: true,
  cardAnimationEnabled: true,
  showExplanations: true,
  feedbackEnabled: true,
  defaultSessionLength: 10,
  defaultDifficulty: 1,
  defaultOperations: [],
  masteryThreshold: 3,
}

function createDefaultData(): StoredAppData {
  return {
    schemaVersion: CURRENT_STORAGE_SCHEMA_VERSION,
    settings: { ...defaultSettings, defaultOperations: [] },
    sessions: [],
    attempts: [],
    archivedAttemptStatistics: createEmptyArchivedAttemptStatistics(),
    mistakePatterns: [],
    activePractice: null,
  }
}

function isRecord(value: unknown): value is StoredRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isOperation(value: unknown): value is MathOperation {
  return validOperations.includes(value as MathOperation)
}

function isDifficulty(value: unknown): value is DifficultyLevel {
  return validDifficulties.includes(value as DifficultyLevel)
}

function isSessionLength(value: unknown): value is SessionLength {
  return validSessionLengths.includes(value as SessionLength)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && typeof value === 'number' && value >= 0
}

function isValidTimestamp(value: unknown): value is string {
  return isNonEmptyString(value) && !Number.isNaN(Date.parse(value))
}

export function isValidSettings(value: unknown): value is AppSettings {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.soundEffectsEnabled === 'boolean' &&
    typeof value.cardAnimationEnabled === 'boolean' &&
    typeof value.showExplanations === 'boolean' &&
    typeof value.feedbackEnabled === 'boolean' &&
    isSessionLength(value.defaultSessionLength) &&
    isDifficulty(value.defaultDifficulty) &&
    Array.isArray(value.defaultOperations) &&
    value.defaultOperations.every(isOperation) &&
    isFiniteNumber(value.masteryThreshold) &&
    value.masteryThreshold >= 1 &&
    value.masteryThreshold <= 100
  )
}

export function isValidPracticeSession(value: unknown): value is PracticeSession {
  if (!isRecord(value)) {
    return false
  }

  return (
    isNonEmptyString(value.id) &&
    isValidTimestamp(value.startedAt) &&
    (value.completedAt === undefined || isValidTimestamp(value.completedAt)) &&
    Array.isArray(value.operations) &&
    value.operations.length > 0 &&
    value.operations.every(isOperation) &&
    isDifficulty(value.difficulty) &&
    isSessionLength(value.sessionLength) &&
    isNonNegativeInteger(value.attempted) &&
    isNonNegativeInteger(value.correct) &&
    isNonNegativeInteger(value.incorrect) &&
    isNonNegativeInteger(value.currentQuestionIndex) &&
    typeof value.isActive === 'boolean'
  )
}

export function isValidPracticeAttempt(value: unknown): value is PracticeAttempt {
  if (!isRecord(value)) {
    return false
  }

  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.questionId) &&
    isOperation(value.operation) &&
    isFiniteNumber(value.firstOperand) &&
    isFiniteNumber(value.secondOperand) &&
    isFiniteNumber(value.correctAnswer) &&
    isFiniteNumber(value.selectedAnswer) &&
    typeof value.selfReportedCorrect === 'boolean' &&
    isDifficulty(value.difficulty) &&
    (value.source === 'regular' || value.source === 'mistake-review') &&
    (value.mistakePatternId === undefined ||
      isNonEmptyString(value.mistakePatternId)) &&
    isValidTimestamp(value.attemptedAt) &&
    isNonEmptyString(value.sessionId)
  )
}

export function isValidMistakePattern(value: unknown): value is MistakePattern {
  if (!isRecord(value)) {
    return false
  }

  return (
    isNonEmptyString(value.id) &&
    isOperation(value.operation) &&
    isFiniteNumber(value.firstOperand) &&
    isFiniteNumber(value.secondOperand) &&
    isFiniteNumber(value.correctAnswer) &&
    isDifficulty(value.difficulty) &&
    isNonNegativeInteger(value.incorrectCount) &&
    isNonNegativeInteger(value.similarCorrectCount) &&
    isValidTimestamp(value.lastIncorrectAt) &&
    typeof value.mastered === 'boolean'
  )
}

function isValidOperationStatistics(value: unknown): boolean {
  return (
    isRecord(value) &&
    isNonNegativeInteger(value.attempted) &&
    isNonNegativeInteger(value.correct) &&
    isNonNegativeInteger(value.incorrect) &&
    value.attempted === value.correct + value.incorrect
  )
}

export function isValidArchivedAttemptStatistics(
  value: unknown,
): value is ArchivedAttemptStatistics {
  if (!isRecord(value) || !isRecord(value.appStatistics)) {
    return false
  }

  const statistics = value.appStatistics
  const operationStatistics = statistics.byOperation
  const difficultyStatistics = statistics.byDifficulty
  return (
    isNonNegativeInteger(statistics.attempted) &&
    isNonNegativeInteger(statistics.correct) &&
    isNonNegativeInteger(statistics.incorrect) &&
    statistics.attempted === statistics.correct + statistics.incorrect &&
    isRecord(operationStatistics) &&
    validOperations.every((operation) =>
      isValidOperationStatistics(operationStatistics[operation]),
    ) &&
    isRecord(difficultyStatistics) &&
    validDifficulties.every((difficulty) =>
      isValidOperationStatistics(difficultyStatistics[difficulty]),
    ) &&
    isNonNegativeInteger(value.mistakeReviewAttempted) &&
    isNonNegativeInteger(value.mistakeReviewCorrect) &&
    value.mistakeReviewCorrect <= value.mistakeReviewAttempted
  )
}

function isValidPracticeSetup(value: unknown): value is PracticeSetupConfig {
  if (!isRecord(value)) {
    return false
  }

  return (
    Array.isArray(value.operations) &&
    (value.mode === 'mistake-review' || value.operations.length > 0) &&
    value.operations.every(isOperation) &&
    isDifficulty(value.difficulty) &&
    isSessionLength(value.sessionLength) &&
    (value.mode === 'regular' || value.mode === 'mistake-review')
  )
}

function isValidQuestion(value: unknown): value is Question {
  if (!isRecord(value)) {
    return false
  }

  return (
    isNonEmptyString(value.id) &&
    isOperation(value.operation) &&
    isFiniteNumber(value.firstOperand) &&
    isFiniteNumber(value.secondOperand) &&
    isNonEmptyString(value.displayText) &&
    isFiniteNumber(value.correctAnswer) &&
    Array.isArray(value.choices) &&
    value.choices.length === 4 &&
    value.choices.every(isFiniteNumber) &&
    new Set(value.choices).size === value.choices.length &&
    isDifficulty(value.difficulty) &&
    (value.source === 'regular' || value.source === 'mistake-review') &&
    (value.mistakePatternId === undefined || isNonEmptyString(value.mistakePatternId))
  )
}

export function isValidActivePracticeState(
  value: unknown,
): value is ActivePracticeState {
  if (!isRecord(value)) {
    return false
  }

  return (
    isValidPracticeSetup(value.configuration) &&
    isValidPracticeSession(value.session) &&
    value.session.isActive &&
    Array.isArray(value.attempts) &&
    value.attempts.every(isValidPracticeAttempt) &&
    isValidQuestion(value.currentQuestion) &&
    (value.selectedAnswer === null ||
      (isFiniteNumber(value.selectedAnswer) &&
        value.currentQuestion.choices.includes(value.selectedAnswer))) &&
    Array.isArray(value.reviewPatterns) &&
    value.reviewPatterns.every(isValidMistakePattern) &&
    isNonNegativeInteger(value.reviewPatternIndex)
  )
}

function isValidStoredData(value: unknown): value is StoredAppData {
  if (!isRecord(value)) {
    return false
  }

  return (
    value.schemaVersion === CURRENT_STORAGE_SCHEMA_VERSION &&
    isValidSettings(value.settings) &&
    Array.isArray(value.sessions) &&
    value.sessions.every(isValidPracticeSession) &&
    Array.isArray(value.attempts) &&
    value.attempts.every(isValidPracticeAttempt) &&
    isValidArchivedAttemptStatistics(value.archivedAttemptStatistics) &&
    Array.isArray(value.mistakePatterns) &&
    value.mistakePatterns.every(isValidMistakePattern) &&
    (value.activePractice === null || isValidActivePracticeState(value.activePractice))
  )
}

interface StorageRecovery {
  data: StoredAppData
  shouldRewrite: boolean
}

function recoverArray<T>(
  value: unknown,
  validator: (item: unknown) => item is T,
  category: string,
): { items: T[]; wasReset: boolean } {
  if (Array.isArray(value) && value.every(validator)) {
    return { items: value as T[], wasReset: false }
  }

  logDevelopmentError(`Reset invalid stored ${category}.`)
  return { items: [], wasReset: true }
}

function recoverStoredData(value: unknown): StorageRecovery | null {
  if (!isRecord(value) || !isNonNegativeInteger(value.schemaVersion)) {
    return null
  }

  if (value.schemaVersion > CURRENT_STORAGE_SCHEMA_VERSION) {
    return null
  }

  let migratedData = value
  let shouldRewrite = value.schemaVersion !== CURRENT_STORAGE_SCHEMA_VERSION

  for (
    let version = migratedData.schemaVersion as number;
    version < CURRENT_STORAGE_SCHEMA_VERSION;
    version += 1
  ) {
    const migrate = migrations[version]
    if (!migrate) {
      return null
    }

    const nextData = migrate(migratedData)
    if (!nextData) {
      return null
    }

    migratedData = nextData
  }

  const settings = isValidSettings(migratedData.settings)
    ? migratedData.settings
    : { ...defaultSettings, defaultOperations: [] }
  if (!isValidSettings(migratedData.settings)) {
    logDevelopmentError('Reset invalid stored settings.')
    shouldRewrite = true
  }

  const sessions = recoverArray(
    migratedData.sessions,
    isValidPracticeSession,
    'completed sessions',
  )
  const attempts = recoverArray(
    migratedData.attempts,
    isValidPracticeAttempt,
    'practice attempts',
  )
  const archivedAttemptStatistics = isValidArchivedAttemptStatistics(
    migratedData.archivedAttemptStatistics,
  )
    ? migratedData.archivedAttemptStatistics
    : createEmptyArchivedAttemptStatistics()
  const hasValidArchivedAttemptStatistics = isValidArchivedAttemptStatistics(
    migratedData.archivedAttemptStatistics,
  )
  if (!hasValidArchivedAttemptStatistics) {
    logDevelopmentError('Reset invalid archived attempt statistics.')
    shouldRewrite = true
  }
  const mistakePatterns = recoverArray(
    migratedData.mistakePatterns,
    isValidMistakePattern,
    'mistake patterns',
  )
  const activePractice = isValidActivePracticeState(migratedData.activePractice)
    ? migratedData.activePractice
    : null
  if (migratedData.activePractice !== null && activePractice === null) {
    logDevelopmentError('Reset an invalid saved active session.')
    shouldRewrite = true
  }

  const recoveredData = {
    ...migratedData,
    settings,
    sessions: sessions.items,
    attempts: attempts.items,
    archivedAttemptStatistics,
    mistakePatterns: mistakePatterns.items,
    activePractice,
  }

  if (!isValidStoredData(recoveredData)) {
    return null
  }

  return {
    data: recoveredData,
    shouldRewrite:
      shouldRewrite ||
      sessions.wasReset ||
      attempts.wasReset ||
      !hasValidArchivedAttemptStatistics ||
      mistakePatterns.wasReset,
  }
}

function getBrowserStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

function readData(storage: Storage | null = getBrowserStorage()): StoredAppData {
  if (!storage) {
    return createDefaultData()
  }

  try {
    const serializedData = storage.getItem(STORAGE_KEY)
    if (!serializedData) {
      return createDefaultData()
    }

    const parsedData: unknown = JSON.parse(serializedData)
    const recovered = recoverStoredData(parsedData)
    if (!recovered) {
      logDevelopmentError('Reset all stored data because its format was unsupported.')
      return createDefaultData()
    }

    if (recovered.shouldRewrite) {
      writeData(recovered.data, storage)
    }

    return recovered.data
  } catch (error) {
    logDevelopmentError('Could not read stored practice data.', error)
    return createDefaultData()
  }
}

function writeData(
  data: StoredAppData,
  storage: Storage | null = getBrowserStorage(),
): boolean {
  if (!storage) {
    return false
  }

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(data))
    return true
  } catch (error) {
    logDevelopmentError('Could not save practice data.', error)
    return false
  }
}

function replaceById<T extends { id: string }>(items: T[], item: T): T[] {
  const existingIndex = items.findIndex((existingItem) => existingItem.id === item.id)

  if (existingIndex === -1) {
    return [...items, item]
  }

  return items.map((existingItem) =>
    existingItem.id === item.id ? item : existingItem,
  )
}

export const storageService = {
  getStorageUsage(storage: Storage | null = getBrowserStorage()): {
    bytes: number
    kilobytes: number
  } {
    if (!storage) {
      return { bytes: 0, kilobytes: 0 }
    }

    try {
      const data = storage.getItem(STORAGE_KEY) ?? ''
      const bytes = new Blob([data]).size
      return { bytes, kilobytes: Number((bytes / 1024).toFixed(2)) }
    } catch (error) {
      logDevelopmentError('Could not measure stored practice data.', error)
      return { bytes: 0, kilobytes: 0 }
    }
  },

  clear(storage: Storage | null = getBrowserStorage()): boolean {
    if (!storage) {
      return false
    }

    try {
      storage.removeItem(STORAGE_KEY)
      return true
    } catch {
      return false
    }
  },

  clearStatistics(storage?: Storage | null): boolean {
    const data = readData(storage)
    return writeData(
      {
        ...data,
        attempts: [],
        archivedAttemptStatistics: createEmptyArchivedAttemptStatistics(),
        sessions: [],
      },
      storage,
    )
  },

  loadAttempts(storage?: Storage | null): PracticeAttempt[] {
    return readData(storage).attempts
  },

  loadArchivedAttemptStatistics(
    storage?: Storage | null,
  ): ArchivedAttemptStatistics {
    return readData(storage).archivedAttemptStatistics
  },

  loadActivePractice(storage?: Storage | null): ActivePracticeState | null {
    return readData(storage).activePractice
  },

  loadCompletedSessions(storage?: Storage | null): PracticeSession[] {
    return readData(storage).sessions
  },

  loadMistakePatterns(storage?: Storage | null): MistakePattern[] {
    return readData(storage).mistakePatterns
  },

  loadSettings(storage?: Storage | null): AppSettings {
    return readData(storage).settings
  },

  saveAttempt(attempt: PracticeAttempt, storage?: Storage | null): boolean {
    if (!isValidPracticeAttempt(attempt)) {
      return false
    }

    const data = readData(storage)
    const updatedAttempts = replaceById(data.attempts, attempt)
    const overflowCount = Math.max(0, updatedAttempts.length - MAX_STORED_ATTEMPTS)
    const archivedAttempts = updatedAttempts.slice(0, overflowCount)
    return writeData(
      {
        ...data,
        attempts: updatedAttempts.slice(overflowCount),
        archivedAttemptStatistics:
          archivedAttempts.length > 0
            ? mergeArchivedAttemptStatistics(
                data.archivedAttemptStatistics,
                summarizeAttempts(archivedAttempts),
              )
            : data.archivedAttemptStatistics,
      },
      storage,
    )
  },

  saveActivePractice(
    activePractice: ActivePracticeState,
    storage?: Storage | null,
  ): boolean {
    if (!isValidActivePracticeState(activePractice)) {
      return false
    }

    const data = readData(storage)
    return writeData({ ...data, activePractice }, storage)
  },

  clearActivePractice(storage?: Storage | null): boolean {
    const data = readData(storage)
    return writeData({ ...data, activePractice: null }, storage)
  },

  saveCompletedSession(session: PracticeSession, storage?: Storage | null): boolean {
    if (!isValidPracticeSession(session) || !session.completedAt || session.isActive) {
      return false
    }

    const data = readData(storage)
    return writeData(
      {
        ...data,
        sessions: replaceById(data.sessions, session).slice(-MAX_STORED_SESSIONS),
      },
      storage,
    )
  },

  saveMistakePatterns(
    mistakePatterns: MistakePattern[],
    storage?: Storage | null,
  ): boolean {
    if (!mistakePatterns.every(isValidMistakePattern)) {
      return false
    }

    const data = readData(storage)
    return writeData({ ...data, mistakePatterns }, storage)
  },

  saveSettings(settings: AppSettings, storage?: Storage | null): boolean {
    if (!isValidSettings(settings)) {
      return false
    }

    const data = readData(storage)
    return writeData({ ...data, settings }, storage)
  },
}
