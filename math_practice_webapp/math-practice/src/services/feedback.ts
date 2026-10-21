type FeedbackResult = 'correct' | 'incorrect'

const correctFeedback = [
  'Great job! Your careful thinking paid off.',
  'You solved it! Keep that math brain growing.',
  'Wonderful work—keep up the steady practice!',
]

const supportiveFeedback = [
  'That was a brave try. Every question helps you learn.',
  'Nice effort! You can learn something from every answer.',
  'Keep going—you are building stronger math skills.',
]

export function getFeedbackMessage(
  result: FeedbackResult,
  random: () => number = Math.random,
): string {
  const messages = result === 'correct' ? correctFeedback : supportiveFeedback
  return messages[Math.floor(random() * messages.length)]
}

export const feedbackMessages = {
  correct: correctFeedback,
  incorrect: supportiveFeedback,
}
