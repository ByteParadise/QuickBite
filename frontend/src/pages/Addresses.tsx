import { useState } from 'react'
import { FiMapPin, FiSearch, FiX } from 'react-icons/fi'
import { useUserLocation } from '../context/LocationContext'
import { useOverlay } from '../context/OverlayContext'
import { useAddressSearch, type AddressResult } from '../hooks/useAddressSearch'
import EditablePinMap from './components/EditablePinMap'
import type { PinPosition } from './components/LocationMap'
import AddressDetail from './components/AddressDetail'
import { useSavedAddresses } from '../hooks/useSavedAddresses'
import { useAuth0 } from '@auth0/auth0-react'
import { formatSavedAddress, type SavedAddress } from '../services/accountApi'
import { useRequireLogin } from '../hooks/useRequireLogin'
import { distanceInMiles } from '../utils/distance'

// About 500 feet, roughly the normal variation of a device's location.
const SAME_LOCATION_MILES = 0.1

export default function Addresses() {
  const {
    lat,
    lng,
    address,
    isAddressComplete,
    addressParts,
    deviceLat,
    deviceLng,
    selectedAddress,
    loading,
    error,
    selectAddress,
    clearSelectedAddress,
  } = useUserLocation()
  const { activeOverlay, closeOverlay, addressDetail, openAddressDetail, closeAddressDetail } = useOverlay()
  const requireLogin = useRequireLogin()
  const [query, setQuery] = useState('')
  const { results, isLoading: isSearching, error: searchError, hasNoResults } = useAddressSearch(query, lat, lng)

  const currentAddress = address ?? (loading ? 'Locating...' : error ?? 'Address unavailable')
  const canUseCurrentLocation =
    selectedAddress !== null &&
    deviceLat !== null &&
    deviceLng !== null &&
    distanceInMiles(deviceLat, deviceLng, selectedAddress.lat, selectedAddress.lng) > SAME_LOCATION_MILES

  const { isAuthenticated } = useAuth0()
  const { savedAddresses, storeAddress, isSaving, error: saveError, isReady } = useSavedAddresses()

  const handleUse = (result: AddressResult, pin: PinPosition) => {
    selectAddress({
      address: result.address,
      line1: result.line1,
      city: result.city,
      state: result.state,
      postalCode: result.postalCode,
      ...pin,
      isComplete: true,
    })
    setQuery('')
    closeAddressDetail()
  }

  const isSelected = (saved: SavedAddress) =>
    saved.line1 === addressParts?.line1 && saved.lat === lat && saved.lng === lng
  const isSelectedSaved = savedAddresses.some(isSelected)

  const handleSaveSelected = () => {
    if (lat === null || lng === null || !isAddressComplete) return
    if (!requireLogin({ type: 'addresses' })) return

    const { line1, city, state, postalCode } = addressParts ?? {}
    if (!line1 || !city || !state || !postalCode) return

    storeAddress({ line1, city, state, postalCode, lat, lng })
  }

  const handleSelectSaved = (saved: SavedAddress) => {
    selectAddress({
      address: formatSavedAddress(saved),
      line1: saved.line1,
      city: saved.city,
      state: saved.state,
      postalCode: saved.postalCode,
      lat: saved.lat,
      lng: saved.lng,
      isComplete: true,
    })
  }

  const handlePinSave = (position: PinPosition) => {
    selectAddress({
      address: address ?? 'Pinned location',
      line1: addressParts?.line1 ?? null,
      city: addressParts?.city ?? null,
      state: addressParts?.state ?? null,
      postalCode: addressParts?.postalCode ?? null,
      ...position,
      isComplete: isAddressComplete,
    })
  }

  if (addressDetail) {
    return (
      <AddressDetail
        result={addressDetail}
        onBack={closeAddressDetail}
        onUse={(pin) => handleUse(addressDetail, pin)}
      />
    )
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

      <div className="relative mt-4">
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

      <div aria-live="polite">
        {isSearching && <p className="mt-3 text-sm text-gray-500">Searching...</p>}
        {searchError && <p className="mt-3 text-sm text-red-500">{searchError}</p>}
        {hasNoResults && (
          <p className="mt-3 text-sm text-gray-500">No complete addresses found. Enter a full street address, like 126 Main St.</p>
        )}
        {results.length > 0 && (
          <ul className="mt-3 flex flex-col gap-2">
            {results.map((result) => (
              <li key={result.placeId}>
                <button
                  type="button"
                  onClick={() => openAddressDetail(result)}
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
        <div className="mb-2 flex items-center justify-between gap-4">
          <h3 className="text-sm font-semibold text-gray-500">Selected address</h3>
          {canUseCurrentLocation && (
            <button
              type="button"
              onClick={clearSelectedAddress}
              className="shrink-0 text-sm font-medium text-blue-600 hover:underline"
            >
              Use current location
            </button>
          )}
        </div>
        {activeOverlay === 'addresses' && lat !== null && lng !== null && (
          <div className="mb-2">
            <EditablePinMap
              key={`${lat},${lng}`}
              lat={lat}
              lng={lng}
              label="Selected address"
              onSave={handlePinSave}
            />
          </div>
        )}

        <div className="flex items-start gap-3 rounded-lg border border-blue-600 p-3">
          <FiMapPin className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-medium">{selectedAddress ? 'Current address' : 'Current location'}</p>
            <p className="text-sm text-gray-500">{currentAddress}</p>
          </div>
        </div>

        {address && lat !== null && lng !== null && isAddressComplete && (
          <button
            type="button"
            onClick={handleSaveSelected}
            disabled={isSelectedSaved || isSaving || (isAuthenticated && !isReady)}
            className="mt-3 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
          >
            {isSelectedSaved ? 'Saved' : isSaving ? 'Saving...' : 'Save this address'}
          </button>
        )}
        {saveError && <p className="mt-2 text-sm text-red-500">{saveError}</p>}
      </section>

      <section className="mt-6">
        <h3 className="mb-2 text-sm font-semibold text-gray-500">Saved addresses</h3>
        {savedAddresses.length === 0 ? (
          <p className="text-sm text-gray-500">
            {isAuthenticated ? 'No saved addresses yet.' : 'Log in to see your saved addresses.'}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {savedAddresses.map((saved) => {
              const isCurrent = isSelected(saved)

              return (
                <li key={saved.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectSaved(saved)}
                    aria-current={isCurrent ? 'true' : undefined}
                    className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left hover:bg-gray-50 ${
                      isCurrent ? 'border-blue-600' : 'border-gray-200'
                    }`}
                  >
                    <FiMapPin
                      className={`mt-0.5 h-5 w-5 shrink-0 ${isCurrent ? 'text-blue-600' : 'text-gray-400'}`}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 text-sm">{formatSavedAddress(saved)}</span>
                    {isCurrent && (
                      <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                        Current
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
