import { useUserLocation } from '../../context/LocationContext'
import { distanceInMiles, formatMiles } from '../../utils/distance'

interface RestaurantMetaProps {
  lat: number | null
  lng: number | null
  address: string | null
}

export default function RestaurantMeta({ lat, lng, address }: RestaurantMetaProps) {
  const { lat: userLat, lng: userLng } = useUserLocation()
  const hasDistance = userLat !== null && userLng !== null && lat !== null && lng !== null

  return (
    <>
      {hasDistance && (
        <p className="text-sm text-gray-500">
          {formatMiles(distanceInMiles(userLat, userLng, lat, lng))}
        </p>
      )}
      {address && <p className="truncate text-sm text-gray-500">{address}</p>}
    </>
  )
}
