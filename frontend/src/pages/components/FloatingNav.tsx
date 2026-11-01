import { useLocation, useMatches, useNavigate } from 'react-router-dom'
import { FiHome, FiShoppingCart, FiUser } from 'react-icons/fi'
import type { IconType } from 'react-icons'
import { useCart } from '../../context/CartContext'
import { useOverlay } from '../../context/OverlayContext'

export interface RouteHandle {
  floatingNav?: boolean
}

type ButtonKind = 'user' | 'cart' | 'home'
type Position = 'left' | 'right'
type ButtonLayout = Partial<Record<Position, ButtonKind>>

const POSITIONS: Position[] = ['left', 'right']

const POSITION_CLASS: Record<Position, string> = {
  left: 'left-4',
  right: 'right-4',
}

export default function FloatingNav() {
  const { activeOverlay, cartRestaurantId, openOverlay, closeOverlay } = useOverlay()
  const { items } = useCart()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const matches = useMatches()

  const isRouteEnabled = matches.some(
    (match) => (match.handle as RouteHandle | undefined)?.floatingNav === true
  )
  const isCartDetailOpen = items.some((item) => item.restaurant.placeId === cartRestaurantId)

  const getLayout = (): ButtonLayout => {
    if (activeOverlay === 'cart') return isCartDetailOpen ? {} : { right: 'home' }
    if (activeOverlay === 'user') return { left: 'home' }
    if (!isRouteEnabled) return {}
    if (activeOverlay === 'addresses') return { left: 'home', right: 'cart' }
    return { left: 'user', right: 'cart' }
  }

  const goHome = () => {
    closeOverlay()
    if (pathname !== '/') navigate('/')
  }

  const buttons: Record<ButtonKind, { icon: IconType; label: string; onClick: () => void }> = {
    user: { icon: FiUser, label: 'Open account', onClick: () => openOverlay('user') },
    cart: { icon: FiShoppingCart, label: 'Open cart', onClick: () => openOverlay('cart') },
    home: { icon: FiHome, label: 'Go home', onClick: goHome },
  }

  const layout = getLayout()

  return (
    <>
      {POSITIONS.map((position) => {
        const kind = layout[position]
        if (!kind) return null
        const { icon: Icon, label, onClick } = buttons[kind]

        return (
          <button
            key={position}
            type="button"
            onClick={onClick}
            aria-label={label}
            className={`fixed bottom-4 ${POSITION_CLASS[position]} z-30 flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-white shadow-lg`}
          >
            <Icon className="h-5 w-5" />
          </button>
        )
      })}
    </>
  )
}
