import { useEffect, useState } from 'react'

export interface AddressResult {
  placeId: string
  address: string
  line1: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  lat: number
  lng: number
}

export const ADDRESS_SEARCH_MIN_LENGTH = 4
const DEBOUNCE_MS = 400
const REQUEST_TIMEOUT_MS = 10_000

class AddressSearchError extends Error {}

interface SearchResponse {
  key: string
  results: AddressResult[]
  error: string | null
}

async function fetchAddresses(
  text: string,
  lat: number | null,
  lng: number | null,
  signal: AbortSignal
): Promise<AddressResult[]> {
  const params = new URLSearchParams({ text })
  if (lat !== null && lng !== null) {
    params.set('lat', String(lat))
    params.set('lng', String(lng))
  }

  const res = await fetch(
    `${import.meta.env.VITE_RESTAURANT_SERVICE_URL}/address-search?${params}`,
    { signal }
  )
  if (res.status === 429) {
    throw new AddressSearchError('Too many searches. Please try again in a minute.')
  }
  if (!res.ok) throw new AddressSearchError('Address search failed. Please try again.')

  const data: { results: AddressResult[] } = await res.json()
  return data.results
}

export function useAddressSearch(rawText: string, lat: number | null, lng: number | null) {
  const [response, setResponse] = useState<SearchResponse | null>(null)

  const text = rawText.trim()
  const isActive = text.length >= ADDRESS_SEARCH_MIN_LENGTH
  const key = `${text.toLowerCase()}|${lat?.toFixed(2)}|${lng?.toFixed(2)}`

  useEffect(() => {
    if (!isActive) return

    const controller = new AbortController()
    let isCurrent = true
    let abortTimer: ReturnType<typeof setTimeout> | undefined

    const debounceTimer = setTimeout(async () => {
      abortTimer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

      try {
        const results = await fetchAddresses(text, lat, lng, controller.signal)
        if (isCurrent) setResponse({ key, results, error: null })
      } catch (err) {
        if (!isCurrent) return
        const error = err instanceof AddressSearchError
          ? err.message
          : 'Address search failed. Please try again.'
        setResponse({ key, results: [], error })
      } finally {
        clearTimeout(abortTimer)
      }
    }, DEBOUNCE_MS)

    return () => {
      isCurrent = false
      clearTimeout(debounceTimer)
      clearTimeout(abortTimer)
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, isActive])

  const isLoading = isActive && response?.key !== key
  const isSettled = isActive && response?.key === key

  return {
    results: isActive ? response?.results ?? [] : [],
    isLoading,
    error: isSettled ? response.error : null,
    hasNoResults: isSettled && !response.error && response.results.length === 0,
  }
}
