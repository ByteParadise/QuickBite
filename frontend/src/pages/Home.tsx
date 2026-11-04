import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import { useUserLocation } from '../context/LocationContext'
import RestaurantMeta from './components/RestaurantMeta'

interface Restaurant {
  placeId: string
  name: string
  cuisine: string | null
  address: string | null
  lat: number
  lng: number
}

export default function Home() {
  const { lat, lng, loading: locationLoading, error: locationError } = useUserLocation()
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const loginFailed = (useLocation().state as { loginFailed?: boolean } | null)?.loginFailed
  const orderPlaced = (useLocation().state as { orderPlaced?: boolean } | null)?.orderPlaced

  useEffect(() => {
    if (lat === null || lng === null) return

    const controller = new AbortController()

    const fetchRestaurants = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_RESTAURANT_SERVICE_URL}/restaurants?lat=${lat}&lng=${lng}&radius=5000`,
          { signal: controller.signal }
        )
        if (!res.ok) throw new Error('request failed')
        const data: Restaurant[] = await res.json()
        setRestaurants(data)
        setError(null)
      } catch {
        if (controller.signal.aborted) return
        setRestaurants([])
        setError('Failed to load restaurants')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    fetchRestaurants()
    return () => controller.abort()
  }, [lat, lng])

  const hasLocation = lat !== null && lng !== null
  const visibleRestaurants = hasLocation ? restaurants : []
  const isLoading = locationLoading || (hasLocation && loading)

  return (
    <div>
      <Navbar />
      <div className="p-6">
        {loginFailed && <p className="mb-2 text-sm text-red-500">Login didn't complete. Please try again.</p>}
        {orderPlaced && <p className="mb-2 text-sm text-green-600">Order placed!</p>}
        {isLoading && <p>Loading...</p>}

        {(locationError || error) && <p className="text-red-500">{locationError ?? error}</p>}

        <ul className="mt-4 flex flex-col gap-3">
          {visibleRestaurants.map((r) => (
            <li
              key={r.placeId}
              className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 p-4"
            >
              <div className="min-w-0">
                <p className="font-semibold">{r.name}{r.cuisine ? ` (${r.cuisine})` : ''}</p>
                <RestaurantMeta lat={r.lat} lng={r.lng} address={r.address} />
              </div>

              <Link
                to={`/restaurants/${r.placeId}`}
                state={{ name: r.name, address: r.address, lat: r.lat, lng: r.lng }}
                aria-label={`View menu for ${r.name}`}
                className="shrink-0 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                View Menu
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
