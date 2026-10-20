import type { MathOperation } from '../../types'

interface OperationSelectorProps {
  selectedOperations: MathOperation[]
  onChange: (operations: MathOperation[]) => void
}

const operationOptions: Array<{
  value: MathOperation
  label: string
  symbol: string
}> = [
  { value: 'addition', label: 'Addition', symbol: '+' },
  { value: 'subtraction', label: 'Subtraction', symbol: '−' },
  { value: 'multiplication', label: 'Multiplication', symbol: '×' },
  { value: 'division', label: 'Division', symbol: '÷' },
]

export function OperationSelector({
  selectedOperations,
  onChange,
}: OperationSelectorProps) {
  const hasAllOperations = selectedOperations.length === operationOptions.length

  function toggleOperation(operation: MathOperation) {
    const isSelected = selectedOperations.includes(operation)
    onChange(
      isSelected
        ? selectedOperations.filter((selected) => selected !== operation)
        : [...selectedOperations, operation],
    )
  }

  function toggleAllOperations() {
    onChange(hasAllOperations ? [] : operationOptions.map(({ value }) => value))
  }

  return (
    <fieldset className="setup-section">
      <legend>1. Pick the math you want to practice</legend>
      <p className="section-description">Choose one kind of math or mix them up.</p>
      <button
        aria-pressed={hasAllOperations}
        className="mixed-button"
        onClick={toggleAllOperations}
        type="button"
      >
        {hasAllOperations ? 'Clear all' : 'Mixed operations: select all'}
      </button>
      <div className="operation-grid">
        {operationOptions.map(({ value, label, symbol }) => {
          const isSelected = selectedOperations.includes(value)

          return (
            <button
              aria-pressed={isSelected}
              className={`operation-button ${isSelected ? 'is-selected' : ''}`}
              key={value}
              onClick={() => toggleOperation(value)}
              type="button"
            >
              <span aria-hidden="true" className="operation-symbol">
                {symbol}
              </span>
              {label}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
