import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet'

const DEFAULT_ZOOM = 16

const PIN_ICON = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  shadowSize: [41, 41],
})

export interface PinPosition {
  lat: number
  lng: number
}

interface LocationMapProps {
  lat: number
  lng: number
  label: string
  isEditingPin?: boolean
  onPinMove?: (position: PinPosition) => void
}

function MapCenterTracker({ onMove }: { onMove: (position: PinPosition) => void }) {
  const map = useMapEvents({
    moveend: () => {
      const { lat, lng } = map.getCenter()
      onMove({ lat, lng })
    },
  })
  return null
}

export default function LocationMap({
  lat,
  lng,
  label,
  isEditingPin = false,
  onPinMove,
}: LocationMapProps) {
  return (
    <div className="relative">
      <MapContainer
        key={`${lat},${lng}`}
        center={[lat, lng]}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom={false}
        className="isolate h-48 w-full rounded-lg"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {isEditingPin ? (
          onPinMove && <MapCenterTracker onMove={onPinMove} />
        ) : (
          <Marker position={[lat, lng]} icon={PIN_ICON} title={label} alt={label} />
        )}
      </MapContainer>

      {/* Stays fixed over the map's center, with its tip on the location. */}
      {isEditingPin && (
        <img
          src={markerIcon}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-[41px] w-[25px] max-w-none -translate-x-1/2 -translate-y-full"
        />
      )}
    </div>
  )
}
