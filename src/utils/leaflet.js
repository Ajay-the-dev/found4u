import L from 'leaflet'
// Styles ride along with the map chunk instead of the entry bundle.
import 'leaflet/dist/leaflet.css'

const TILE_URL = import.meta.env.VITE_MAP_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATTRIBUTION = import.meta.env.VITE_MAP_ATTRIBUTION || '&copy; OpenStreetMap contributors'

export function createTileLayer() {
  return L.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 19 })
}

/** Teardrop pin rendered with CSS + Bootstrap Icons (no image assets to bundle). */
export function pinIcon(kind = 'pick', icon = 'bi-geo-alt-fill') {
  return L.divIcon({
    className: '',
    html: `<div class="map-pin ${kind}"><i class="bi ${icon}"></i></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
    tooltipAnchor: [0, -30],
  })
}

export const ITEM_PIN = {
  lost: () => pinIcon('lost', 'bi-question-lg'),
  found: () => pinIcon('found', 'bi-check-lg'),
}

/** Keeps the map sized correctly when it is shown inside tabs, modals or collapsible sections. */
export function watchSize(map, el) {
  const ro = new ResizeObserver(() => map.invalidateSize())
  ro.observe(el)
  return () => ro.disconnect()
}

export { L }
