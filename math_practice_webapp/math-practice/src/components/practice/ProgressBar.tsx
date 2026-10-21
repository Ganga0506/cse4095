interface ProgressBarProps {
  completed: number
  total: number
}

export function ProgressBar({ completed, total }: ProgressBarProps) {
  const progress = Math.min(100, Math.round((completed / total) * 100))

  return (
    <div
      aria-label="Session progress"
      aria-valuemax={total}
      aria-valuemin={0}
      aria-valuenow={completed}
      aria-valuetext={`${completed} of ${total} questions complete`}
      className="session-progress"
      role="progressbar"
    >
      <span className="sr-only">
        {completed} of {total} questions complete
      </span>
      <span className="session-progress__track">
        <span className="session-progress__fill" style={{ width: `${progress}%` }} />
      </span>
    </div>
  )
}
