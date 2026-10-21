import type {
  ActivePracticeState,
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

export const CURRENT_STORAGE_SCHEMA_VERSION = 5
export const STORAGE_KEY = 'math-practice:data'
export const MAX_STORED_SESSIONS = 50

interface StoredAppData {
  schemaVersion: number
  settings: AppSettings
  sessions: PracticeSession[]
  attempts: PracticeAttempt[]
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
    Array.isArray(value.mistakePatterns) &&
    value.mistakePatterns.every(isValidMistakePattern) &&
    (value.activePractice === null || isValidActivePracticeState(value.activePractice))
  )
}

function migrateStoredData(value: unknown): StoredAppData | null {
  if (!isRecord(value) || !isNonNegativeInteger(value.schemaVersion)) {
    return null
  }

  if (value.schemaVersion > CURRENT_STORAGE_SCHEMA_VERSION) {
    return null
  }

  let migratedData = value

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

  const recoveredData = {
    ...migratedData,
    mistakePatterns: Array.isArray(migratedData.mistakePatterns)
      ? migratedData.mistakePatterns.filter(isValidMistakePattern)
      : [],
    activePractice: isValidActivePracticeState(migratedData.activePractice)
      ? migratedData.activePractice
      : null,
  }

  return isValidStoredData(recoveredData) ? recoveredData : null
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
    return migrateStoredData(parsedData) ?? createDefaultData()
  } catch {
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
  } catch {
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
    return writeData({ ...data, attempts: [], sessions: [] }, storage)
  },

  loadAttempts(storage?: Storage | null): PracticeAttempt[] {
    return readData(storage).attempts
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
    return writeData(
      { ...data, attempts: replaceById(data.attempts, attempt) },
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
