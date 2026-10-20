import type { SessionLength } from '../../types'

interface SessionLengthSelectorProps {
  selectedLength: SessionLength
  onChange: (length: SessionLength) => void
}

const sessionLengths: Array<{ value: SessionLength; label: string; detail: string }> = [
  { value: 5, label: '5 questions', detail: 'A quick warm-up' },
  { value: 10, label: '10 questions', detail: 'A great daily practice' },
  { value: 20, label: '20 questions', detail: 'A bigger challenge' },
  { value: 'continuous', label: 'Keep going', detail: 'Practice until you stop' },
]

export function SessionLengthSelector({
  selectedLength,
  onChange,
}: SessionLengthSelectorProps) {
  return (
    <fieldset className="setup-section">
      <legend>3. How long do you want to practice?</legend>
      <p className="section-description">
        You can always choose a new length next time.
      </p>
      <div className="length-grid">
        {sessionLengths.map(({ value, label, detail }) => (
          <label className="length-option" key={String(value)}>
            <input
              checked={selectedLength === value}
              name="sessionLength"
              onChange={() => onChange(value)}
              type="radio"
              value={value}
            />
            <span>
              <strong>{label}</strong>
              <small>{detail}</small>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
