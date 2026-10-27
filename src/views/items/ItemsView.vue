<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useItemStore } from '@/stores/item'
import { useOrgStore } from '@/stores/org'
import { CATEGORIES, ITEM_STATUSES, STATUS_META } from '@/utils/constants'
import { getCurrentPosition, haversineMeters } from '@/utils/geo'
import ItemCard from '@/components/items/ItemCard.vue'
import ItemsMap from '@/components/map/ItemsMap.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorAlert from '@/components/common/ErrorAlert.vue'

const router = useRouter()
const itemStore = useItemStore()
const org = useOrgStore()

const items = ref([])
const loading = ref(true)
const error = ref(null)

const type = ref('all')
const category = ref('')
const status = ref('active')
const search = ref('')
const view = ref('grid')
const nearMe = ref(null) // { lat, lng }
const locating = ref(false)

let unsub = null
function subscribe() {
  unsub?.()
  loading.value = true
  error.value = null
  unsub = itemStore.watchFeed(
    org.currentOrgId,
    (list) => {
      items.value = list
      loading.value = false
    },
    (err) => {
      error.value = err
      loading.value = false
    },
  )
}
watch(() => org.currentOrgId, subscribe, { immediate: true })
onBeforeUnmount(() => unsub?.())

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  let list = items.value.filter((i) => {
    if (type.value !== 'all' && i.type !== type.value) return false
    if (category.value && i.category !== category.value) return false
    if (status.value === 'active' && !['open', 'under_review', 'matched'].includes(i.status)) return false
    if (status.value !== 'active' && status.value !== 'all' && i.status !== status.value) return false
    if (q && !`${i.title} ${i.description} ${i.location?.address || ''}`.toLowerCase().includes(q)) return false
    return true
  })
  if (nearMe.value) {
    list = list
      .map((i) => ({ ...i, _distance: i.location ? haversineMeters(nearMe.value, i.location) : null }))
      .sort((a, b) => (a._distance ?? Infinity) - (b._distance ?? Infinity))
  }
  return list
})
const mappable = computed(() => filtered.value.filter((i) => i.location))

async function toggleNearMe() {
  if (nearMe.value) return (nearMe.value = null)
  locating.value = true
  try {
    nearMe.value = await getCurrentPosition()
  } catch (err) {
    error.value = err
  } finally {
    locating.value = false
  }
}
</script>

<template>
  <div class="container py-4">
    <div class="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-3">
      <div>
        <h1 class="h3 mb-1">Browse items</h1>
        <p class="text-secondary small mb-0 d-none d-md-block">
          <i class="bi" :class="org.currentOrg ? 'bi-building' : 'bi-globe2'"></i>
          {{ org.currentOrg ? `${org.currentOrg.name} — members only` : 'Public network' }} · switch workspace from the top bar
        </p>
      </div>
      <div class="btn-group" role="group" aria-label="View">
        <button class="btn btn-outline-secondary" :class="{ active: view === 'grid' }" @click="view = 'grid'"><i class="bi bi-grid-3x3-gap"></i> Grid</button>
        <button class="btn btn-outline-secondary" :class="{ active: view === 'map' }" @click="view = 'map'"><i class="bi bi-map"></i> Map</button>
      </div>
    </div>

    <div class="card mb-3 filter-card">
      <div class="card-body row g-2 align-items-center">
        <div class="col-12 col-lg-auto">
          <div class="btn-group w-100" role="group">
            <button v-for="t in ['all', 'lost', 'found']" :key="t" class="btn btn-sm" :class="type === t ? 'btn-primary' : 'btn-outline-primary'" @click="type = t">
              {{ t === 'all' ? 'All' : t === 'lost' ? 'Lost' : 'Found' }}
            </button>
          </div>
        </div>
        <div class="col-6 col-lg-2">
          <select v-model="category" class="form-select form-select-sm" aria-label="Category">
            <option value="">All categories</option>
            <option v-for="c in CATEGORIES" :key="c.value" :value="c.value">{{ c.label }}</option>
          </select>
        </div>
        <div class="col-6 col-lg-2">
          <select v-model="status" class="form-select form-select-sm" aria-label="Status">
            <option value="active">Active</option>
            <option value="all">Any status</option>
            <option v-for="s in ITEM_STATUSES" :key="s" :value="s">{{ STATUS_META[s].label }}</option>
          </select>
        </div>
        <div class="col">
          <div class="input-group input-group-sm">
            <span class="input-group-text"><i class="bi bi-search"></i></span>
            <input v-model="search" class="form-control" placeholder="Search title, description, place…" />
          </div>
        </div>
        <div class="col-auto">
          <button class="btn btn-sm" :class="nearMe ? 'btn-primary' : 'btn-outline-secondary'" :disabled="locating" @click="toggleNearMe">
            <span v-if="locating" class="spinner-border spinner-border-sm"></span>
            <i v-else class="bi bi-crosshair"></i> Near me
          </button>
        </div>
      </div>
    </div>

    <ErrorAlert :error="error" retryable @retry="subscribe" />
    <LoadingSpinner v-if="loading" />

    <template v-else-if="view === 'map'">
      <ItemsMap :items="mappable" :center="nearMe || org.currentOrg?.settings?.center" height="560px" show-radius @select="(i) => router.push(`/items/${i.id}`)" />
      <p class="small text-secondary mt-2">
        <span class="text-lost"><i class="bi bi-geo-alt-fill"></i> Lost</span> ·
        <span class="text-found"><i class="bi bi-geo-alt-fill"></i> Found</span> ·
        {{ filtered.length - mappable.length }} item(s) without a location aren't shown.
      </p>
    </template>

    <div v-else-if="filtered.length" v-reveal.stagger="{ stagger: 0.04 }" class="row g-3 item-grid">
      <div v-for="item in filtered" :key="item.id" class="col-sm-6 col-lg-4 col-xl-3">
        <ItemCard :item="item" :distance="item._distance ?? null" />
      </div>
    </div>

    <div v-else class="card">
      <EmptyState icon="bi-search" title="Nothing matches those filters" text="Try widening the filters, or be the first to report something.">
        <RouterLink to="/report/found" class="btn btn-sm btn-success me-2">Log a found item</RouterLink>
        <RouterLink to="/report/lost" class="btn btn-sm btn-outline-danger">Report a lost item</RouterLink>
      </EmptyState>
    </div>
  </div>
</template>
