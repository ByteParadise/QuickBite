import { useEffect, useState } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import { FiPlus } from "react-icons/fi";
import Navbar from "./components/Navbar";
import { useCart } from "../context/CartContext";

interface MenuItem {
  id: number
  title: string
  image: string
  price: number
}

export default function RestaurantDetail() {
  const { placeId } = useParams()
  const location = useLocation()
  const name = (location.state as { name?: string } | null)?.name
  const { addItem } = useCart()

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

        {loading && <p>Loading...</p>}
        {error && <p className="text-red-500">{error}</p>}

        <ul className="mt-4 flex flex-col gap-3">
          {menu.map((item) => (
            <li key={item.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-gray-500">${item.price.toFixed(2)}</p>
              </div>
              <button
                onClick={() => addItem({ id: item.id, title: item.title, price: item.price })}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200"
              >
                <FiPlus className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
