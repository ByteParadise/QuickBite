import { useAuth0 } from '@auth0/auth0-react'
import { Link } from 'react-router-dom'
import { useOverlay } from '../context/OverlayContext'

export default function UserInfo() {
  const { isAuthenticated, isLoading, user, logout } = useAuth0()
  const { closeOverlay } = useOverlay()

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Account</h1>
      {isLoading ? (
        <p>Loading...</p>
      ) : isAuthenticated ? (
        <>
          <p>{user?.name}</p>
          <button
            onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
            className="mt-4 text-sm text-gray-600 hover:underline"
          >
            Log out
          </button>
        </>
      ) : (
        <Link to="/login" onClick={closeOverlay} className="text-blue-600 hover:underline">Log in</Link>
      )}
    </div>
  )
}
