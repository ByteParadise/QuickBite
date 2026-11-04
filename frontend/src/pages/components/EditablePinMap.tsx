import { lazy, Suspense, useState } from 'react'
import type { PinPosition } from './LocationMap'

const LocationMap = lazy(() => import('./LocationMap'))

const MAP_BUTTON_CLASS =
  'rounded-md bg-white px-3 py-1.5 text-sm font-medium shadow hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50'

interface EditablePinMapProps {
  lat: number
  lng: number
  label: string
  onSave: (position: PinPosition) => void
  onEditingChange?: (isEditing: boolean) => void
}

export default function EditablePinMap({ lat, lng, label, onSave, onEditingChange }: EditablePinMapProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draftPin, setDraftPin] = useState<PinPosition | null>(null)
  const [mapResetCount, setMapResetCount] = useState(0)

  const startEditing = () => {
    setIsEditing(true)
    onEditingChange?.(true)
  }

  const cancelEditing = () => {
    setDraftPin(null)
    setIsEditing(false)
    // The map itself moved during editing, so remount it at the saved location.
    setMapResetCount((count) => count + 1)
    onEditingChange?.(false)
  }

  const savePin = () => {
    if (!draftPin) return
    onEditingChange?.(false)
    onSave(draftPin)
  }


  return (
    <div className="relative">
      <Suspense fallback={<div className="h-48 w-full rounded-lg bg-gray-100" />}>
        <LocationMap
          key={mapResetCount}
          lat={lat}
          lng={lng}
          label={label}
          isEditingPin={isEditing}
          onPinMove={setDraftPin}
        />
      </Suspense>

      <div className="absolute right-2 top-2 z-10 flex gap-2">
        {isEditing ? (
          <>
            <button type="button" onClick={cancelEditing} className={MAP_BUTTON_CLASS}>
              Cancel
            </button>
            <button
              type="button"
              onClick={savePin}
              disabled={!draftPin}
              className={MAP_BUTTON_CLASS}
            >
              Save Pin
            </button>
          </>
        ) : (
          <button type="button" onClick={startEditing} className={MAP_BUTTON_CLASS}>
            Edit Pin
          </button>
        )}
      </div>

      {isEditing && (
        <p className="mt-1 text-xs text-gray-500">Move the map to place the pin on the exact location.</p>
      )}
    </div>
  )
}
