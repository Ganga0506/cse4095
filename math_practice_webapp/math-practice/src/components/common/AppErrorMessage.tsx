import { Link } from 'react-router'

type AppErrorKind = 'missing-session' | 'storage'

interface AppErrorMessageProps {
  kind: AppErrorKind
  inline?: boolean
}

const errorContent: Record<AppErrorKind, { title: string; message: string }> = {
  'missing-session': {
    title: 'Let’s start a new practice session',
    message:
      'We couldn’t find a practice session to continue. Pick your math plan and we’ll get you going.',
  },
  storage: {
    title: 'Your device couldn’t save that change',
    message:
      'You can keep practicing, but your progress may not be ready the next time you visit.',
  },
}

export function AppErrorMessage({ kind, inline = false }: AppErrorMessageProps) {
  const { message, title } = errorContent[kind]
  const Heading = inline ? 'h2' : 'h1'

  return (
    <section
      aria-live="assertive"
      className={`app-error-message ${inline ? 'app-error-message--inline' : ''}`}
      role="alert"
    >
      <p className="eyebrow">Let’s fix this together</p>
      <Heading>{title}</Heading>
      <p>{message}</p>
      {!inline && (
        <Link className="button button--primary" to="/">
          Return Home
        </Link>
      )}
    </section>
  )
}
