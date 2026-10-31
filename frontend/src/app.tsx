import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Layout from './pages/components/Layout'
import Home from './pages/Home'
import Login from './pages/Login'
import RestaurantDetail from './pages/RestaurantDetail'

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/login', element: <Login /> },
      { path: '/restaurants/:placeId', element: <RestaurantDetail />},
    ],
  },
])

function App() {
  return (
    <RouterProvider router={router} />
  )
}

export default App
