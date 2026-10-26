<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { L, createTileLayer, pinIcon, watchSize } from '@/utils/leaflet'
import { defaultCenter, getCurrentPosition, reverseGeocode, searchPlaces, formatDistance } from '@/utils/geo'

const props = defineProps({
  modelValue: { type: Object, default: null }, // { lat, lng, address }
  radius: { type: Number, default: null }, // metres — draws an alert-radius circle
  center: { type: Object, default: null },
  height: { type: String, default: '360px' },
  kind: { type: String, default: 'pick' },
})
const emit = defineEmits(['update:modelValue'])

const el = ref(null)
const searchText = ref('')
const results = ref([])
const searching = ref(false)
const locating = ref(false)
const error = ref('')

let map = null
let marker = null
let circle = null
let stopResize = null
let geocodeSeq = 0

onMounted(() => {
  const start = props.modelValue || props.center || defaultCenter()
  map = L.map(el.value, { scrollWheelZoom: true }).setView([start.lat, start.lng], props.modelValue ? 17 : 14)
  createTileLayer().addTo(map)
  map.on('click', (e) => setPoint({ lat: e.latlng.lat, lng: e.latlng.lng }))
  stopResize = watchSize(map, el.value)
  render()
})

onBeforeUnmount(() => {
  stopResize?.()
  map?.remove()
  map = null
})

watch(() => [props.modelValue, props.radius], render, { deep: true })

function render() {
  if (!map) return
  const v = props.modelValue
  if (!v) {
    marker?.remove()
    circle?.remove()
    marker = circle = null
    return
  }
  const latlng = [v.lat, v.lng]
  if (!marker) {
    marker = L.marker(latlng, { draggable: true, icon: pinIcon(props.kind) }).addTo(map)
    marker.on('dragend', () => {
      const p = marker.getLatLng()
      setPoint({ lat: p.lat, lng: p.lng })
    })
  } else {
    marker.setLatLng(latlng)
  }
  if (props.radius) {
    if (!circle) circle = L.circle(latlng, { radius: props.radius, color: '#4f46e5', weight: 1, fillOpacity: 0.08 }).addTo(map)
    else circle.setLatLng(latlng).setRadius(props.radius)
  } else {
    circle?.remove()
    circle = null
  }
}

async function setPoint(point, { pan = false, address } = {}) {
  error.value = ''
  emit('update:modelValue', { lat: point.lat, lng: point.lng, address: address ?? props.modelValue?.address ?? '' })
  if (pan) map?.setView([point.lat, point.lng], 17)
  if (address === undefined) {
    const seq = ++geocodeSeq
    const label = await reverseGeocode(point)
    if (seq !== geocodeSeq) return // a newer pin superseded this lookup
    emit('update:modelValue', { lat: point.lat, lng: point.lng, address: label })
  }
}

async function useMyLocation() {
  locating.value = true
  error.value = ''
  try {
    const pos = await getCurrentPosition()
    await setPoint(pos, { pan: true })
  } catch (err) {
    error.value = err.message
  } finally {
    locating.value = false
  }
}

async function search() {
  if (!searchText.value.trim()) return
  searching.value = true
  error.value = ''
  try {
    results.value = await searchPlaces(searchText.value.trim())
    if (!results.value.length) error.value = 'No places found for that search.'
  } catch (err) {
    error.value = err.message
  } finally {
    searching.value = false
  }
}

function pickResult(r) {
  results.value = []
  searchText.value = ''
  setPoint(r, { pan: true, address: r.address })
}

function clear() {
  emit('update:modelValue', null)
}
</script>

<template>
  <div>
    <div class="d-flex flex-wrap gap-2 mb-2">
      <form class="input-group input-group-sm flex-grow-1" style="min-width: 220px" @submit.prevent="search">
        <span class="input-group-text"><i class="bi bi-search"></i></span>
        <input v-model="searchText" class="form-control" placeholder="Search a building, street or landmark" />
        <button class="btn btn-outline-secondary" :disabled="searching">
          <span v-if="searching" class="spinner-border spinner-border-sm"></span><span v-else>Search</span>
        </button>
      </form>
      <button type="button" class="btn btn-sm btn-outline-primary" :disabled="locating" @click="useMyLocation">
        <span v-if="locating" class="spinner-border spinner-border-sm me-1"></span>
        <i v-else class="bi bi-crosshair me-1"></i>Use my location
      </button>
      <button v-if="modelValue" type="button" class="btn btn-sm btn-outline-secondary" @click="clear">
        <i class="bi bi-x-lg me-1"></i>Clear pin
      </button>
    </div>

    <div v-if="results.length" class="list-group list-group-flush border rounded mb-2 small">
      <button v-for="r in results" :key="`${r.lat},${r.lng}`" type="button" class="list-group-item list-group-item-action" @click="pickResult(r)">
        <i class="bi bi-geo-alt me-1 text-primary"></i>{{ r.address }}
      </button>
    </div>

    <div ref="el" class="map-container border" :style="{ height }"></div>

    <div class="small mt-2 d-flex flex-wrap gap-2 align-items-center">
      <span v-if="error" class="text-danger"><i class="bi bi-exclamation-circle me-1"></i>{{ error }}</span>
      <template v-else-if="modelValue">
        <span class="text-secondary"><i class="bi bi-pin-map-fill text-primary me-1"></i>{{ modelValue.address || `${modelValue.lat.toFixed(5)}, ${modelValue.lng.toFixed(5)}` }}</span>
        <span v-if="radius" class="badge text-bg-light border">Alert radius {{ formatDistance(radius) }}</span>
      </template>
      <span v-else class="text-secondary"><i class="bi bi-hand-index me-1"></i>Click the map to drop a pin — drag it to fine-tune.</span>
    </div>
  </div>
</template>
