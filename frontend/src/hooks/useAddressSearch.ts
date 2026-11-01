import { useRef, useState } from 'react'

export interface AddressResult {
  placeId: string
  address: string
  lat: number
  lng: number
}

type SearchStatus = 'idle' | 'loading' | 'success' | 'error'

export const ADDRESS_SEARCH_MIN_LENGTH = 3
const REQUEST_TIMEOUT_MS = 10_000

class AddressSearchError extends Error {}

export function useAddressSearch() {
  const [results, setResults] = useState<AddressResult[]>([])
  const [status, setStatus] = useState<SearchStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef(false)
  const lastSearchedText = useRef<string | null>(null)

  const search = async (rawText: string, lat: number | null, lng: number | null) => {
    const text = rawText.trim()
    if (inFlight.current || text.length < ADDRESS_SEARCH_MIN_LENGTH) return
    if (text === lastSearchedText.current) return

    inFlight.current = true
    setStatus('loading')
    setError(null)

    try {
      const params = new URLSearchParams({ text })
      if (lat !== null && lng !== null) {
        params.set('lat', String(lat))
        params.set('lng', String(lng))
      }

      const res = await fetch(
        `${import.meta.env.VITE_RESTAURANT_SERVICE_URL}/address-search?${params}`,
        { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }
      )
      if (res.status === 429) {
        throw new AddressSearchError('Too many searches. Please try again in a minute.')
      }
      if (!res.ok) throw new AddressSearchError('Address search failed. Please try again.')

      const data: { results: AddressResult[] } = await res.json()
      setResults(data.results)
      setStatus('success')
      lastSearchedText.current = text
    } catch (err) {
      const message = err instanceof AddressSearchError
        ? err.message
        : 'Address search failed. Please try again.'
      setResults([])
      setError(message)
    } finally {
      inFlight.current = false
    }
  }

  const reset = () => {
    setResults([])
    setStatus('idle')
    setError(null)
    lastSearchedText.current = null
  }

  return { results, status, error, search, reset }
}
