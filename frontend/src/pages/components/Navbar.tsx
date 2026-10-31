import { useAuth0 } from '@auth0/auth0-react'
import { FiBell, FiMapPin, FiChevronDown } from 'react-icons/fi'
import { useUserLocation } from '../../context/LocationContext'
import { useOverlay } from '../../context/OverlayContext'

export default function Navbar() {
  const { address } = useUserLocation()
  const { activeOverlay, openOverlay } = useOverlay()

  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
      <button
        onClick={() => openOverlay(activeOverlay === 'addresses' ? null : 'addresses')}
        className="flex items-center gap-1 text-gray-700 min-w-0"
      >
        <FiMapPin className="w-5 h-5 flex-shrink-0" />
        <span className="truncate max-w-[120px] text-sm">{address ?? 'Locating...'}</span>
        <FiChevronDown className="w-4 h-4 flex-shrink-0" />
      </button>

      <div className="flex items-center gap-4">
        <FiBell className="w-5 h-5 text-gray-600" />
      </div>
    </nav>
  )
}
