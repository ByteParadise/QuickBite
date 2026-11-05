import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { fetchOrders, type OrderSummary } from '../services/orderApi'
import { requireToken } from '../services/accountApi'

export default function OrderHistory() {
  const { isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0()
  const navigate = useNavigate()
  const location = useLocation()
  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // A directly opened page has no earlier entry in this app to go back to.
  const goBack = () => {
    if (location.key === 'default') navigate('/', { replace: true })
    else navigate(-1)
  }

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    let isCurrent = true
    const load = async () => {
      try {
        const loaded = await fetchOrders(requireToken(await getAccessTokenSilently()))
        if (isCurrent) setOrders(loaded)
      } catch {
        if (isCurrent) setError('Could not load your orders')
      } finally {
        if (isCurrent) setLoading(false)
      }
    }

    load()
    return () => {
      isCurrent = false
    }
  }, [isAuthenticated, getAccessTokenSilently])

  return (
    <div className="p-6 pb-24">
      <button type="button" onClick={goBack} className="text-sm text-gray-500 hover:underline">
        ← Back
      </button>
      <h1 className="mt-2 mb-4 text-xl font-semibold">Order History</h1>

      {isLoading || loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : !isAuthenticated ? (
        <Link to="/login" className="text-sm font-medium text-blue-600 hover:underline">
          Log in to see your orders
        </Link>
      ) : error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : orders.length === 0 ? (
        <p className="text-sm text-gray-500">No orders yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((order) => (
            <li key={order.id} className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between gap-4">
                <p className="font-medium">{order.restaurantName}</p>
                <p className="font-medium">${(order.totalMinorUnits / 100).toFixed(2)}</p>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'} ·{' '}
                {new Date(order.createdAt).toLocaleDateString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
