import { Link } from 'react-router'

import { Navigation } from './Navigation'

export function Header() {
  return (
    <header className="site-header">
      <Link className="brand" to="/">
        <span aria-hidden="true" className="brand-mark">
          +
        </span>
        <span>Math Practice</span>
      </Link>
      <Navigation />
    </header>
  )
}
