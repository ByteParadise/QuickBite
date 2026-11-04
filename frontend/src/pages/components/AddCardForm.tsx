import { useEffect, useState, type FormEvent } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import {
  createCardSetup,
  recordCard,
  requireToken,
  type SavedCard,
} from '../../services/accountApi'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

interface AddCardFormProps {
  onAdded: (card: SavedCard) => void
  onCancel: () => void
}

function CardFields({ onAdded, onCancel }: AddCardFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const { getAccessTokenSilently } = useAuth0()
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!stripe || !elements || isSaving) return

    setIsSaving(true)
    setError(null)

    try {
      const result = await stripe.confirmSetup({
        elements,
        redirect: 'if_required',
        confirmParams: { return_url: window.location.href },
      })
      if (result.error) {
        setError(result.error.message ?? 'Could not save this card.')
        return
      }

      const token = requireToken(await getAccessTokenSilently())
      onAdded(await recordCard(token, result.setupIntent.id))
    } catch {
      setError('Could not save this card. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3">
      <PaymentElement />
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || isSaving}
          className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Card'}
        </button>
      </div>
    </form>
  )
}

export default function AddCardForm(props: AddCardFormProps) {
  const { getAccessTokenSilently } = useAuth0()
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isCurrent = true

    const start = async () => {
      try {
        const secret = await createCardSetup(requireToken(await getAccessTokenSilently()))
        if (isCurrent) setClientSecret(secret)
      } catch {
        if (isCurrent) setError('Could not start adding a card. Please try again.')
      }
    }

    start()
    return () => {
      isCurrent = false
    }
  }, [getAccessTokenSilently])

  if (error) return <p className="mt-3 text-sm text-red-500">{error}</p>
  if (!clientSecret) return <p className="mt-3 text-sm text-gray-500">Loading...</p>

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CardFields {...props} />
    </Elements>
  )
}
