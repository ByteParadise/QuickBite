const EARTH_RADIUS_MILES = 3958.8

const toRadians = (degrees: number) => (degrees * Math.PI) / 180

/** Straight-line (great-circle) distance using the haversine formula. */
export function distanceInMiles(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): number {
  const dLat = toRadians(toLat - fromLat)
  const dLng = toRadians(toLng - fromLng)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(fromLat)) * Math.cos(toRadians(toLat)) * Math.sin(dLng / 2) ** 2

  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(a))
}

export function formatMiles(miles: number): string {
  return miles < 0.1 ? '< 0.1 mi' : `${miles.toFixed(1)} mi`
}
