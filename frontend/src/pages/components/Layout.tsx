import { Outlet, useLocation } from 'react-router-dom'
import { FiUser, FiShoppingCart, FiHome } from 'react-icons/fi'
import { LocationProvider } from '../../context/LocationContext'
import { OverlayProvider, useOverlay } from '../../context/OverlayContext'
import { CartProvider } from '../../context/CartContext'
import UserInfo from '../UserInfo'
import Cart from '../Cart'
import Addresses from '../Addresses'

function LayoutContent() {
  const { activeOverlay, openOverlay, closeOverlay } = useOverlay()
  const { pathname } = useLocation()
  const isLoginPage = pathname === '/login'

  return (
    <div className="h-screen bg-shell overflow-hidden">
      <div className="relative mx-auto h-screen w-full max-w-md bg-white translate-x-0 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <Outlet />
        </div>

        {/* Addresses — bottom sheet, leaves the home page visible at the top */}
        <div
          className={`fixed inset-x-0 bottom-0 top-16 bg-white z-20 rounded-t-2xl shadow-lg transition-transform duration-300 ease-in-out overflow-y-auto ${
            activeOverlay === 'addresses' ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          <Addresses />
        </div>


        {/* User info — full-screen slide from the right */}
        <div
          className={`fixed inset-0 bg-white z-20 overflow-y-auto transition-transform duration-300 ease-in-out ${
            activeOverlay === 'user' ? 'translate-x-0' : 'translate-x-full'
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

        {!isLoginPage && (
          <button
            onClick={() => (activeOverlay ? closeOverlay() : openOverlay('user'))}
            className="fixed bottom-4 left-4 z-30 flex items-center justify-center w-12 h-12 rounded-full bg-white shadow-lg border border-gray-200"
          >
            {activeOverlay ? <FiHome className="w-5 h-5" /> : <FiUser className="w-5 h-5" />}
          </button>
        )}

        {!isLoginPage && activeOverlay !== 'user' && activeOverlay !== 'cart' && (
          <button
            onClick={() => openOverlay('cart')}
            className="fixed bottom-4 right-4 z-30 flex items-center justify-center w-12 h-12 rounded-full bg-white shadow-lg border border-gray-200"
          >
            <FiShoppingCart className="w-5 h-5" />
          </button>
        )}
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
