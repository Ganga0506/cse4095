import { Link } from 'react-router'

import { PageContainer } from '../components/layout/PageContainer'

export function HomePage() {
  return (
    <PageContainer className="home-page">
      <section className="home-hero" aria-labelledby="home-title">
        <p className="eyebrow">A little practice goes a long way</p>
        <h1 id="home-title">Ready to make math feel easy?</h1>
        <p className="hero-copy">
          Pick your favorite math skills, take your time, and celebrate every answer.
        </p>
        <div className="home-actions">
          <Link className="button button--primary" to="/practice/setup">
            Start Practice <span aria-hidden="true">→</span>
          </Link>
          <Link className="button button--secondary" to="/statistics">
            View Statistics
          </Link>
          <Link className="button button--secondary" to="/settings">
            Settings
          </Link>
        </div>
      </section>

      <section aria-label="How Math Practice works" className="feature-grid">
        <article className="feature-card">
          <span aria-hidden="true" className="feature-number">
            1
          </span>
          <h2>Choose a challenge</h2>
          <p>Pick the math skills and level that feel right for you.</p>
        </article>
        <article className="feature-card">
          <span aria-hidden="true" className="feature-number">
            2
          </span>
          <h2>Practice your way</h2>
          <p>Take a quick warm-up or keep going for as long as you like.</p>
        </article>
        <article className="feature-card">
          <span aria-hidden="true" className="feature-number">
            3
          </span>
          <h2>Grow with every try</h2>
          <p>Every answer is a chance to learn something new.</p>
        </article>
      </section>
    </PageContainer>
  )
}
