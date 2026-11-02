import { useState } from 'react'
import type { AddressResult } from '../../hooks/useAddressSearch'
import EditablePinMap from './EditablePinMap'
import type { PinPosition } from './LocationMap'

interface AddressDetailProps {
  result: AddressResult
  onBack: () => void
  onUse: (pin: PinPosition) => void
}

export default function AddressDetail({ result, onBack, onUse }: AddressDetailProps) {
  const [pin, setPin] = useState<PinPosition>({ lat: result.lat, lng: result.lng })
  const [isEditingPin, setIsEditingPin] = useState(false)

  return (
    <div className="p-6 pb-10">
      <button type="button" onClick={onBack} className="text-sm text-gray-500 hover:underline">
        ← Back to results
      </button>
      <h2 id="addresses-title" className="mt-2 mb-4 text-xl font-semibold">Address details</h2>

      <EditablePinMap
        key={`${pin.lat},${pin.lng}`}
        lat={pin.lat}
        lng={pin.lng}
        label={result.address}
        onSave={setPin}
        onEditingChange={setIsEditingPin}
      />

      <p className="mt-3 text-sm">{result.address}</p>

      <button
        type="button"
        onClick={() => onUse(pin)}
        disabled={isEditingPin}
        className="mt-4 w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Use This Address
      </button>
    </div>
  )
}
