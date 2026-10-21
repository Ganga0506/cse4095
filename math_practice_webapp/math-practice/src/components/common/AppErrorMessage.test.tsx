import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { AppErrorMessage } from './AppErrorMessage'

describe('AppErrorMessage', () => {
  it('offers a friendly, safe way home for a missing session', () => {
    render(
      <MemoryRouter>
        <AppErrorMessage kind="missing-session" />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', { name: /let’s start a new practice session/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /return home/i })).toHaveAttribute(
      'href',
      '/',
    )
  })

  it('uses a simple storage message without technical details', () => {
    render(
      <MemoryRouter>
        <AppErrorMessage inline kind="storage" />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', {
        name: /your device couldn’t save that change/i,
      }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/stack|error:/i)).not.toBeInTheDocument()
  })
})
