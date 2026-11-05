import { FiMinus, FiPlus } from 'react-icons/fi'

interface QuantityStepperProps {
  itemName: string
  quantity: number
  onIncrease: () => void
  onDecrease: () => void
}

const BUTTON_CLASS =
  'flex h-8 w-11 items-center justify-center rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-40'

export default function QuantityStepper({ itemName, quantity, onIncrease, onDecrease }: QuantityStepperProps) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        onClick={onDecrease}
        disabled={quantity === 0}
        aria-label={`Remove one ${itemName}`}
        className={BUTTON_CLASS}
      >
        <FiMinus className="h-4 w-4" />
      </button>
      <span aria-live="polite" className="w-6 text-center text-sm font-medium">{quantity}</span>
      <button
        type="button"
        onClick={onIncrease}
        aria-label={`Add one ${itemName}`}
        className={BUTTON_CLASS}
      >
        <FiPlus className="h-4 w-4" />
      </button>
    </div>
  )
}
