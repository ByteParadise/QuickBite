import Navbar from './components/Navbar'

export default function Home() {
  return (
    <div>
      <Navbar />
      <div className="p-6">
        <h1 className="text-red-500">QuickBite</h1>
        <p>Browse restaurants (coming soon)</p>
      </div>
    </div>
  )
}
