import { lazy, Suspense, type ReactNode } from 'react'
import { Route, Routes } from 'react-router'

import { PageContainer } from '../components/layout/PageContainer'
import { HomePage } from '../pages/HomePage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { PracticeSessionPage } from '../pages/PracticeSessionPage'
import { PracticeSetupPage } from '../pages/PracticeSetupPage'
import { SessionSummaryPage } from '../pages/SessionSummaryPage'

const StatisticsPage = lazy(async () => {
  const module = await import('../pages/StatisticsPage')
  return { default: module.StatisticsPage }
})

const SettingsPage = lazy(async () => {
  const module = await import('../pages/SettingsPage')
  return { default: module.SettingsPage }
})

function LazyPage({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <PageContainer>
          <p aria-live="polite">Loading your page…</p>
        </PageContainer>
      }
    >
      {children}
    </Suspense>
  )
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/practice/setup" element={<PracticeSetupPage />} />
      <Route path="/practice/session" element={<PracticeSessionPage />} />
      <Route path="/practice/summary" element={<SessionSummaryPage />} />
      <Route
        path="/statistics"
        element={
          <LazyPage>
            <StatisticsPage />
          </LazyPage>
        }
      />
      <Route
        path="/settings"
        element={
          <LazyPage>
            <SettingsPage />
          </LazyPage>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
