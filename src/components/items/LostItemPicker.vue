<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useItemStore } from '@/stores/item'
import { useOrgStore } from '@/stores/org'
import { CATEGORIES, CATEGORY_MAP } from '@/utils/constants'
import { imageUrl } from '@/services/media'
import { formatDate, timeAgo } from '@/utils/format'
import { getCurrentPosition, haversineMeters, formatDistance } from '@/utils/geo'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import EmptyState from '@/components/common/EmptyState.vue'

/*
 * Step 1 of "I found something": show open lost reports near the finder so they can
 * pick the owner's report directly instead of filing a disconnected found item.
 * Emits `pick(lostItem, position)` or `skip(position)`; `position` may be null.
 */
const emit = defineEmits(['pick', 'skip'])

const auth = useAuthStore()
const itemStore = useItemStore()
const org = useOrgStore()

const feeds = ref({}) // scope key → items
const loading = ref(true)
const position = ref(null)
const locating = ref(false)
const locateError = ref('')
const search = ref('')
const category = ref('')
const showAll = ref(false)

const PAGE = 12

// Current workspace, plus the public network when working inside an organization.
const scopes = computed(() => (org.currentOrgId ? [org.currentOrgId, null] : [null]))
let unsubs = []
watch(
  scopes,
  (list) => {
    unsubs.forEach((u) => u())
    feeds.value = {}
    loading.value = true
    let pending = list.length
    const settle = () => (pending = Math.max(0, pending - 1)) || (loading.value = false)
    unsubs = list.map((orgId) =>
      itemStore.watchFeed(
        orgId,
        (items) => {
          feeds.value = { ...feeds.value, [orgId || 'public']: items }
          settle()
        },
        settle,
      ),
    )
  },
  { immediate: true },
)
onBeforeUnmount(() => unsubs.forEach((u) => u()))

async function locate() {
  locating.value = true
  locateError.value = ''
  try {
    position.value = await getCurrentPosition()
  } catch (err) {
    locateError.value = err.message
  } finally {
    locating.value = false
  }
}
onMounted(locate)

const candidates = computed(() => {
  const q = search.value.trim().toLowerCase()
  const seen = new Set()
  return Object.values(feeds.value)
    .flat()
    .filter((i) => {
      if (seen.has(i.id)) return false
      seen.add(i.id)
      if (i.type !== 'lost' || !['open', 'under_review'].includes(i.status) || i.reporterId === auth.uid) return false
      if (category.value && i.category !== category.value) return false
      if (q && !`${i.title} ${i.description || ''} ${i.location?.address || ''} ${i.areasVisited || ''}`.toLowerCase().includes(q)) return false
      return true
    })
    .map((i) => {
      const distance = position.value && i.location ? haversineMeters(position.value, i.location) : null
      return { ...i, _distance: distance, _inRadius: distance != null && distance <= (i.alertRadiusMeters || 1000) }
    })
    .sort((a, b) => (a._distance ?? Infinity) - (b._distance ?? Infinity))
})
const visible = computed(() => (showAll.value ? candidates.value : candidates.value.slice(0, PAGE)))
const usedCategories = computed(() => CATEGORIES.filter((c) => Object.values(feeds.value).flat().some((i) => i.type === 'lost' && i.category === c.value)))

const pos = () => (position.value ? { lat: position.value.lat, lng: position.value.lng } : null)
</script>

<template>
  <div>
    <div class="card mb-3">
      <div class="card-body">
        <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
          <div>
            <h2 class="section-title mb-1">Is it one of these?</h2>
            <p class="small text-secondary mb-0">
              People nearby have reported losing these. If you recognise it, pick it and the owner is alerted straight away.
            </p>
          </div>
          <button type="button" class="btn btn-sm btn-outline-secondary" :disabled="locating" @click="locate">
            <span v-if="locating" class="spinner-border spinner-border-sm me-1"></span>
            <i v-else class="bi me-1" :class="position ? 'bi-crosshair2 text-primary' : 'bi-crosshair'"></i>
            {{ position ? 'Sorted by distance' : 'Use my location' }}
          </button>
        </div>
        <div v-if="locateError" class="small text-secondary mb-2"><i class="bi bi-info-circle me-1"></i>{{ locateError }} Showing the most recent reports instead.</div>
        <div class="d-flex flex-column flex-sm-row gap-2">
          <div class="position-relative flex-grow-1">
            <i class="bi bi-search position-absolute text-secondary" style="left: 0.8rem; top: 50%; transform: translateY(-50%)"></i>
            <input v-model="search" type="search" class="form-control" style="padding-left: 2.2rem" placeholder="Search: colour, brand, place…" />
          </div>
          <select v-model="category" class="form-select picker-category">
            <option value="">All categories</option>
            <option v-for="c in usedCategories" :key="c.value" :value="c.value">{{ c.label }}</option>
          </select>
        </div>
      </div>
    </div>

    <LoadingSpinner v-if="loading" label="Looking for lost reports nearby…" />

    <div v-else-if="!candidates.length" class="card mb-3">
      <EmptyState
        icon="bi-search"
        :title="search || category ? 'Nothing matches that search' : 'No open lost reports right now'"
        text="No problem — describe what you found and we'll alert the owner if they report it later."
      />
    </div>

    <div v-else v-reveal.stagger="{ stagger: 0.04, y: 12 }" class="d-flex flex-column gap-2 mb-3">
      <div v-for="i in visible" :key="i.id" class="card lost-row">
        <div class="card-body d-flex align-items-center gap-3 py-2">
          <img v-if="i.photos?.[0]" :src="imageUrl(i.photos[0], { width: 120, height: 120, crop: 'fill' })" class="lost-thumb" :alt="i.title" loading="lazy" />
          <span v-else class="lost-thumb d-inline-flex align-items-center justify-content-center tone-secondary"><i class="bi fs-5" :class="(CATEGORY_MAP[i.category] || CATEGORY_MAP.other).icon"></i></span>

          <div class="min-w-0 flex-grow-1">
            <div class="d-flex align-items-center gap-2">
              <span class="fw-semibold text-body text-truncate">{{ i.title }}</span>
              <span v-if="i._inRadius" class="badge text-bg-success flex-shrink-0">Near you</span>
            </div>
            <div class="small text-secondary d-flex flex-wrap column-gap-3">
              <span><i class="bi me-1" :class="(CATEGORY_MAP[i.category] || CATEGORY_MAP.other).icon"></i>{{ (CATEGORY_MAP[i.category] || CATEGORY_MAP.other).label }}</span>
              <span><i class="bi bi-calendar3 me-1"></i>Lost {{ formatDate(i.dateFrom) }}</span>
              <span v-if="i._distance != null" class="text-primary"><i class="bi bi-signpost-2 me-1"></i>{{ formatDistance(i._distance) }} away</span>
              <span v-else-if="!i.location"><i class="bi bi-question-diamond me-1"></i>Location unknown</span>
            </div>
            <div v-if="i.description" class="small text-secondary text-truncate">{{ i.description }}</div>
          </div>

          <div class="row-actions d-flex flex-column flex-sm-row gap-1 flex-shrink-0">
            <RouterLink :to="`/items/${i.id}`" target="_blank" class="btn btn-sm btn-link text-body d-none d-sm-inline-block" title="Open the full report in a new tab">Details</RouterLink>
            <button type="button" class="btn btn-sm btn-success" @click="emit('pick', i, pos())"><i class="bi bi-check2 me-1"></i>This is it</button>
          </div>
        </div>
        <div class="px-3 pb-2 small text-secondary d-none d-md-block" style="margin-top: -0.25rem">Reported {{ timeAgo(i.createdAt) }} by {{ i.reporterName }}</div>
      </div>
      <button v-if="candidates.length > PAGE && !showAll" type="button" class="btn btn-sm btn-link" @click="showAll = true">
        Show {{ candidates.length - PAGE }} more
      </button>
    </div>

    <div class="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-2 border-top pt-3">
      <span class="small text-secondary">Not listed? The owner may not have reported it yet.</span>
      <button type="button" class="btn btn-primary" @click="emit('skip', pos())">
        None of these — describe it <i class="bi bi-arrow-right ms-1"></i>
      </button>
    </div>
  </div>
</template>

<style scoped>
.lost-row { transition: border-color 0.2s ease, box-shadow 0.2s ease; }
.lost-row:hover { border-color: var(--fi-line-strong); box-shadow: var(--fi-shadow-sm); }
.picker-category { max-width: 220px; }
@media (max-width: 767.98px) {
  .lost-row .card-body { flex-wrap: wrap; row-gap: 0.6rem !important; padding: 0.85rem; }
  .lost-row .card-body > .min-w-0 { flex: 1 1 0; }
  .lost-row .row-actions { flex: 1 0 100%; flex-direction: row !important; }
  .lost-row .row-actions .btn-success { flex: 1; }
  .picker-category { max-width: none; }
}
.lost-thumb { width: 3.25rem; height: 3.25rem; border-radius: 0.65rem; object-fit: cover; flex-shrink: 0; background: var(--fi-sunken); }
</style>
