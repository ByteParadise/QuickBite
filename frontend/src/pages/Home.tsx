import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from './components/Navbar'
import { useUserLocation } from '../context/LocationContext'

interface Restaurant {
  placeId: string
  name: string
  cuisine: string | null
  lat: number
  lng: number
}

export default function Home() {
  const { lat, lng, loading: locationLoading, error: locationError } = useUserLocation()
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (lat === null || lng === null) return

    const fetchRestaurants = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_RESTAURANT_SERVICE_URL}/restaurants?lat=${lat}&lng=${lng}&radius=5000`
        )
        if (!res.ok) throw new Error('request failed')
        setRestaurants(await res.json())
      } catch {
        setError('Failed to load restaurants')
      } finally {
        setLoading(false)
      }
    }

    fetchRestaurants()
  }, [lat, lng])

  return (
    <div>
      <Navbar />
      <div className="p-6">
        {(locationLoading || loading) && <p>Loading...</p>}
        {(locationError || error) && <p className="text-red-500">{locationError ?? error}</p>}

        <ul className="mt-4 flex flex-col gap-3">
          {restaurants.map((r) => (
            <li key={r.placeId}>
              <Link
                to={`/restaurants/${r.placeId}`}
                state={{ name: r.name }}
                className="block rounded-lg border border-gray-200 p-4 hover:bg-gray-50"
              >
                <p className="font-semibold">{r.name}{r.cuisine ? ` (${r.cuisine})` : ''}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
