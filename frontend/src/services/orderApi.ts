const BASE_URL = import.meta.env.VITE_ORDER_SERVICE_URL

export interface OrderRestaurant {
  placeId: string
  name: string
  address: string | null
  lat: number | null
  lng: number | null
}

export interface OrderItem {
  id: number
  title: string
  price: number
  quantity: number
}

export interface OrderDeliveryAddress {
  line1: string
  city: string
  state: string
  postalCode: string
  lat: number
  lng: number
}

export interface PlaceOrderRequest {
  restaurant: OrderRestaurant
  items: OrderItem[]
  deliveryAddress: OrderDeliveryAddress
  cardId: string
}

export interface PlacedOrder {
  id: string
  restaurantId: string
  restaurantName: string
  totalMinorUnits: number
  currency: string
}

export async function placeOrder(token: string | undefined, order: PlaceOrderRequest): Promise<PlacedOrder> {
  const res = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(order),
  })
  if (!res.ok) throw new Error(`place order failed: ${res.status}`)
  return res.json()
}
