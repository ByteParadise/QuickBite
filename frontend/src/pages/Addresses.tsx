import { useState, type FormEvent } from 'react'
import { FiMapPin, FiSearch, FiX } from 'react-icons/fi'
import { useUserLocation } from '../context/LocationContext'
import { useOverlay } from '../context/OverlayContext'
import {
  ADDRESS_SEARCH_MIN_LENGTH,
  useAddressSearch,
  type AddressResult,
} from '../hooks/useAddressSearch'


// Sample data until saved-address storage is decided.
const PLACEHOLDER_SAVED_ADDRESSES = [
  { id: 'home', label: 'Home', address: '123 Example St' },
  { id: 'work', label: 'Work', address: '456 Sample Ave' },
]

export default function Addresses() {
  const {
    lat,
    lng,
    address,
    deviceAddress,
    selectedAddress,
    loading,
    error,
    selectAddress,
    clearSelectedAddress,
  } = useUserLocation()
  const { closeOverlay } = useOverlay()
  const { results, status, error: searchError, search, reset } = useAddressSearch()
  const [query, setQuery] = useState('')

  const currentAddress = address ?? (loading ? 'Locating...' : error ?? 'Address unavailable')
  const isSearching = status === 'loading'
  const canSearch = !isSearching && query.trim().length >= ADDRESS_SEARCH_MIN_LENGTH

  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    search(query, lat, lng)
  }

  const handleSelect = ({ address: chosen, lat: chosenLat, lng: chosenLng }: AddressResult) => {
    selectAddress({ address: chosen, lat: chosenLat, lng: chosenLng })
    setQuery('')
    reset()
    closeOverlay()
  }

  return (
    <div className="p-6 pb-10">
      <div className="relative flex items-center justify-center">
        <button
          type="button"
          onClick={closeOverlay}
          aria-label="Close addresses"
          className="absolute right-0 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200"
        >
          <FiX className="h-5 w-5" />
        </button>
        <h2 id="addresses-title" className="text-xl font-semibold">Addresses</h2>
      </div>

      <form onSubmit={handleSearch} className="mt-4 flex gap-2">
        <div className="relative min-w-0 flex-1">
          <FiSearch
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={200}
            placeholder="Search for an address"
            aria-label="Search for an address"
            autoComplete="off"
            className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-base focus:border-blue-600 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={!canSearch}
          className="shrink-0 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSearching ? 'Searching...' : 'Search'}
        </button>
      </form>

      <div aria-live="polite">
        {searchError && <p className="mt-3 text-sm text-red-500">{searchError}</p>}
        {status === 'success' && results.length === 0 && (
          <p className="mt-3 text-sm text-gray-500">No addresses found. Try adding a city or state.</p>
        )}
        {results.length > 0 && (
          <ul className="mt-3 flex flex-col gap-2">
            {results.map((result) => (
              <li key={result.placeId}>
                <button
                  type="button"
                  onClick={() => handleSelect(result)}
                  className="flex w-full items-start gap-3 rounded-lg border border-gray-200 p-3 text-left hover:bg-gray-50"
                >
                  <FiMapPin className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" aria-hidden="true" />
                  <span className="min-w-0 text-sm">{result.address}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <section className="mt-6">
        <h3 className="mb-2 text-sm font-semibold text-gray-500">Selected address</h3>
        <div className="flex items-start gap-3 rounded-lg border border-blue-600 p-3">
          <FiMapPin className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-medium">{selectedAddress ? 'Chosen address' : 'Current location'}</p>
            <p className="text-sm text-gray-500">{currentAddress}</p>
          </div>
        </div>
        {selectedAddress && (
          <button
            type="button"
            onClick={clearSelectedAddress}
            className="mt-2 text-left text-sm font-medium text-blue-600 hover:underline"
          >
            Use current location{deviceAddress ? ` (${deviceAddress})` : ''}
          </button>
        )}
      </section>

      <section className="mt-6">
        <h3 className="mb-2 text-sm font-semibold text-gray-500">Saved addresses</h3>
        <ul className="flex flex-col gap-3">
          {PLACEHOLDER_SAVED_ADDRESSES.map((saved) => (
            <li key={saved.id} className="flex items-start gap-3 rounded-lg border border-gray-200 p-3">
              <FiMapPin className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" aria-hidden="true" />
              <div className="min-w-0">
                <p className="font-medium">{saved.label}</p>
                <p className="text-sm text-gray-500">{saved.address}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
