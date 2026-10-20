import { useState } from 'react'

import type { Question } from '../../types'

import { AnswerChoice } from './AnswerChoice'

export type SelfReportedResult = 'correct' | 'incorrect'

interface QuestionCardProps {
  question: Question
  currentQuestion: number
  totalQuestions?: number
  animationEnabled?: boolean
  onResult?: (result: SelfReportedResult) => void
}

function formatQuestionWithAnswer(question: Question) {
  return question.displayText.replace('?', String(question.correctAnswer))
}

export function QuestionCard({ question, ...props }: QuestionCardProps) {
  return <QuestionCardContent key={question.id} question={question} {...props} />
}

function QuestionCardContent({
  question,
  currentQuestion,
  totalQuestions,
  animationEnabled = true,
  onResult,
}: QuestionCardProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [isCardFlipped, setIsCardFlipped] = useState(false)
  const [recordedResult, setRecordedResult] = useState<SelfReportedResult | null>(null)

  function handleFlip() {
    if (selectedAnswer !== null) {
      setIsCardFlipped(true)
    }
  }

  function handleResult(result: SelfReportedResult) {
    if (recordedResult !== null) {
      return
    }

    setRecordedResult(result)
    onResult?.(result)
  }

  const questionProgress = totalQuestions
    ? `Question ${currentQuestion} of ${totalQuestions}`
    : `Question ${currentQuestion}`
  const cardClassName = [
    'question-card',
    isCardFlipped ? 'question-card--flipped' : '',
    animationEnabled ? '' : 'question-card--no-animation',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section aria-label={questionProgress} className="question-card-scene">
      <p className="question-progress">{questionProgress}</p>
      <div className={cardClassName}>
        <div className="question-card__inner">
          <section
            aria-hidden={isCardFlipped}
            className="question-card__face question-card__face--front"
            inert={isCardFlipped}
          >
            <p className="card-kicker">Solve this problem</p>
            <p className="math-question">{question.displayText}</p>
            <div aria-label="Answer choices" className="answer-choice-grid">
              {question.choices.map((choice, index) => (
                <AnswerChoice
                  index={index}
                  isDisabled={isCardFlipped}
                  isSelected={selectedAnswer === choice}
                  key={choice}
                  onSelect={setSelectedAnswer}
                  value={choice}
                />
              ))}
            </div>
            <button
              aria-expanded={isCardFlipped}
              className="button button--primary flip-button"
              disabled={selectedAnswer === null}
              onClick={handleFlip}
              type="button"
            >
              Flip Card <span aria-hidden="true">↻</span>
            </button>
          </section>

          <section
            aria-hidden={!isCardFlipped}
            className="question-card__face question-card__face--back"
            inert={!isCardFlipped}
          >
            <p className="card-kicker">Check your answer</p>
            <p className="math-answer">{formatQuestionWithAnswer(question)}</p>
            <div className="answer-review">
              <p>
                <span>Correct answer</span>
                <strong>{question.correctAnswer}</strong>
              </p>
              <p>
                <span>Your answer</span>
                <strong>{selectedAnswer}</strong>
              </p>
            </div>
            <p className="answer-explanation">
              Look at the numbers and operation carefully. Every try helps your math
              brain grow!
            </p>
            <div className="result-actions">
              <button
                className="button result-button result-button--right"
                disabled={recordedResult !== null}
                onClick={() => handleResult('correct')}
                type="button"
              >
                I Got It Right
              </button>
              <button
                className="button result-button result-button--wrong"
                disabled={recordedResult !== null}
                onClick={() => handleResult('incorrect')}
                type="button"
              >
                I Got It Wrong
              </button>
            </div>
            {recordedResult && (
              <p className="result-confirmation" role="status">
                {recordedResult === 'correct'
                  ? 'Nice work!'
                  : 'Keep practicing—you are improving!'}
              </p>
            )}
          </section>
        </div>
      </div>
      <p aria-live="polite" className="sr-only">
        {isCardFlipped
          ? `The answer is revealed. The correct answer is ${question.correctAnswer}.`
          : ''}
      </p>
    </section>
  )
}
