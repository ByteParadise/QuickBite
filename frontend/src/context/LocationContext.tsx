import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

interface LocationState {
  lat: number | null
  lng: number | null
  address: string | null
  loading: boolean
  error: string | null
}

const LocationContext = createContext<LocationState | undefined>(undefined)

export function LocationProvider({ children }: { children: ReactNode }) {
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [address, setAddress] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        setLat(latitude)
        setLng(longitude)

        try {
          const res = await fetch(
            `${import.meta.env.VITE_RESTAURANT_SERVICE_URL}/reverse-geocode?lat=${latitude}&lng=${longitude}`
          )
          if (res.ok) {
            const { address: resolvedAddress } = await res.json()
            setAddress(resolvedAddress)
          }
        } catch {
          // address is optional — not fatal
        } finally {
          setLoading(false)
        }
      },
      () => {
        setError('Location permission denied')
        setLoading(false)
      }
    )
  }, [])

  return (
    <LocationContext.Provider value={{ lat, lng, address, loading, error }}>
      {children}
    </LocationContext.Provider>
  )
}

export function useUserLocation() {
  const context = useContext(LocationContext)
  if (!context) {
    throw new Error('useUserLocation must be used within a LocationProvider')
  }
  return context
}
