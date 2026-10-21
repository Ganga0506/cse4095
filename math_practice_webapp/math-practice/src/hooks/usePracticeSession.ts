import { useState } from 'react'

import type {
  PracticeAttempt,
  PracticeSession,
  PracticeSetupConfig,
  Question,
} from '../types'
import type { SelfReportedResult } from '../components/practice/QuestionCard'
import {
  applyAttempt,
  completeSession,
  createPracticeAttempt,
  createPracticeSession,
  generateNextQuestion,
  isSessionComplete,
} from '../services/practiceSession'
import { generateQuestion } from '../services/questionGenerator'
import { storageService } from '../services/storage'

export interface CompletedSession {
  session: PracticeSession
  attempts: PracticeAttempt[]
}

export type AttemptOutcome =
  { kind: 'advanced' } | { kind: 'completed'; completedSession: CompletedSession }

export function usePracticeSession(configuration: PracticeSetupConfig) {
  const [session, setSession] = useState(() => createPracticeSession(configuration))
  const [attempts, setAttempts] = useState<PracticeAttempt[]>([])
  const [storageWarning, setStorageWarning] = useState<string | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<Question>(() =>
    generateQuestion(configuration.operations, configuration.difficulty),
  )

  function recordResult(
    result: SelfReportedResult,
    selectedAnswer: number,
  ): AttemptOutcome {
    const attempt = createPracticeAttempt(
      session,
      currentQuestion,
      selectedAnswer,
      result === 'correct',
    )
    const updatedSession = applyAttempt(session, attempt)
    const updatedAttempts = [...attempts, attempt]

    if (!storageService.saveAttempt(attempt)) {
      setStorageWarning(
        'Your practice is continuing, but this answer could not be saved on this device.',
      )
    }

    if (isSessionComplete(updatedSession)) {
      const completedSession = completeSession(updatedSession)
      if (!storageService.saveCompletedSession(completedSession)) {
        setStorageWarning(
          'Your practice is continuing, but this session summary could not be saved on this device.',
        )
      }
      setSession(completedSession)
      setAttempts(updatedAttempts)
      return {
        kind: 'completed',
        completedSession: { session: completedSession, attempts: updatedAttempts },
      }
    }

    setSession(updatedSession)
    setAttempts(updatedAttempts)
    setCurrentQuestion(generateNextQuestion(configuration, currentQuestion))
    return { kind: 'advanced' }
  }

  function endSession(): CompletedSession {
    const completedSession = completeSession(session)
    if (!storageService.saveCompletedSession(completedSession)) {
      setStorageWarning(
        'Your practice is continuing, but this session summary could not be saved on this device.',
      )
    }
    setSession(completedSession)

    return { session: completedSession, attempts }
  }

  return {
    attempts,
    currentQuestion,
    endSession,
    recordResult,
    session,
    setStorageWarning,
    storageWarning,
  }
}
