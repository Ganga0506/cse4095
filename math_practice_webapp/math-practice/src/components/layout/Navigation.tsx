import { NavLink } from 'react-router'

const navigationItems = [
  { to: '/', label: 'Home' },
  { to: '/practice/setup', label: 'Practice' },
  { to: '/statistics', label: 'Statistics' },
  { to: '/settings', label: 'Settings' },
]

export function Navigation() {
  return (
    <nav aria-label="Main navigation">
      <ul className="navigation-list">
        {navigationItems.map(({ to, label }) => (
          <li key={to}>
            <NavLink
              className={({ isActive }) =>
                `navigation-link ${isActive ? 'navigation-link--active' : ''}`
              }
              end={to === '/'}
              to={to}
            >
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
