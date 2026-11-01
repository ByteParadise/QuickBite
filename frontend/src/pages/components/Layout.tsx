import { Outlet } from 'react-router-dom'
import { LocationProvider } from '../../context/LocationContext'
import { OverlayProvider, useOverlay } from '../../context/OverlayContext'
import { CartProvider } from '../../context/CartContext'
import UserInfo from '../UserInfo'
import Cart from '../Cart'
import Addresses from '../Addresses'
import FloatingNav from './FloatingNav'


function LayoutContent() {
  const { activeOverlay, closeOverlay } = useOverlay()

  return (
    <div className="h-dvh bg-shell overflow-hidden">
      <div className="relative mx-auto h-dvh w-full max-w-md bg-white translate-x-0 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <Outlet />
        </div>
        {/* Addresses — dimmed background; tapping it closes the sheet */}
        <div
          aria-hidden="true"
          onClick={closeOverlay}
          className={`fixed inset-0 z-10 bg-black/40 transition-opacity duration-300 ${
            activeOverlay === 'addresses' ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        />

        {/* Addresses — bottom sheet over the current page */}
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="addresses-title"
          inert={activeOverlay !== 'addresses'}
          className={`fixed inset-x-0 bottom-0 top-16 bg-white z-20 rounded-t-2xl shadow-lg transition-transform duration-300 ease-in-out overflow-y-auto ${
            activeOverlay === 'addresses' ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          <Addresses />
        </div>


        {/* User info — full-screen slide from the left */}
        <div
          className={`fixed inset-0 bg-white z-20 overflow-y-auto transition-transform duration-300 ease-in-out ${
            activeOverlay === 'user' ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <UserInfo />
        </div>

        {/* Cart — full-screen slide from the right */}
        <div
          className={`fixed inset-0 bg-white z-20 overflow-y-auto transition-transform duration-300 ease-in-out ${
            activeOverlay === 'cart' ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <Cart />
        </div>
        <FloatingNav />
      </div>
    </div>
  )
}

export default function Layout() {
  return (
    <LocationProvider>
      <OverlayProvider>
        <CartProvider>
          <LayoutContent />
        </CartProvider>
      </OverlayProvider>
    </LocationProvider>
  )
}
