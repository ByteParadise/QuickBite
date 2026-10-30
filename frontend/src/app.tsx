import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Layout from './pages/components/Layout'
import Home from './pages/Home'
import Login from './pages/Login'


const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/login', element: <Login /> },
    ],
  },
])

function App() {
  return (
    <RouterProvider router={router} />
  )
}

export default App
