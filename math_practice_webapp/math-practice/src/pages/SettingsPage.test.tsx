import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'

import { storageService } from '../services/storage'

import { SettingsPage } from './SettingsPage'

afterEach(() => {
  localStorage.clear()
})

describe('SettingsPage', () => {
  it('explains that progress remains in the browser and can be cleared', () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', { name: /your privacy/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/does not collect personal information/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/stay in this browser only/i)).toBeInTheDocument()
    expect(
      screen.getByText(/permanently removes saved progress/i),
    ).toBeInTheDocument()
  })

  it('saves the encouraging feedback preference', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    )

    const feedbackToggle = screen.getByRole('checkbox', {
      name: /encouraging feedback/i,
    })
    expect(feedbackToggle).toBeChecked()

    await user.click(feedbackToggle)

    expect(feedbackToggle).not.toBeChecked()
    expect(storageService.loadSettings().feedbackEnabled).toBe(false)
  })
})
