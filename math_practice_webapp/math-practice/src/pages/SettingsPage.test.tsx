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
