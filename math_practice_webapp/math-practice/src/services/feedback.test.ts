import { describe, expect, it } from 'vitest'

import { feedbackMessages, getFeedbackMessage } from './feedback'

describe('feedback messages', () => {
  it('selects a positive message for correct answers and a supportive message after mistakes', () => {
    expect(getFeedbackMessage('correct', () => 0)).toBe(feedbackMessages.correct[0])
    expect(getFeedbackMessage('incorrect', () => 0)).toBe(feedbackMessages.incorrect[0])
  })

  it('randomizes the selected message from the appropriate set', () => {
    expect(getFeedbackMessage('correct', () => 0.99)).toBe(feedbackMessages.correct[2])
    expect(getFeedbackMessage('incorrect', () => 0.99)).toBe(
      feedbackMessages.incorrect[2],
    )
  })
})
