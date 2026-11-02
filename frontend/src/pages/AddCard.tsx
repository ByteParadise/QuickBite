import { lazy, Suspense } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { useAccount } from '../context/AccountContext'
import { saveSelectedCardId } from '../utils/selectedCard'
import type { SavedCard } from '../services/accountApi'

const AddCardForm = lazy(() => import('./components/AddCardForm'))

export default function AddCard() {
  const { isAuthenticated, isLoading } = useAuth0()
  const { account, error } = useAccount()
  const navigate = useNavigate()
  const location = useLocation()

  // A directly opened page has no earlier entry in this app to go back to.
  const goBack = () => {
    if (location.key === 'default') navigate('/', { replace: true })
    else navigate(-1)
  }

  const handleAdded = (card: SavedCard) => {
    saveSelectedCardId(card.id)
    goBack()
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <button type="button" onClick={goBack} className="text-sm text-gray-500 hover:underline">
        ← Back
      </button>
      <h1 className="mt-2 mb-4 text-xl font-semibold">Add Card</h1>

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : !isAuthenticated ? (
        <Link
          to="/login"
          state={{ returnTo: { path: location.pathname, state: location.state } }}
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          Log in to add a card
        </Link>
      ) : error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : !account ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <Suspense fallback={<p className="text-sm text-gray-500">Loading...</p>}>
          <AddCardForm onAdded={handleAdded} onCancel={goBack} />
        </Suspense>
      )}
    </div>
  )
}
