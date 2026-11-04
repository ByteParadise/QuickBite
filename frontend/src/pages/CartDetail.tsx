import { Link } from 'react-router-dom'
import { useOverlay } from '../context/OverlayContext'
import { useCart, type CartItem, type CartRestaurant } from '../context/CartContext'
import QuantityStepper from './components/QuantityStepper'

interface CartDetailProps {
  restaurant: CartRestaurant
  items: CartItem[]
  onBack: () => void
}

export default function CartDetail({ restaurant, items, onBack }: CartDetailProps) {
  const { addItem, removeItem } = useCart()
  const { closeOverlay } = useOverlay()

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <button type="button" onClick={onBack} className="text-sm text-gray-500 hover:underline">
          ← Back
        </button>
        <h1 className="mt-2 text-xl font-semibold">{restaurant.name}</h1>
        {restaurant.address && (
          <p className="text-sm text-gray-500">{restaurant.address}</p>
        )}
        <div className="mb-4" />

        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 p-3"
            >
              <div className="min-w-0">
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-gray-500">${(item.price * item.quantity).toFixed(2)}</p>
              </div>
              <QuantityStepper
                itemName={item.title}
                quantity={item.quantity}
                onIncrease={() =>
                  addItem({ id: item.id, title: item.title, price: item.price, restaurant })
                }
                onDecrease={() => removeItem(restaurant.placeId, item.id)}
              />
            </li>
          ))}
        </ul>
        <Link
          to={`/restaurants/${encodeURIComponent(restaurant.placeId)}`}
          state={{
            name: restaurant.name,
            address: restaurant.address,
            lat: restaurant.lat,
            lng: restaurant.lng,
            cameFromCart: 'cartDetail',
          }}
          onClick={closeOverlay}
          className="mt-3 block rounded-md border border-gray-300 px-4 py-2 text-center text-sm font-medium hover:bg-gray-50"
        >
          + Add Item
        </Link>
      </div>

      <div className="shrink-0 border-t border-gray-200 bg-white px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between font-semibold">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>

        <Link
          to={`/checkout/${encodeURIComponent(restaurant.placeId)}`}
          onClick={closeOverlay}
          className="mt-3 block w-full rounded-md bg-blue-600 px-4 py-3 text-center text-sm font-medium text-white hover:bg-blue-700"
        >
          Go to Checkout
        </Link>
      </div>
    </div>
  )
}
