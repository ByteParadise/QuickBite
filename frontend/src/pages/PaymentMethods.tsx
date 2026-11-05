import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { deleteCard, fetchCards, requireToken, type SavedCard } from '../services/accountApi'

export default function PaymentMethods() {
  const { isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0()
  const navigate = useNavigate()
  const location = useLocation()
  const [cards, setCards] = useState<SavedCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const goBack = () => {
    if (location.key === 'default') navigate('/', { replace: true })
    else navigate(-1)
  }

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    let isCurrent = true
    const load = async () => {
      try {
        const loaded = await fetchCards(requireToken(await getAccessTokenSilently()))
        if (isCurrent) setCards(loaded)
      } catch {
        if (isCurrent) setError('Could not load your saved cards')
      } finally {
        if (isCurrent) setLoading(false)
      }
    }

    load()
    return () => {
      isCurrent = false
    }
  }, [isAuthenticated, getAccessTokenSilently])

  const handleDelete = async (cardId: string) => {
    setDeletingId(cardId)
    try {
      await deleteCard(requireToken(await getAccessTokenSilently()), cardId)
      setCards((prev) => prev.filter((c) => c.id !== cardId))
    } catch {
      setError('Could not remove this card')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="p-6 pb-24">
      <button type="button" onClick={goBack} className="text-sm text-gray-500 hover:underline">
        ← Back
      </button>
      <h1 className="mt-2 mb-4 text-xl font-semibold">Payment Methods</h1>

      {isLoading || loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : !isAuthenticated ? (
        <Link to="/login" className="text-sm font-medium text-blue-600 hover:underline">
          Log in to manage your payments
        </Link>
      ) : (
        <>
          {error && <p className="mb-3 text-sm text-red-500">{error}</p>}
          {cards.length === 0 ? (
            <p className="text-sm text-gray-500">No saved cards yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {cards.map((card) => (
                <li
                  key={card.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3"
                >
                  <span className="min-w-0 text-sm">
                    {card.brand.toUpperCase()} •••• {card.last4}
                    <span className="block text-xs text-gray-500">
                      Expires {card.expMonth}/{card.expYear}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(card.id)}
                    disabled={deletingId === card.id}
                    className="shrink-0 text-sm font-medium text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deletingId === card.id ? 'Removing...' : 'Remove'}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <Link
            to="/cards/new"
            className="mt-4 block w-full rounded-md border border-gray-300 px-4 py-2 text-center text-sm font-medium hover:bg-gray-50"
          >
            Add Card
          </Link>
        </>
      )}
    </div>
  )
}
