import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

const SELECTED_ADDRESS_STORAGE_KEY = 'quickbite:selected-address:v3'

export interface AddressParts {
  line1: string | null
  city: string | null
  state: string | null
  postalCode: string | null
}

export interface SelectedAddress extends AddressParts {
  address: string
  lat: number
  lng: number
  isComplete: boolean
}

interface LocationState {
  lat: number | null
  lng: number | null
  address: string | null
  isAddressComplete: boolean
  addressParts: AddressParts | null
  deviceLat: number | null
  deviceLng: number | null
  deviceAddress: string | null
  selectedAddress: SelectedAddress | null
  loading: boolean
  error: string | null
  selectAddress: (selected: SelectedAddress) => void
  clearSelectedAddress: () => void
}

const LocationContext = createContext<LocationState | undefined>(undefined)

function isSelectedAddress(value: unknown): value is SelectedAddress {
  if (typeof value !== 'object' || value === null) return false
  const s = value as Record<string, unknown>
  return (
    typeof s.address === 'string' &&
    Number.isFinite(s.lat) &&
    Number.isFinite(s.lng) &&
    typeof s.isComplete === 'boolean' &&
    [s.line1, s.city, s.state, s.postalCode].every((part) => part === null || typeof part === 'string')
  )
}

function loadSelectedAddress(): SelectedAddress | null {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(SELECTED_ADDRESS_STORAGE_KEY) ?? 'null')
    return isSelectedAddress(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const [deviceLat, setDeviceLat] = useState<number | null>(null)
  const [deviceLng, setDeviceLng] = useState<number | null>(null)
  const [deviceAddress, setDeviceAddress] = useState<string | null>(null)
  const [isDeviceAddressComplete, setIsDeviceAddressComplete] = useState(false)
  const [deviceParts, setDeviceParts] = useState<AddressParts | null>(null)
  const [selectedAddress, setSelectedAddress] = useState<SelectedAddress | null>(loadSelectedAddress)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      if (selectedAddress) {
        localStorage.setItem(SELECTED_ADDRESS_STORAGE_KEY, JSON.stringify(selectedAddress))
      } else {
        localStorage.removeItem(SELECTED_ADDRESS_STORAGE_KEY)
      }
    } catch {
      // Storage can be full or blocked; the selection still works for this visit.
    }
  }, [selectedAddress])

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        setDeviceLat(latitude)
        setDeviceLng(longitude)

        try {
          const res = await fetch(
            `${import.meta.env.VITE_RESTAURANT_SERVICE_URL}/reverse-geocode?lat=${latitude}&lng=${longitude}`
          )
          if (res.ok) {
            const { address: resolvedAddress, isComplete, line1, city, state, postalCode } = await res.json()
            setDeviceAddress(resolvedAddress)
            setIsDeviceAddressComplete(isComplete === true)
            setDeviceParts({
              line1: line1 ?? null,
              city: city ?? null,
              state: state ?? null,
              postalCode: postalCode ?? null,
            })
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
    <LocationContext.Provider
      value={{
        lat: selectedAddress?.lat ?? deviceLat,
        lng: selectedAddress?.lng ?? deviceLng,
        address: selectedAddress?.address ?? deviceAddress,
        isAddressComplete: selectedAddress?.isComplete ?? isDeviceAddressComplete,
        addressParts: selectedAddress ?? deviceParts,
        deviceLat,
        deviceLng,
        deviceAddress,
        selectedAddress,
        loading: selectedAddress ? false : loading,
        error: selectedAddress ? null : error,
        selectAddress: setSelectedAddress,
        clearSelectedAddress: () => setSelectedAddress(null),
      }}
    >
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
