import type { DifficultyLevel } from '../../types'

interface DifficultySelectorProps {
  selectedDifficulty: DifficultyLevel | null
  onChange: (difficulty: DifficultyLevel) => void
}

const difficultyOptions: Array<{
  level: DifficultyLevel
  name: string
  description: string
}> = [
  {
    level: 1,
    name: 'Beginner',
    description:
      'Add and subtract 0–10 with no negatives, multiply factors 0–5, and divide by 1–5 with whole answers.',
  },
  {
    level: 2,
    name: 'Easy',
    description:
      'Add and subtract 0–50 with no negatives, multiply factors 0–10, and divide by 1–10 with whole answers.',
  },
  {
    level: 3,
    name: 'Intermediate',
    description:
      'Add and subtract up to 100, use 1-digit and 2-digit multiplication, and divide up to 144 with whole answers.',
  },
  {
    level: 4,
    name: 'Advanced',
    description:
      'Practice multi-digit addition and subtraction up to 1,000, plus larger multiplication and whole-number division.',
  },
]

export function DifficultySelector({
  selectedDifficulty,
  onChange,
}: DifficultySelectorProps) {
  return (
    <fieldset className="setup-section">
      <legend>2. Choose your challenge level</legend>
      <p className="section-description">Start where you feel comfortable.</p>
      <div className="choice-grid">
        {difficultyOptions.map(({ level, name, description }) => (
          <label className="choice-card" key={level}>
            <input
              checked={selectedDifficulty === level}
              name="difficulty"
              onChange={() => onChange(level)}
              type="radio"
              value={level}
            />
            <span className="choice-card__content">
              <span className="choice-card__eyebrow">Level {level}</span>
              <strong>{name}</strong>
              <span>{description}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
