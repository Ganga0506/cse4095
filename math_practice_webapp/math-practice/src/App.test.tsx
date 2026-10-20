import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import App from './App'

describe('App', () => {
  it('shows the application title', () => {
    render(<App />)

    expect(screen.getByRole('link', { name: /math practice/i })).toBeInTheDocument()
  })

  it('lets a student configure and start a practice session', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('link', { name: /start practice/i }))

    const startSession = screen.getByRole('button', { name: /start session/i })
    expect(startSession).toBeDisabled()

    await user.click(screen.getByRole('button', { name: /addition/i }))
    await user.click(screen.getByLabelText(/beginner/i))
    expect(startSession).toBeEnabled()

    await user.click(startSession)

    expect(
      screen.getByRole('heading', { name: /take your time—you've got this/i }),
    ).toBeInTheDocument()
    expect(screen.getByText('Question 1 of 10')).toBeInTheDocument()
  })
})
