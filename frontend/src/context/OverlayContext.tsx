import { createContext, useContext, useState, type ReactNode } from 'react'

type OverlayKind = 'user' | 'cart' | 'addresses' | null

interface OverlayState {
  activeOverlay: OverlayKind
  cartRestaurantId: string | null
  openOverlay: (overlay: OverlayKind) => void
  closeOverlay: () => void
  openCartDetail: (placeId: string) => void
  closeCartDetail: () => void
}

const OverlayContext = createContext<OverlayState | undefined>(undefined)

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [activeOverlay, setActiveOverlay] = useState<OverlayKind>(null)
  const [cartRestaurantId, setCartRestaurantId] = useState<string | null>(null)

  const closeOverlay = () => {
    setActiveOverlay(null)
    setCartRestaurantId(null)
  }

  return (
    <OverlayContext.Provider
      value={{
        activeOverlay,
        cartRestaurantId,
        openOverlay: setActiveOverlay,
        closeOverlay,
        openCartDetail: setCartRestaurantId,
        closeCartDetail: () => setCartRestaurantId(null),
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
