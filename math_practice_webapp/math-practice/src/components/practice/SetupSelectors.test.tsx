import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { DifficultySelector } from './DifficultySelector'
import { OperationSelector } from './OperationSelector'

describe('practice setup selectors', () => {
  it('selects operations individually and with the mixed-operations shortcut', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { rerender } = render(
      <OperationSelector onChange={onChange} selectedOperations={[]} />,
    )

    await user.click(screen.getByRole('button', { name: /addition/i }))
    expect(onChange).toHaveBeenLastCalledWith(['addition'])

    rerender(
      <OperationSelector onChange={onChange} selectedOperations={['addition']} />,
    )
    expect(screen.getByRole('button', { name: /addition/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await user.click(
      screen.getByRole('button', { name: /mixed operations: select all/i }),
    )
    expect(onChange).toHaveBeenLastCalledWith([
      'addition',
      'subtraction',
      'multiplication',
      'division',
    ])
  })

  it('selects exactly one difficulty level and keeps its description available', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { rerender } = render(
      <DifficultySelector onChange={onChange} selectedDifficulty={null} />,
    )

    expect(
      screen.getByText(/multiply factors 0–5, and divide by 1–5/i),
    ).toBeInTheDocument()

    await user.click(screen.getByLabelText(/intermediate/i))
    expect(onChange).toHaveBeenCalledWith(3)

    rerender(<DifficultySelector onChange={onChange} selectedDifficulty={3} />)
    expect(screen.getByLabelText(/intermediate/i)).toBeChecked()
    expect(screen.getByLabelText(/beginner/i)).not.toBeChecked()
  })
})
