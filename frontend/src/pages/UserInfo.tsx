import { useAuth0 } from '@auth0/auth0-react'
import { Link, useNavigate } from 'react-router-dom'
import { FiChevronRight, FiCreditCard, FiLogOut, FiMapPin, FiPackage } from 'react-icons/fi'
import type { IconType } from 'react-icons'
import { useOverlay } from '../context/OverlayContext'

interface ManageRowProps {
  icon: IconType
  label: string
  onClick?: () => void
}

function getInitials(name?: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
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
  const navigate = useNavigate()

  return (
    <div className="p-6 pb-24">
      <button type="button" onClick={closeOverlay} className="text-sm text-gray-500 hover:underline">
        ← Back
      </button>
      <h1 className="mt-2 mb-4 text-xl font-semibold">Account</h1>
      {isLoading ? (
        <p>Loading...</p>
      ) : isAuthenticated ? (
        <div className="flex items-center gap-4">
          {user?.picture ? (
            <img src={user.picture} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover" />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gray-200 text-lg font-semibold text-gray-600">
              {getInitials(user?.name)}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate font-semibold">{user?.name}</p>
            {user?.email && <p className="truncate text-sm text-gray-500">{user.email}</p>}
          </div>
        </div>
      ) : (
        <Link
          to="/login"
          onClick={closeOverlay}
          className="block w-full rounded-md bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-blue-700"
        >
          Log in
        </Link>
      )}

      <div className="mt-6 flex flex-col gap-3 border-t border-gray-200 pt-6">
        <ManageRow icon={FiMapPin} label="Addresses" onClick={() => openOverlay('addresses')} />
        <ManageRow icon={FiPackage} label="Order History" onClick={() => { closeOverlay(); navigate('/order-history') }} />
        <ManageRow icon={FiCreditCard} label="Payment Methods" onClick={() => { closeOverlay(); navigate('/payment-methods') }} />
      </div>

      {isAuthenticated && (
        <button
          type="button"
          onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
        >
          <FiLogOut className="h-4 w-4" aria-hidden="true" />
          Log out
        </button>
      )}
    </div>
  )
}
