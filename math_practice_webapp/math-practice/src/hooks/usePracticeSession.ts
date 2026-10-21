import { useEffect, useState } from 'react'

import type {
  MistakePattern,
  ActivePracticeState,
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

export function usePracticeSession(
  configuration: PracticeSetupConfig,
  restoredPractice: ActivePracticeState | null = null,
) {
  const [session, setSession] = useState(
    () => restoredPractice?.session ?? createPracticeSession(configuration),
  )
  const [attempts, setAttempts] = useState<PracticeAttempt[]>(
    () => restoredPractice?.attempts ?? [],
  )
  const [storageWarning, setStorageWarning] = useState<string | null>(null)
  const [reviewPatterns] = useState<MistakePattern[]>(
    () =>
      restoredPractice?.reviewPatterns ??
      (configuration.mode === 'mistake-review'
        ? prioritizeMistakePatterns(storageService.loadMistakePatterns())
        : []),
  )
  const [reviewPatternIndex, setReviewPatternIndex] = useState(
    () => restoredPractice?.reviewPatternIndex ?? 0,
  )
  const [currentQuestion, setCurrentQuestion] = useState<Question>(() => {
    if (restoredPractice) {
      return restoredPractice.currentQuestion
    }

    const firstReviewPattern = reviewPatterns[0]

    return firstReviewPattern
      ? generateSimilarQuestion(firstReviewPattern)
      : generateQuestion(configuration.operations, configuration.difficulty)
  })
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(
    () => restoredPractice?.selectedAnswer ?? null,
  )

  useEffect(() => {
    if (!session.isActive) {
      return
    }

    storageService.saveActivePractice({
      configuration,
      session,
      attempts,
      currentQuestion,
      selectedAnswer,
      reviewPatterns,
      reviewPatternIndex,
    })
  }, [
    attempts,
    configuration,
    currentQuestion,
    reviewPatternIndex,
    reviewPatterns,
    selectedAnswer,
    session,
  ])

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
      if (!storageService.clearActivePractice()) {
        setStorageWarning(
          'Your session is complete, but its saved in-progress copy could not be cleared.',
        )
      }
      setSession(completedSession)
      setAttempts(updatedAttempts)
      setSelectedAnswer(null)
      return {
        kind: 'completed',
        completedSession: { session: completedSession, attempts: updatedAttempts },
      }
    }

    setSession(updatedSession)
    setAttempts(updatedAttempts)
    setSelectedAnswer(null)
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
    if (!storageService.clearActivePractice()) {
      setStorageWarning(
        'Your session is complete, but its saved in-progress copy could not be cleared.',
      )
    }
    setSession(completedSession)
    setSelectedAnswer(null)

    return { session: completedSession, attempts }
  }

  return {
    attempts,
    currentQuestion,
    endSession,
    recordResult,
    selectedAnswer,
    session,
    setSelectedAnswer,
    setStorageWarning,
    storageWarning,
  }
}
