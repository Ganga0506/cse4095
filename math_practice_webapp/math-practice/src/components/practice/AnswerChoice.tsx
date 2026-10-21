interface AnswerChoiceProps {
  index: number
  isSelected: boolean
  isDisabled: boolean
  value: number
  onSelect: (value: number) => void
}

export function AnswerChoice({
  index,
  isSelected,
  isDisabled,
  value,
  onSelect,
}: AnswerChoiceProps) {
  return (
    <button
      aria-label={`Answer choice ${index + 1}: ${value}`}
      aria-pressed={isSelected}
      className={`answer-choice ${isSelected ? 'answer-choice--selected' : ''}`}
      disabled={isDisabled}
      onClick={() => onSelect(value)}
      type="button"
    >
      <span aria-hidden="true" className="answer-choice__number">
        {index + 1}
      </span>
      <span>{value}</span>
      {isSelected && (
        <span aria-hidden="true" className="answer-choice__selected-indicator">
          ✓ Selected
        </span>
      )}
    </button>
  )
}
