
import { useState } from 'react'
import Navbar from './components/Navbar'

interface MenuItem {
  id: string
  title: string
  image: string
  price: number
}

interface Restaurant {
  osmId: number
  name: string
  cuisine: string | null
  lat: number
  lng: number
  menu: MenuItem[]
}

export default function Home() {
  const [restaurants, setRestuarants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateLocation = () => {
    setLoading(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        try {
          const res = await fetch(
            `${import.meta.env.VITE_RESTAURANT_SERVICE_URL}/restaurants?lat=${latitude}&lng=${longitude}`
          )
          if (!res.ok) throw new Error(`request failed`)
            setRestuarants(await res.json())
        } catch {
          setError('Failed to load restaurants')
        } finally {
          setLoading(false)
        }
      },
      () => {
        setError('Location permission denied')
        setLoading(false)
      }
    )
  }

  return (
    <div>
      <Navbar />
      <div className="p-6">
        <h1 className="text-red-500">QuickBite</h1>
        <button onClick={updateLocation}>Update location</button>

        {loading && <p>Loading...</p>}
        {error && <p className="text-red-500">{error}</p>}

        <ul className="mt-4 flex flex-col gap-4">
          {restaurants.map((r) => (
            <li key={r.osmId}>
              <p className="font-semibold">{r.name}{r.cuisine ? ` (${r.cuisine})` : ''}</p>
              <ul className="pl-4 text-sm text-gray-600">
                {r.menu.map((item) => (
                  <li key={item.id}>{item.title} — ${item.price.toFixed(2)}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
