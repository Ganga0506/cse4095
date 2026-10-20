import { Link } from 'react-router'

import { PageContainer } from '../components/layout/PageContainer'

export function NotFoundPage() {
  return (
    <PageContainer className="placeholder-page">
      <p className="eyebrow">Oops</p>
      <h1>That page isn&apos;t here</h1>
      <p>Let&apos;s head back to the Math Practice home page.</p>
      <Link className="button button--primary" to="/">
        Return Home
      </Link>
    </PageContainer>
  )
}
