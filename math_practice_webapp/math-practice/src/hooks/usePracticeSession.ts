import { useState } from 'react'

import type {
  MistakePattern,
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
import {
  prioritizeMistakePatterns,
  recordMistakePattern,
  recordReviewResult,
} from '../services/mistakePatterns'
import { generateSimilarQuestion } from '../services/similarQuestionGenerator'
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
  const [reviewPatterns] = useState<MistakePattern[]>(() =>
    configuration.mode === 'mistake-review'
      ? prioritizeMistakePatterns(storageService.loadMistakePatterns())
      : [],
  )
  const [reviewPatternIndex, setReviewPatternIndex] = useState(0)
  const [currentQuestion, setCurrentQuestion] = useState<Question>(() => {
    const firstReviewPattern = reviewPatterns[0]

    return firstReviewPattern
      ? generateSimilarQuestion(firstReviewPattern)
      : generateQuestion(configuration.operations, configuration.difficulty)
  })

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

    if (
      currentQuestion.source === 'mistake-review' &&
      currentQuestion.mistakePatternId
    ) {
      const settings = storageService.loadSettings()
      const updatedMistakePatterns = recordReviewResult(
        storageService.loadMistakePatterns(),
        currentQuestion.mistakePatternId,
        result === 'correct',
        settings.masteryThreshold,
      )

      if (!storageService.saveMistakePatterns(updatedMistakePatterns)) {
        setStorageWarning(
          'Your practice is continuing, but this review progress could not be saved.',
        )
      }
    } else if (result === 'incorrect') {
      const updatedMistakePatterns = recordMistakePattern(
        storageService.loadMistakePatterns(),
        currentQuestion,
      )

      if (!storageService.saveMistakePatterns(updatedMistakePatterns)) {
        setStorageWarning(
          'Your practice is continuing, but this missed question could not be saved for review.',
        )
      }
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
    if (reviewPatterns.length > 0) {
      const nextPatternIndex = (reviewPatternIndex + 1) % reviewPatterns.length
      const nextPattern = reviewPatterns[nextPatternIndex]
      setReviewPatternIndex(nextPatternIndex)
      setCurrentQuestion(
        generateSimilarQuestion(nextPattern, { previousQuestion: currentQuestion }),
      )
    } else {
      setCurrentQuestion(generateNextQuestion(configuration, currentQuestion))
    }
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
