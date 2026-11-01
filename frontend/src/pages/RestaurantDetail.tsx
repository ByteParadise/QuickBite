import { useEffect, useState } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import Navbar from "./components/Navbar";
import { useCart, type CartRestaurant } from "../context/CartContext";
import QuantityStepper from "./components/QuantityStepper";
import MenuItemImage from "./components/MenuItemImage";
import RestaurantMeta from "./components/RestaurantMeta";

interface MenuItem {
  id: number
  title: string
  image: string
  price: number
}

interface RestaurantLinkState {
  name?: string
  address?: string | null
  lat?: number
  lng?: number
}

export default function RestaurantDetail() {
  const { placeId } = useParams()
  const location = useLocation()
  const state = location.state as RestaurantLinkState | null
  const name = state?.name
  const restaurant: CartRestaurant | null = placeId && name
    ? {
        placeId,
        name,
        address: state?.address ?? null,
        lat: state?.lat ?? null,
        lng: state?.lng ?? null,
      }
    : null

  const { items, addItem, removeItem } = useCart()

  const [menu, setMenu] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!placeId || !name) {
      setError('Missing restaurant info')
      setLoading(false)
      return
    }

    const fetchMenu = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_RESTAURANT_SERVICE_URL}/restaurants/nearby/${placeId}/menu?name=${encodeURIComponent(name)}`
        )

        if (!res.ok) throw new Error('request failed')
        setMenu(await res.json())
      } catch {
        setError('Failed to load menu')
      } finally {
        setLoading(false)
      }
    }

    fetchMenu()
  }, [placeId, name])

  return (
    <div>
      <Navbar />
      <div className="p-6">
        <Link to="/" className="text-sm text-gray-500 hover:underline">← Back</Link>
        <h1 className="text-xl font-semibold mt-2">{name ?? 'Restaurant'}</h1>
        <RestaurantMeta
          lat={state?.lat ?? null}
          lng={state?.lng ?? null}
          address={state?.address ?? null}
        />

        {loading && <p>Loading...</p>}
        {error && <p className="text-red-500">{error}</p>}

        <ul className="mt-4 flex flex-col gap-3">
          {menu.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 p-4">
              <div className="flex min-w-0 items-center gap-4">
                <MenuItemImage src={item.image} />
                <div className="min-w-0">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-gray-500">${item.price.toFixed(2)}</p>
                </div>
              </div>

              <QuantityStepper
                itemName={item.title}
                quantity={items.find((i) => i.id === item.id && i.restaurant.placeId === placeId)?.quantity ?? 0}
                onIncrease={() => restaurant && addItem({ id: item.id, title: item.title, price: item.price, restaurant })}
                onDecrease={() => placeId && removeItem(placeId, item.id)}
              />

            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
