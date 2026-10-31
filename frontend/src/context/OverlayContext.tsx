import { createContext, useContext, useState, type ReactNode } from 'react'

type OverlayKind = 'user' | 'cart' | 'addresses' | null

interface OverlayState {
  activeOverlay: OverlayKind
  openOverlay: (overlay: OverlayKind) => void
  closeOverlay: () => void
}

const OverlayContext = createContext<OverlayState | undefined>(undefined)

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [activeOverlay, setActiveOverlay] = useState<OverlayKind>(null)

  return (
    <OverlayContext.Provider
      value={{ activeOverlay, openOverlay: setActiveOverlay, closeOverlay: () => setActiveOverlay(null) }}
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
