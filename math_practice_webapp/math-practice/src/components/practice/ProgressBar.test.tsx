import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ProgressBar } from './ProgressBar'

describe('ProgressBar', () => {
  it('announces session progress as the completed count changes', () => {
    const { rerender } = render(<ProgressBar completed={1} total={5} />)

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1')
    expect(screen.getByText('Progress: 1 of 5 questions complete')).toHaveAttribute(
      'role',
      'status',
    )

    rerender(<ProgressBar completed={2} total={5} />)

    expect(screen.getByText('Progress: 2 of 5 questions complete')).toHaveAttribute(
      'role',
      'status',
    )
  })
})
