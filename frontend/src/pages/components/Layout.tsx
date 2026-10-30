import { Outlet } from 'react-router-dom'

export default function Layout() {
  return (
    <div className="min-h-screen bg-shell">
      <div className="mx-auto min-h-screen w-full max-w-md bg-white">
        <Outlet />
      </div>
    </div>
  )
}
