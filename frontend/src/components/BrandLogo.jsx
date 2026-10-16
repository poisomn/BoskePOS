import { Link } from 'react-router-dom'
import Mascot from './Mascot'

function BrandLogo({ className = '', linked = false }) {
  const logo = <span role="img" aria-label="BoskePOS" className={`brand-logo brand-lockup ${className}`}>
    <Mascot size={80} />
    <svg className="brand-wordmark" viewBox="600 245 1500 310" aria-hidden="true" focusable="false">
      <image href="/brand/boskepos-logo.png" width="2172" height="724" />
    </svg>
  </span>
  return linked ? <Link to="/" aria-label="BoskePOS · Inicio">{logo}</Link> : logo
}

export default BrandLogo
