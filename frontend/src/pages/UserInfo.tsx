import { useAuth0 } from '@auth0/auth0-react'
import { Link } from 'react-router-dom'
import { FiChevronRight, FiCreditCard, FiMapPin, FiPackage } from 'react-icons/fi'
import type { IconType } from 'react-icons'
import { useOverlay } from '../context/OverlayContext'

interface ManageRowProps {
  icon: IconType
  label: string
  onClick?: () => void
}

/** Rows without an onClick are disabled until their page exists. */
function ManageRow({ icon: Icon, label, onClick }: ManageRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-4 text-left hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
    >
      <Icon className="h-5 w-5 shrink-0 text-gray-500" aria-hidden="true" />
      <span className="min-w-0 flex-1 text-sm font-medium">{label}</span>
      <FiChevronRight className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
    </button>
  )
}

export default function UserInfo() {
  const { isAuthenticated, isLoading, user, logout } = useAuth0()
  const { closeOverlay, openOverlay } = useOverlay()

  return (
    <div className="p-6 pb-24">
      <button type="button" onClick={closeOverlay} className="text-sm text-gray-500 hover:underline">
        ← Back
      </button>
      <h1 className="mt-2 mb-4 text-xl font-semibold">Account</h1>
      {isLoading ? (
        <p>Loading...</p>
      ) : isAuthenticated ? (
        <p>{user?.name}</p>
      ) : (
        <Link to="/login" onClick={closeOverlay} className="text-blue-600 hover:underline">Log in</Link>
      )}

      <div className="mt-6 flex flex-col gap-3">
        <ManageRow icon={FiMapPin} label="Manage addresses" onClick={() => openOverlay('addresses')} />
        <ManageRow icon={FiPackage} label="Manage orders" />
        <ManageRow icon={FiCreditCard} label="Manage payments" />
      </div>

      {isAuthenticated && (
        <button
          onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
          className="mt-6 text-sm text-gray-600 hover:underline"
        >
          Log out
        </button>
      )}
    </div>
  )
}
