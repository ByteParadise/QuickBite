import { useCart } from '../context/CartContext'

export default function Cart() {
  const { items } = useCart()

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Cart</h1>
      {items.length === 0 ? (
        <p className="text-gray-500">Your cart is empty.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
              <span>{item.title} × {item.quantity}</span>
              <span>${(item.price * item.quantity).toFixed(2)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
