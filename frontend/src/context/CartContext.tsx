import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

const CART_STORAGE_KEY = 'quickbite:cart:v2'

export interface CartRestaurant {
  placeId: string
  name: string
  address: string | null
  lat: number | null
  lng: number | null
}

export interface CartItem {
  id: number
  title: string
  price: number
  quantity: number
  restaurant: CartRestaurant
}

interface CartState {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  removeItem: (placeId: string, id: number) => void
  clearRestaurant: (placeId: string) => void
}

const CartContext = createContext<CartState | undefined>(undefined)

const isNullableNumber = (value: unknown) => value === null || Number.isFinite(value)

function isCartRestaurant(value: unknown): value is CartRestaurant {
  if (typeof value !== 'object' || value === null) return false
  const r = value as Record<string, unknown>
  return (
    typeof r.placeId === 'string' &&
    typeof r.name === 'string' &&
    (r.address === null || typeof r.address === 'string') &&
    isNullableNumber(r.lat) &&
    isNullableNumber(r.lng)
  )
}

function isCartItem(value: unknown): value is CartItem {
  if (typeof value !== 'object' || value === null) return false
  const item = value as Record<string, unknown>
  return (
    typeof item.id === 'number' &&
    typeof item.title === 'string' &&
    typeof item.price === 'number' &&
    Number.isFinite(item.price) &&
    item.price >= 0 &&
    Number.isInteger(item.quantity) &&
    (item.quantity as number) > 0 &&
    isCartRestaurant(item.restaurant)
  )
}

const isSameItem = (item: CartItem, placeId: string, id: number) =>
  item.id === id && item.restaurant.placeId === placeId

function loadCart(): CartItem[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter(isCartItem) : []
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCart)

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
    } catch {
      // Storage can be full or blocked; the cart still works for this visit.
    }
  }, [items])

  const addItem = (item: Omit<CartItem, 'quantity'>) => {
    setItems((prev) => {
      const { placeId } = item.restaurant
      if (prev.some((i) => isSameItem(i, placeId, item.id))) {
        return prev.map((i) =>
          isSameItem(i, placeId, item.id) ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, { ...item, quantity: 1 }]
    })
  }

  const removeItem = (placeId: string, id: number) => {
    setItems((prev) =>
      prev
        .map((i) => (isSameItem(i, placeId, id) ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0)
    )
  }

  const clearRestaurant = (placeId: string) => {
    setItems((prev) => prev.filter((i) => i.restaurant.placeId !== placeId))
  }

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clearRestaurant }}>{children}</CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
