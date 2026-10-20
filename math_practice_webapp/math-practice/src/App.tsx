import { BrowserRouter } from 'react-router'

import { AppRoutes } from './app/AppRoutes'
import { Header } from './components/layout/Header'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Header />
        <AppRoutes />
      </div>
    </BrowserRouter>
  )
}

export default App
