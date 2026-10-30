import { useAuth0 } from '@auth0/auth0-react'
import { Link } from 'react-router-dom'

export default function Navbar() {
  const { isAuthenticated, isLoading, user, logout } = useAuth0()

  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
      <span className="text-lg font-semibold">QuickBite</span>

      <div className="flex items-center gap-4">
        {isLoading ? null : isAuthenticated ? (
          <>
            <span className="text-sm text-gray-600">{user?.name}</span>
            <button onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}>
              Log out
            </button>
          </>
        ) : (
          <Link to="/login">Log in</Link>
        )}
      </div>
    </nav>
  )
}
