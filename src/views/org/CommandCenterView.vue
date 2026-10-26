<script setup>
import { ref, reactive, computed, watch, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useOrgStore } from '@/stores/org'
import { useItemStore } from '@/stores/item'
import { useChatStore } from '@/stores/chat'
import { useUiStore } from '@/stores/ui'
import { CATEGORIES, CATEGORY_MAP, ITEM_STATUSES, STATUS_META, ACTIVE_STATUSES, DEFAULT_ALERT_RADIUS } from '@/utils/constants'
import { haversineMeters, formatDistance } from '@/utils/geo'
import { timeAgo, toDate } from '@/utils/format'
import MatchCard from '@/components/items/MatchCard.vue'
import ItemsMap from '@/components/map/ItemsMap.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorAlert from '@/components/common/ErrorAlert.vue'

const route = useRoute()
const router = useRouter()
const org = useOrgStore()
const itemStore = useItemStore()
const chat = useChatStore()
const ui = useUiStore()

const orgId = computed(() => route.params.orgId)
const orgDoc = computed(() => org.orgs[orgId.value])
const orgRadius = computed(() => orgDoc.value?.settings?.alertRadiusMeters || DEFAULT_ALERT_RADIUS)

const TABS = [
  { key: 'incidents', label: 'Incidents', icon: 'bi-list-task' },
  { key: 'matches', label: 'Matches', icon: 'bi-link-45deg' },
  { key: 'proximity', label: 'Proximity flags', icon: 'bi-radar' },
  { key: 'map', label: 'Live map', icon: 'bi-map' },
]
const tab = computed({
  get: () => (TABS.some((t) => t.key === route.query.tab) ? route.query.tab : 'incidents'),
  set: (key) => router.replace({ query: { ...route.query, tab: key } }),
})

// ───────────── data ─────────────
const items = ref([])
const matches = ref([])
const loading = ref(true)
const error = ref(null)
let unsubs = []

watch(
  orgId,
  (id) => {
    unsubs.forEach((u) => u())
    loading.value = true
    error.value = null
    const onError = (err) => {
      error.value = err
      loading.value = false
    }
    unsubs = [
      itemStore.watchFeed(id, (list) => {
        items.value = list
        loading.value = false
      }, onError, 500),
      itemStore.watchOrgMatches(id, (list) => (matches.value = list), onError),
    ]
  },
  { immediate: true },
)
onBeforeUnmount(() => unsubs.forEach((u) => u()))

const byId = computed(() => Object.fromEntries(items.value.map((i) => [i.id, i])))

const stats = computed(() => {
  const monthAgo = Date.now() - 30 * 86400000
  return [
    { label: 'Open lost', value: items.value.filter((i) => i.type === 'lost' && i.status === 'open').length, tone: 'lost', icon: 'bi-question-circle' },
    { label: 'Open found', value: items.value.filter((i) => i.type === 'found' && i.status === 'open').length, tone: 'found', icon: 'bi-box2-heart' },
    { label: 'Under review', value: items.value.filter((i) => i.status === 'under_review').length, tone: 'warning', icon: 'bi-hourglass-split' },
    { label: 'Pending matches', value: matches.value.filter((m) => m.status === 'pending').length, tone: 'primary', icon: 'bi-link-45deg' },
    { label: 'Proximity flags', value: proximityFlags.value.length, tone: 'info', icon: 'bi-radar' },
    { label: 'Returned (30d)', value: items.value.filter((i) => ['claimed', 'resolved'].includes(i.status) && (toDate(i.updatedAt)?.getTime() ?? 0) > monthAgo).length, tone: 'secondary', icon: 'bi-bag-check' },
  ]
})

// ───────────── incidents ─────────────
const filters = reactive({ type: 'all', status: 'active', category: '', q: '' })
const incidents = computed(() => {
  const q = filters.q.trim().toLowerCase()
  return items.value.filter((i) => {
    if (filters.type !== 'all' && i.type !== filters.type) return false
    if (filters.status === 'active' && !['open', 'under_review', 'matched'].includes(i.status)) return false
    if (!['active', 'all'].includes(filters.status) && i.status !== filters.status) return false
    if (filters.category && i.category !== filters.category) return false
    if (q && !`${i.title} ${i.description} ${i.reporterName}`.toLowerCase().includes(q)) return false
    return true
  })
})
const matchCountFor = (id) => matches.value.filter((m) => (m.lostItemId === id || m.foundItemId === id) && m.status !== 'dismissed').length

async function setStatus(item, status) {
  try {
    await itemStore.updateStatus(item.id, status, 'Updated from command center')
    ui.toast(`“${item.title}” → ${STATUS_META[status].label}`)
  } catch (err) {
    ui.error(err, 'Could not update status')
  }
}

async function contact(item) {
  try {
    router.push(`/chats/${await chat.openItemChat(item, { asStaffOf: orgId.value })}`)
  } catch (err) {
    ui.error(err, 'Could not open chat')
  }
}

// ───────────── matches ─────────────
const matchFilter = ref('open')
const visibleMatches = computed(() =>
  matches.value.filter((m) => (matchFilter.value === 'open' ? ['pending', 'confirmed'].includes(m.status) : matchFilter.value === 'all' || m.status === matchFilter.value)),
)

async function setMatchStatus(m, status) {
  try {
    await itemStore.updateMatch(m.id, { status })
    ui.toast({ confirmed: 'Match confirmed — both items marked Matched', dismissed: 'Match dismissed', completed: 'Handover complete — items marked Claimed' }[status])
  } catch (err) {
    ui.error(err, 'Could not update match')
  }
}

const handover = reactive({ show: false, match: null, location: '', when: '', notes: '', saving: false })
function openHandover(m) {
  Object.assign(handover, {
    show: true,
    match: m,
    location: m.handover?.location || orgDoc.value?.description?.slice(0, 80) || '',
    when: m.handover?.when || '',
    notes: m.handover?.notes || '',
  })
}
async function saveHandover() {
  if (!handover.location.trim()) return ui.toast('Add a handover location', 'warning')
  handover.saving = true
  try {
    await itemStore.updateMatch(handover.match.id, {
      handover: { location: handover.location.trim(), when: handover.when, notes: handover.notes.trim() },
    })
    ui.toast('Handover scheduled', 'success', { body: 'Owner and finder can see the details on the match.' })
    handover.show = false
  } catch (err) {
    ui.error(err, 'Could not save handover')
  } finally {
    handover.saving = false
  }
}

// ───────────── proximity flags (client-side Haversine scan) ─────────────
const existingPairs = computed(() => new Set(matches.value.map((m) => m.id)))
const proximityFlags = computed(() => {
  const active = items.value.filter((i) => ACTIVE_STATUSES.includes(i.status) && i.location)
  const lost = active.filter((i) => i.type === 'lost')
  const found = active.filter((i) => i.type === 'found')
  const flags = []
  for (const l of lost) {
    const radius = l.alertRadiusMeters || orgRadius.value
    for (const f of found) {
      if (f.category !== l.category || existingPairs.value.has(`${l.id}_${f.id}`)) continue
      if (l.dateFrom && f.dateFound && f.dateFound < l.dateFrom) continue
      const d = haversineMeters(l.location, f.location)
      if (d <= radius) flags.push({ key: `${l.id}_${f.id}`, lost: l, found: f, distance: d, radius })
    }
  }
  return flags.sort((a, b) => a.distance - b.distance)
})

const linking = ref(null)
async function linkFlag(flag) {
  linking.value = flag.key
  try {
    await itemStore.createManualMatch(flag.lost, flag.found, Math.round(flag.distance))
    ui.toast('Match created', 'success', { body: 'Owner and finder have been notified.' })
  } catch (err) {
    ui.error(err, 'Could not create match')
  } finally {
    linking.value = null
  }
}

// ───────────── map ─────────────
const mapItems = computed(() => items.value.filter((i) => i.location && ['open', 'under_review', 'matched'].includes(i.status)))
</script>

<template>
  <div class="container py-4">
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
      <div>
        <RouterLink :to="`/orgs/${orgId}`" class="small text-decoration-none"><i class="bi bi-arrow-left me-1"></i>{{ orgDoc?.name }}</RouterLink>
        <h1 class="h3 mb-0"><i class="bi bi-broadcast text-primary me-2"></i>Command center</h1>
      </div>
      <span class="badge text-bg-success"><i class="bi bi-circle-fill me-1" style="font-size: 0.5rem"></i>Live</span>
    </div>

    <ErrorAlert :error="error" />

    <div class="row g-3 mb-4">
      <div v-for="s in stats" :key="s.label" class="col-6 col-md-4 col-xl-2">
        <div class="card stat-card h-100">
          <div class="card-body d-flex align-items-center gap-2 p-3">
            <span class="stat-icon" :class="`tone-${s.tone}`"><i class="bi" :class="s.icon"></i></span>
            <div>
              <div class="h5 mb-0">{{ s.value }}</div>
              <div class="small text-secondary lh-sm">{{ s.label }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <ul class="nav nav-pills mb-3 gap-1">
      <li v-for="t in TABS" :key="t.key" class="nav-item">
        <button class="nav-link" :class="{ active: tab === t.key }" @click="tab = t.key">
          <i class="bi me-1" :class="t.icon"></i>{{ t.label }}
          <span v-if="t.key === 'proximity' && proximityFlags.length" class="badge rounded-pill text-bg-danger ms-1">{{ proximityFlags.length }}</span>
        </button>
      </li>
    </ul>

    <LoadingSpinner v-if="loading" />

    <!-- Incidents -->
    <div v-else-if="tab === 'incidents'" class="card">
      <div class="card-header bg-white row g-2 align-items-center mx-0">
        <div class="col-6 col-md-2">
          <select v-model="filters.type" class="form-select form-select-sm" aria-label="Type">
            <option value="all">Lost & found</option>
            <option value="lost">Lost only</option>
            <option value="found">Found only</option>
          </select>
        </div>
        <div class="col-6 col-md-2">
          <select v-model="filters.status" class="form-select form-select-sm" aria-label="Status">
            <option value="active">Active</option>
            <option value="all">All statuses</option>
            <option v-for="s in ITEM_STATUSES" :key="s" :value="s">{{ STATUS_META[s].label }}</option>
          </select>
        </div>
        <div class="col-6 col-md-2">
          <select v-model="filters.category" class="form-select form-select-sm" aria-label="Category">
            <option value="">All categories</option>
            <option v-for="c in CATEGORIES" :key="c.value" :value="c.value">{{ c.label }}</option>
          </select>
        </div>
        <div class="col-6 col-md">
          <input v-model="filters.q" class="form-control form-control-sm" placeholder="Search incidents" />
        </div>
      </div>
      <div v-if="!incidents.length"><EmptyState icon="bi-inbox" title="No incidents match these filters" /></div>
      <div v-else class="table-responsive">
        <table class="table table-hover align-middle mb-0 small">
          <thead class="table-light">
            <tr>
              <th>Item</th>
              <th class="d-none d-lg-table-cell">Reporter</th>
              <th class="d-none d-md-table-cell">Location</th>
              <th>Status</th>
              <th class="d-none d-md-table-cell text-center">Matches</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="i in incidents" :key="i.id">
              <td>
                <RouterLink :to="`/items/${i.id}`" class="text-decoration-none text-body d-flex align-items-center gap-2">
                  <span class="badge" :class="i.type === 'lost' ? 'bg-lost' : 'bg-found'">{{ i.type === 'lost' ? 'L' : 'F' }}</span>
                  <span class="min-w-0">
                    <span class="d-block fw-semibold text-truncate" style="max-width: 260px">{{ i.title }}</span>
                    <span class="d-block text-secondary"><i class="bi me-1" :class="CATEGORY_MAP[i.category]?.icon"></i>{{ CATEGORY_MAP[i.category]?.label }} · {{ timeAgo(i.createdAt) }}</span>
                  </span>
                </RouterLink>
              </td>
              <td class="d-none d-lg-table-cell">{{ i.reporterName }}</td>
              <td class="d-none d-md-table-cell text-truncate" style="max-width: 220px">
                <span v-if="i.location"><i class="bi bi-geo-alt text-primary me-1"></i>{{ i.location.address || 'Pinned' }}</span>
                <span v-else class="text-secondary"><i class="bi bi-question-diamond me-1"></i>Unknown</span>
              </td>
              <td style="min-width: 150px">
                <select class="form-select form-select-sm" :value="i.status" :aria-label="`Status of ${i.title}`" @change="setStatus(i, $event.target.value)">
                  <option v-for="s in ITEM_STATUSES" :key="s" :value="s">{{ STATUS_META[s].label }}</option>
                </select>
              </td>
              <td class="d-none d-md-table-cell text-center">
                <span v-if="matchCountFor(i.id)" class="badge text-bg-info">{{ matchCountFor(i.id) }}</span>
                <span v-else class="text-secondary">—</span>
              </td>
              <td class="text-end text-nowrap">
                <button class="btn btn-sm btn-light" title="Message reporter" @click="contact(i)"><i class="bi bi-chat-dots"></i></button>
                <RouterLink :to="`/items/${i.id}`" class="btn btn-sm btn-light" title="Open"><i class="bi bi-box-arrow-up-right"></i></RouterLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Matches -->
    <div v-else-if="tab === 'matches'">
      <div class="btn-group btn-group-sm mb-3">
        <button v-for="f in ['open', 'pending', 'confirmed', 'completed', 'dismissed', 'all']" :key="f" class="btn" :class="matchFilter === f ? 'btn-primary' : 'btn-outline-primary'" @click="matchFilter = f">
          {{ f[0].toUpperCase() + f.slice(1) }}
        </button>
      </div>
      <div v-if="visibleMatches.length" class="row g-3">
        <div v-for="m in visibleMatches" :key="m.id" class="col-lg-6">
          <MatchCard
            :match="m"
            perspective="staff"
            @confirm="setMatchStatus($event, 'confirmed')"
            @dismiss="setMatchStatus($event, 'dismissed')"
            @complete="setMatchStatus($event, 'completed')"
            @handover="openHandover"
          />
        </div>
      </div>
      <div v-else class="card"><EmptyState icon="bi-link-45deg" title="No matches here" text="System matches appear automatically. Link pairs yourself from Proximity flags." /></div>
    </div>

    <!-- Proximity flags -->
    <div v-else-if="tab === 'proximity'">
      <p class="small text-secondary">
        Active lost and found items in the same category that lie within the lost report's alert radius (default {{ formatDistance(orgRadius) }}) but haven't been linked yet.
      </p>
      <div v-if="proximityFlags.length" class="card">
        <div class="list-group list-group-flush">
          <div v-for="f in proximityFlags" :key="f.key" class="list-group-item d-flex flex-wrap align-items-center gap-3">
            <span class="badge text-bg-info fs-6" style="min-width: 74px">{{ formatDistance(f.distance) }}</span>
            <div class="flex-grow-1 min-w-0 row g-2">
              <RouterLink :to="`/items/${f.lost.id}`" class="col-md-6 text-decoration-none text-truncate"><span class="text-lost fw-semibold">LOST</span> {{ f.lost.title }}</RouterLink>
              <RouterLink :to="`/items/${f.found.id}`" class="col-md-6 text-decoration-none text-truncate"><span class="text-found fw-semibold">FOUND</span> {{ f.found.title }}</RouterLink>
            </div>
            <span class="small text-secondary"><i class="bi me-1" :class="CATEGORY_MAP[f.lost.category]?.icon"></i>radius {{ formatDistance(f.radius) }}</span>
            <button class="btn btn-sm btn-primary" :disabled="linking === f.key" @click="linkFlag(f)">
              <span v-if="linking === f.key" class="spinner-border spinner-border-sm me-1"></span><i v-else class="bi bi-link me-1"></i>Link as match
            </button>
          </div>
        </div>
      </div>
      <div v-else class="card"><EmptyState icon="bi-radar" title="No unlinked proximity flags" text="Every nearby pair has already been matched or dismissed." /></div>
    </div>

    <!-- Map -->
    <div v-else-if="tab === 'map'">
      <ItemsMap :items="mapItems" :center="orgDoc?.settings?.center" height="calc(100vh - 360px)" show-radius @select="(i) => router.push(`/items/${i.id}`)" />
      <p class="small text-secondary mt-2">
        <span class="text-lost"><i class="bi bi-geo-alt-fill"></i> Lost (with alert radius)</span> ·
        <span class="text-found"><i class="bi bi-geo-alt-fill"></i> Found</span> · {{ mapItems.length }} active pinned items
      </p>
    </div>

    <BaseModal :show="handover.show" title="Schedule handover" @close="handover.show = false">
      <template v-if="handover.match">
        <p class="small text-secondary">
          <strong>{{ byId[handover.match.lostItemId]?.title || handover.match.lostTitle }}</strong> ↔
          <strong>{{ byId[handover.match.foundItemId]?.title || handover.match.foundTitle }}</strong>
        </p>
        <div class="mb-2">
          <label class="form-label small" for="ho-loc">Location</label>
          <input id="ho-loc" v-model="handover.location" class="form-control" maxlength="120" placeholder="e.g. Security office, Building A lobby" />
        </div>
        <div class="mb-2">
          <label class="form-label small" for="ho-when">When</label>
          <input id="ho-when" v-model="handover.when" type="datetime-local" class="form-control" />
        </div>
        <div>
          <label class="form-label small" for="ho-notes">Notes</label>
          <textarea id="ho-notes" v-model="handover.notes" rows="2" maxlength="300" class="form-control" placeholder="Bring photo ID; ask for the duty officer"></textarea>
        </div>
      </template>
      <template #footer>
        <button class="btn btn-light" @click="handover.show = false">Cancel</button>
        <button class="btn btn-primary" :disabled="handover.saving" @click="saveHandover"><span v-if="handover.saving" class="spinner-border spinner-border-sm me-1"></span>Save</button>
      </template>
    </BaseModal>
  </div>
</template>
