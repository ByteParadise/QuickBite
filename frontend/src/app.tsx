import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Layout from './pages/components/Layout'
import Home from './pages/Home'
import Login from './pages/Login'
import RestaurantDetail from './pages/RestaurantDetail'
import type { RouteHandle } from './pages/components/FloatingNav'
import Checkout from './pages/Checkout'


const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Home />, handle: { floatingNav: true } satisfies RouteHandle },
      { path: '/login', element: <Login /> },
      { path: '/restaurants/:placeId', element: <RestaurantDetail />},
      { path: '/checkout/:placeId', element: <Checkout /> },
    ],
  },
])

function App() {
  return (
    <RouterProvider router={router} />
  )
}

export default App
