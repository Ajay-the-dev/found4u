export { geohashForLocation } from 'geofire-common'

const EARTH_RADIUS_M = 6371008.8

/** Great-circle distance in metres between two `{ lat, lng }` points (Haversine). */
export function haversineMeters(a, b) {
  if (!a || !b) return null
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function formatDistance(meters) {
  if (meters == null || Number.isNaN(meters)) return ''
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`
}

export function defaultCenter() {
  const [lat, lng] = (import.meta.env.VITE_MAP_DEFAULT_CENTER || '40.7128,-74.0060').split(',').map(Number)
  return { lat, lng }
}

export function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocation is not supported by this browser.'))
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err) =>
        reject(
          new Error(
            err.code === err.PERMISSION_DENIED
              ? 'Location permission was denied.'
              : 'Could not determine your location.',
          ),
        ),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000, ...options },
    )
  })
}

/** Forward geocoding via OpenStreetMap Nominatim (light, user-initiated use only). */
export async function searchPlaces(queryText) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(queryText)}`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error('Place search is unavailable right now.')
  const rows = await res.json()
  return rows.map((r) => ({ lat: Number(r.lat), lng: Number(r.lon), address: r.display_name }))
}

export async function reverseGeocode({ lat, lng }) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&lat=${lat}&lon=${lng}`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) return ''
    const body = await res.json()
    return body.display_name || ''
  } catch {
    return ''
  }
}

export const osmLink = ({ lat, lng }) => `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`
