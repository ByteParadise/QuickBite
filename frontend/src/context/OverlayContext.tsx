import { createContext, useContext, useState, type ReactNode } from 'react'
import type { AddressResult } from '../hooks/useAddressSearch'

type OverlayKind = 'user' | 'cart' | 'addresses' | null

interface OverlayState {
  activeOverlay: OverlayKind
  cartRestaurantId: string | null
  openOverlay: (overlay: OverlayKind) => void
  closeOverlay: () => void
  openCartDetail: (placeId: string) => void
  closeCartDetail: () => void
  addressDetail: AddressResult | null
  openAddressDetail: (address: AddressResult) => void
  closeAddressDetail: () => void
}

const OverlayContext = createContext<OverlayState | undefined>(undefined)

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [activeOverlay, setActiveOverlay] = useState<OverlayKind>(null)
  // Addresses can be opened from inside another overlay (e.g. Account) — closing it
  // should return there instead of dropping all the way out.
  const [addressesReturnTo, setAddressesReturnTo] = useState<OverlayKind>(null)
  const [cartRestaurantId, setCartRestaurantId] = useState<string | null>(null)
  const [addressDetail, setAddressDetail] = useState<AddressResult | null>(null)

  const closeOverlay = () => {
    setActiveOverlay(activeOverlay === 'addresses' ? addressesReturnTo : null)
    setAddressesReturnTo(null)
    setCartRestaurantId(null)
    setAddressDetail(null)
  }

  const openOverlay = (overlay: OverlayKind) => {
    if (overlay === null) {
      closeOverlay()
      return
    }
    setAddressesReturnTo(overlay === 'addresses' && activeOverlay !== 'addresses' ? activeOverlay : null)
    setActiveOverlay(overlay)
  }

  return (
    <OverlayContext.Provider
      value={{
        activeOverlay,
        cartRestaurantId,
        openOverlay,
        closeOverlay,
        openCartDetail: setCartRestaurantId,
        closeCartDetail: () => setCartRestaurantId(null),
        addressDetail,
        openAddressDetail: setAddressDetail,
        closeAddressDetail: () => setAddressDetail(null),
      }}
    >
      {children}
    </OverlayContext.Provider>
  )
}


export function useOverlay() {
  const context = useContext(OverlayContext)
  if (!context) {
    throw new Error('useOverlay must be used within an OverlayProvider')
  }
  return context
}
