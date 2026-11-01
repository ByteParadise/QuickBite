import { Link } from 'react-router-dom'
import { useCart, type CartItem, type CartRestaurant } from '../context/CartContext'
import { useOverlay } from '../context/OverlayContext'
import CartDetail from './CartDetail'

interface RestaurantGroup {
  restaurant: CartRestaurant
  items: CartItem[]
}

function groupByRestaurant(items: CartItem[]): RestaurantGroup[] {
  const groups = new Map<string, RestaurantGroup>()
  for (const item of items) {
    const group = groups.get(item.restaurant.placeId)
    if (group) {
      group.items.push(item)
    } else {
      groups.set(item.restaurant.placeId, { restaurant: item.restaurant, items: [item] })
    }
  }
  return [...groups.values()]
}

export default function Cart() {
  const { items } = useCart()
  const { closeOverlay, cartRestaurantId, openCartDetail, closeCartDetail } = useOverlay()

  const groups = groupByRestaurant(items)
  const selectedGroup = groups.find((g) => g.restaurant.placeId === cartRestaurantId)

  if (selectedGroup) {
    return (
      <CartDetail
        restaurant={selectedGroup.restaurant}
        items={selectedGroup.items}
        onBack={closeCartDetail}
      />
    )
  }

  return (
    <div className="p-6 pb-24">
      <div className="mt-2 flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Carts</h1>

        {/* Enable once order history exists. */}
        <button
          type="button"
          disabled
          className="shrink-0 text-sm font-medium text-blue-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline"
        >
          Orders
        </button>
      </div>

      <button
        type="button"
        onClick={closeOverlay}
        className="mt-1 mb-4 text-sm text-gray-500 hover:underline"
      >
        ← Back
      </button>

      

      {groups.length === 0 ? (
        <p className="text-gray-500">Your cart is empty.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {groups.map(({ restaurant, items: restaurantItems }) => {
            const itemCount = restaurantItems.reduce((sum, i) => sum + i.quantity, 0)
            const subtotal = restaurantItems.reduce((sum, i) => sum + i.price * i.quantity, 0)

            return (
              <li key={restaurant.placeId} className="rounded-lg border border-gray-200 p-4">
                <h2 className="truncate font-semibold">{restaurant.name}</h2>
                <p className="text-sm text-gray-500">
                  {itemCount} {itemCount === 1 ? 'item' : 'items'} · ${subtotal.toFixed(2)}
                </p>

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => openCartDetail(restaurant.placeId)}
                    aria-label={`View cart for ${restaurant.name}`}
                    className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    View Cart
                  </button>
                  <Link
                    to={`/restaurants/${encodeURIComponent(restaurant.placeId)}`}
                    state={{
                      name: restaurant.name,
                      address: restaurant.address,
                      lat: restaurant.lat,
                      lng: restaurant.lng,
                    }}
                    onClick={closeOverlay}
                    aria-label={`View store for ${restaurant.name}`}
                    className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-center text-sm font-medium hover:bg-gray-50"
                  >
                    View Store
                  </Link>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
