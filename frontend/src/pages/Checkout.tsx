import { lazy, Suspense, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useUserLocation } from '../context/LocationContext'
import { useOverlay } from '../context/OverlayContext'
import CardInfoSection from './components/CardInfoSection'
import { loadSelectedCardId, saveSelectedCardId } from '../utils/selectedCard'

const LocationMap = lazy(() => import('./components/LocationMap'))

export default function Checkout() {
  const { placeId } = useParams()
  const { items } = useCart()
  const { lat, lng, address, isAddressComplete, loading, error } = useUserLocation()
  const { openOverlay, openCartDetail } = useOverlay()
  const navigate = useNavigate()
  const [selectedCardId, setSelectedCardId] = useState(loadSelectedCardId)

  const handleSelectCard = (cardId: string) => {
    setSelectedCardId(cardId)
    saveSelectedCardId(cardId)
  }

  const orderItems = items.filter((item) => item.restaurant.placeId === placeId)
  const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

  if (orderItems.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Checkout</h1>
        <p className="mt-2 text-gray-500">There are no items to check out.</p>
        <Link to="/" className="mt-4 inline-block text-sm font-medium text-blue-600 hover:underline">
          Back to restaurants
        </Link>
      </div>
    )
  }

  const backToCart = () => {
    openCartDetail(orderItems[0].restaurant.placeId)
    openOverlay('cart')
    // Leave the checkout route so closing the cart can't reveal this page again.
    navigate('/', { replace: true })
  }

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <button type="button" onClick={backToCart} className="text-sm text-gray-500 hover:underline">
          ← Back to Cart
        </button>
        <h1 className="mt-2 text-xl font-semibold">Checkout</h1>

        <section className="mt-4">
          <h2 className="mb-2 text-sm font-semibold text-gray-500">Delivering to</h2>
          {lat !== null && lng !== null ? (
            <Suspense fallback={<div className="h-48 w-full rounded-lg bg-gray-100" />}>
              <LocationMap lat={lat} lng={lng} label="Delivery location" />
            </Suspense>
          ) : (
            <p className="text-sm text-gray-500">
              {loading ? 'Locating...' : error ?? 'Location unavailable'}
            </p>
          )}
          {address && <p className="mt-2 text-sm">{address}</p>}
          {!isAddressComplete && (
            <div className="mt-2">
              <p className="text-sm text-red-500">A full street address is needed for delivery.</p>
              <button
                type="button"
                onClick={() => openOverlay('addresses')}
                className="mt-1 text-sm font-medium text-blue-600 hover:underline"
              >
                Choose an address
              </button>
            </div>
          )}
        </section>

        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-gray-500">Order summary</h2>
          <p className="font-medium">{orderItems[0].restaurant.name}</p>
          <ul className="mt-2 flex flex-col gap-2">
            {orderItems.map((item) => (
              <li key={item.id} className="flex justify-between gap-4 text-sm">
                <span className="min-w-0">{item.quantity} × {item.title}</span>
                <span className="shrink-0">${(item.price * item.quantity).toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </section>

        <CardInfoSection selectedCardId={selectedCardId} onSelect={handleSelectCard} />
      </div>

      <div className="shrink-0 border-t border-gray-200 bg-white px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between font-semibold">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>

        {/* Enable once order-service accepts these orders. */}
        <button
          type="button"
          disabled
          className="mt-3 w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Place Order
        </button>
      </div>
    </div>
  )
}
