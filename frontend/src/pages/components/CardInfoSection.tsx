import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { useAccount } from '../../context/AccountContext'
import { useRequireLogin } from '../../hooks/useRequireLogin'
import { fetchCards, requireToken, type SavedCard } from '../../services/accountApi'
import { DEMO_CARD_ID } from '../../utils/selectedCard'

interface CardInfoSectionProps {
  selectedCardId: string
  onSelect: (cardId: string) => void
}

export default function CardInfoSection({ selectedCardId, onSelect }: CardInfoSectionProps) {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0()
  const { account } = useAccount()
  const requireLogin = useRequireLogin()
  const navigate = useNavigate()
  const accountId = account?.id ?? null

  const [cards, setCards] = useState<SavedCard[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!accountId) return

    let isCurrent = true

    const load = async () => {
      try {
        const loaded = await fetchCards(requireToken(await getAccessTokenSilently()))
        if (isCurrent) setCards(loaded)
      } catch {
        if (isCurrent) setError('Could not load your saved cards')
      }
    }

    load()
    return () => {
      isCurrent = false
    }
  }, [accountId, getAccessTokenSilently])

  const options = [
    { id: DEMO_CARD_ID, label: 'QuickBite Demo Card', detail: 'No real payment' },
    ...(accountId ? cards : []).map((card) => ({
      id: card.id,
      label: `${card.brand.toUpperCase()} •••• ${card.last4}`,
      detail: `Expires ${card.expMonth}/${card.expYear}`,
    })),
  ]

  // A remembered card may not be available, such as after logging out.
  const activeCardId = options.some((option) => option.id === selectedCardId)
    ? selectedCardId
    : DEMO_CARD_ID

  const handleAddCard = () => {
    if (requireLogin({ type: 'add-card' })) navigate('/cards/new')
  }

  return (
    <section className="mt-6">
      <h2 className="mb-2 text-sm font-semibold text-gray-500">Card info</h2>

      <div className="flex flex-col gap-2">
        {options.map((option) => (
          <label
            key={option.id}
            className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${
              activeCardId === option.id ? 'border-blue-600' : 'border-gray-200'
            }`}
          >
            <input
              type="radio"
              name="card"
              checked={activeCardId === option.id}
              onChange={() => onSelect(option.id)}
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium">{option.label}</span>
              <span className="block text-xs text-gray-500">{option.detail}</span>
            </span>
          </label>
        ))}
      </div>

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

      <button
        type="button"
        onClick={handleAddCard}
        disabled={isAuthenticated && !accountId}
        className="mt-3 w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Add Card
      </button>
    </section>
  )
}
