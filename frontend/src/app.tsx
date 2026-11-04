import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Layout from './pages/components/Layout'
import Home from './pages/Home'
import Login from './pages/Login'
import RestaurantDetail from './pages/RestaurantDetail'
import type { RouteHandle } from './pages/components/FloatingNav'
import Checkout from './pages/Checkout'
import AddCard from './pages/AddCard'
import OrderHistory from './pages/OrderHistory'
import PaymentMethods from './pages/PaymentMethods'

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Home />, handle: { floatingNav: true } satisfies RouteHandle },
      { path: '/login', element: <Login /> },
      { path: '/restaurants/:placeId', element: <RestaurantDetail />},
      { path: '/checkout/:placeId', element: <Checkout /> },
      { path: '/cards/new', element: <AddCard /> },
      { path: '/order-history', element: <OrderHistory /> },
      { path: '/payment-methods', element: <PaymentMethods /> },

    ],
  },
])

function App() {
  return (
    <RouterProvider router={router} />
  )
}

export default App
