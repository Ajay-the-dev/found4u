<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { L, createTileLayer, ITEM_PIN, pinIcon, watchSize } from '@/utils/leaflet'
import { defaultCenter } from '@/utils/geo'

const props = defineProps({
  items: { type: Array, default: () => [] }, // items with .location
  pings: { type: Array, default: () => [] }, // [{ id, lat, lng, label }]
  center: { type: Object, default: null },
  height: { type: String, default: '420px' },
  showRadius: { type: Boolean, default: false },
})
const emit = defineEmits(['select'])

const el = ref(null)
let map = null
let layer = null
let stopResize = null

onMounted(() => {
  const c = props.center || defaultCenter()
  map = L.map(el.value).setView([c.lat, c.lng], 14)
  createTileLayer().addTo(map)
  layer = L.featureGroup().addTo(map)
  stopResize = watchSize(map, el.value)
  render(true)
})

onBeforeUnmount(() => {
  stopResize?.()
  map?.remove()
  map = null
})

watch(() => [props.items, props.pings, props.showRadius], () => render(false), { deep: true })

function render(fit) {
  if (!map) return
  layer.clearLayers()
  for (const item of props.items) {
    if (!item.location) continue
    const latlng = [item.location.lat, item.location.lng]
    const marker = L.marker(latlng, { icon: ITEM_PIN[item.type]?.() || pinIcon() })
    marker.bindTooltip(`${item.type === 'lost' ? 'Lost' : 'Found'}: ${escapeHtml(item.title)}`, { direction: 'top' })
    marker.on('click', () => emit('select', item))
    layer.addLayer(marker)
    if (props.showRadius && item.type === 'lost' && item.alertRadiusMeters) {
      layer.addLayer(
        L.circle(latlng, { radius: item.alertRadiusMeters, color: '#e11d48', weight: 1, fillOpacity: 0.05, interactive: false }),
      )
    }
  }
  for (const p of props.pings) {
    const marker = L.marker([p.lat, p.lng], { icon: pinIcon('scan', 'bi-qr-code') })
    if (p.label) marker.bindTooltip(escapeHtml(p.label), { direction: 'top' })
    layer.addLayer(marker)
  }
  const bounds = layer.getBounds()
  if ((fit || props.items.length + props.pings.length <= 1) && bounds.isValid()) {
    map.fitBounds(bounds.pad(0.25), { maxZoom: 17 })
  }
}

function escapeHtml(s = '') {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}
</script>

<template>
  <div ref="el" class="map-container border" :style="{ height }"></div>
</template>
