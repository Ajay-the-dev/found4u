<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useItemStore } from '@/stores/item'
import { useOrgStore } from '@/stores/org'
import { useChatStore } from '@/stores/chat'
import { useUiStore } from '@/stores/ui'
import { CATEGORY_MAP, ITEM_STATUSES, STATUS_META } from '@/utils/constants'
import { imageUrl } from '@/services/media'
import { formatDate, timeAgo } from '@/utils/format'
import { formatDistance } from '@/utils/geo'
import { isPermissionError } from '@/utils/errors'
import StatusBadge from '@/components/common/StatusBadge.vue'
import StatusTimeline from '@/components/items/StatusTimeline.vue'
import MatchCard from '@/components/items/MatchCard.vue'
import ItemsMap from '@/components/map/ItemsMap.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import ErrorAlert from '@/components/common/ErrorAlert.vue'
import EmptyState from '@/components/common/EmptyState.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const itemStore = useItemStore()
const org = useOrgStore()
const chat = useChatStore()
const ui = useUiStore()

const item = ref(null)
const loading = ref(true)
const error = ref(null)
const activePhoto = ref(0)
const orgMatches = ref([])

const newStatus = ref('')
const statusNote = ref('')
const savingStatus = ref(false)

let unsubItem = null
let unsubMatches = null

watch(
  () => route.params.id,
  (id) => {
    unsubItem?.()
    loading.value = true
    error.value = null
    activePhoto.value = 0
    unsubItem = itemStore.watchItem(
      id,
      (data) => {
        item.value = data
        newStatus.value = data?.status || ''
        loading.value = false
      },
      (err) => {
        error.value = err
        loading.value = false
      },
    )
  },
  { immediate: true },
)

const isReporter = computed(() => item.value?.reporterId === auth.uid)
const isStaff = computed(() => !!item.value?.orgId && org.hasRole(item.value.orgId, 'staff'))
const canManage = computed(() => isReporter.value || isStaff.value)
const canDelete = computed(() => isReporter.value || (!!item.value?.orgId && org.hasRole(item.value.orgId, 'admin')))
const category = computed(() => CATEGORY_MAP[item.value?.category] || CATEGORY_MAP.other)
const statusOptions = computed(() => (isStaff.value ? ITEM_STATUSES : ['open', 'claimed', 'resolved']))

// Staff see every match in the organization; reporters see their own.
watch(
  () => (isStaff.value ? item.value?.orgId : null),
  (orgId) => {
    unsubMatches?.()
    unsubMatches = null
    orgMatches.value = []
    if (orgId) unsubMatches = itemStore.watchOrgMatches(orgId, (list) => (orgMatches.value = list), () => {})
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  unsubItem?.()
  unsubMatches?.()
})

const matches = computed(() => {
  if (!item.value) return []
  const key = item.value.type === 'lost' ? 'lostItemId' : 'foundItemId'
  const pool = [...itemStore.myMatches, ...orgMatches.value]
  const seen = new Set()
  return pool.filter((m) => m[key] === item.value.id && m.status !== 'dismissed' && !seen.has(m.id) && seen.add(m.id))
})

const perspective = computed(() => (isReporter.value ? item.value.type : 'staff'))

async function saveStatus() {
  if (!newStatus.value || newStatus.value === item.value.status) return
  savingStatus.value = true
  try {
    await itemStore.updateStatus(item.value.id, newStatus.value, statusNote.value.trim())
    statusNote.value = ''
    ui.toast(`Status updated to ${STATUS_META[newStatus.value].label}`)
  } catch (err) {
    ui.error(err, 'Could not update status')
  } finally {
    savingStatus.value = false
  }
}

// One-tap close for the reporter. With a confirmed match, completing it resolves both sides.
const canMarkReturned = computed(() => isReporter.value && ['open', 'under_review', 'matched'].includes(item.value?.status))
async function markReturned() {
  const confirmed = matches.value.find((m) => m.status === 'confirmed')
  if (confirmed) return setMatchStatus(confirmed, 'completed')
  const lost = item.value.type === 'lost'
  const ok = await ui.confirm({
    title: lost ? 'Got it back?' : 'Returned to its owner?',
    message: 'This report will be marked as resolved and stop matching with new items.',
    confirmText: 'Mark resolved',
    variant: 'success',
  })
  if (!ok) return
  try {
    await itemStore.updateStatus(item.value.id, 'resolved', lost ? 'Owner got it back' : 'Returned to its owner')
    ui.toast('Marked as resolved 🎉', 'success')
  } catch (err) {
    ui.error(err, 'Could not update status')
  }
}

async function contactReporter() {
  try {
    const id = await chat.openItemChat(item.value, { asStaffOf: isStaff.value ? item.value.orgId : null })
    router.push(`/chats/${id}`)
  } catch (err) {
    ui.error(err, 'Could not start chat')
  }
}

async function remove() {
  const ok = await ui.confirm({ title: 'Delete this report?', message: 'This permanently removes the report. Existing matches will stay in history.', confirmText: 'Delete', variant: 'danger' })
  if (!ok) return
  try {
    await itemStore.deleteItem(item.value.id)
    ui.toast('Report deleted')
    router.replace('/dashboard')
  } catch (err) {
    ui.error(err, 'Could not delete')
  }
}

async function setMatchStatus(m, status) {
  if (status === 'completed') {
    const ok = await ui.confirm({ title: 'Mark as returned?', message: `Both “${m.lostTitle}” and “${m.foundTitle}” will be marked as resolved.`, confirmText: 'Yes, returned', variant: 'success' })
    if (!ok) return
  }
  try {
    await itemStore.updateMatch(m.id, { status })
    ui.toast(status === 'confirmed' ? 'Match confirmed' : status === 'completed' ? 'Marked as handed over' : 'Match dismissed')
  } catch (err) {
    ui.error(err, 'Could not update match')
  }
}

async function chatAboutMatch(m) {
  try {
    router.push(`/chats/${await chat.openMatchChat(m)}`)
  } catch (err) {
    ui.error(err, 'Could not open chat')
  }
}
</script>

<template>
  <div class="container py-4">
    <LoadingSpinner v-if="loading" />

    <div v-else-if="error" class="card">
      <EmptyState v-if="isPermissionError(error)" icon="bi-lock" title="This report is private" text="It belongs to an organization you're not a member of." />
      <div v-else class="card-body"><ErrorAlert :error="error" /></div>
    </div>

    <div v-else-if="!item" class="card">
      <EmptyState icon="bi-archive" title="Report not found" text="It may have been deleted by the reporter.">
        <RouterLink to="/items" class="btn btn-sm btn-primary">Browse items</RouterLink>
      </EmptyState>
    </div>

    <template v-else>
      <nav aria-label="breadcrumb" class="small mb-2">
        <ol class="breadcrumb mb-0">
          <li class="breadcrumb-item"><RouterLink to="/items">Browse</RouterLink></li>
          <li v-if="item.orgId" class="breadcrumb-item"><RouterLink :to="`/orgs/${item.orgId}`">{{ org.orgName(item.orgId) || 'Organization' }}</RouterLink></li>
          <li class="breadcrumb-item active text-truncate" aria-current="page">{{ item.title }}</li>
        </ol>
      </nav>

      <div class="row g-4">
        <div class="col-lg-7">
          <!-- Gallery -->
          <div class="card overflow-hidden mb-4">
            <template v-if="item.photos?.length">
              <img :src="imageUrl(item.photos[activePhoto], { width: 1200 })" class="w-100 bg-light" style="max-height: 460px; object-fit: contain" :alt="item.title" />
              <div v-if="item.photos.length > 1" class="d-flex gap-2 p-2 overflow-auto">
                <button v-for="(p, i) in item.photos" :key="p.url" class="btn p-0 border rounded overflow-hidden" :class="{ 'border-primary border-2': i === activePhoto }" @click="activePhoto = i">
                  <img :src="imageUrl(p, { width: 120, height: 90, crop: 'fill' })" width="80" height="60" class="object-fit-cover" alt="" />
                </button>
              </div>
            </template>
            <div v-else class="thumb-placeholder" style="aspect-ratio: 16/7"><i class="bi" :class="category.icon"></i></div>
          </div>

          <!-- Map -->
          <div v-if="item.location" class="card mb-4">
            <div class="card-body">
              <h2 class="h6"><i class="bi bi-geo-alt me-1 text-primary"></i>{{ item.type === 'lost' ? 'Last known location' : 'Where it was found' }}</h2>
              <ItemsMap :items="[item]" :center="item.location" height="300px" show-radius />
              <div class="small text-secondary mt-2">
                {{ item.location.address }}
                <span v-if="item.type === 'lost' && item.alertRadiusMeters" class="badge text-bg-light border ms-1">Alert radius {{ formatDistance(item.alertRadiusMeters) }}</span>
              </div>
            </div>
          </div>

          <!-- Matches -->
          <div v-if="canManage" class="mb-4">
            <h2 class="h5 mb-3"><i class="bi bi-radar text-primary me-2"></i>Potential matches</h2>
            <div v-if="matches.length" class="d-flex flex-column gap-3">
              <MatchCard
                v-for="m in matches"
                :key="m.id"
                :match="m"
                :perspective="perspective"
                @confirm="setMatchStatus($event, 'confirmed')"
                @dismiss="setMatchStatus($event, 'dismissed')"
                @complete="setMatchStatus($event, 'completed')"
                @handover="router.push(`/orgs/${$event.orgId}/command?tab=matches`)"
                @chat="chatAboutMatch"
              />
            </div>
            <div v-else class="card">
              <EmptyState icon="bi-radar" title="No matches yet" :text="item.type === 'lost' ? 'The match engine checks every new found item against this report.' : 'We\'ll let you know if anyone reported losing this.'" />
            </div>
          </div>
        </div>

        <div class="col-lg-5">
          <div class="card mb-4">
            <div class="card-body">
              <div class="d-flex align-items-center gap-2 mb-2">
                <span class="badge" :class="item.type === 'lost' ? 'bg-lost' : 'bg-found'">{{ item.type === 'lost' ? 'LOST' : 'FOUND' }}</span>
                <StatusBadge :status="item.status" />
                <span v-if="item.orgId" class="badge text-bg-light border"><i class="bi bi-building me-1"></i>{{ org.orgName(item.orgId) }}</span>
              </div>
              <h1 class="h4">{{ item.title }}</h1>
              <p v-if="item.description" class="mb-3" style="white-space: pre-wrap">{{ item.description }}</p>

              <dl class="row small mb-0">
                <dt class="col-5 text-secondary fw-normal">Category</dt>
                <dd class="col-7"><i class="bi me-1" :class="category.icon"></i>{{ category.label }}</dd>
                <template v-if="item.type === 'lost'">
                  <dt class="col-5 text-secondary fw-normal">Lost between</dt>
                  <dd class="col-7">{{ formatDate(item.dateFrom) }}<template v-if="item.dateTo && item.dateTo !== item.dateFrom"> – {{ formatDate(item.dateTo) }}</template></dd>
                  <template v-if="item.areasVisited">
                    <dt class="col-5 text-secondary fw-normal">Places visited</dt>
                    <dd class="col-7">{{ item.areasVisited }}</dd>
                  </template>
                </template>
                <template v-else>
                  <dt class="col-5 text-secondary fw-normal">Found on</dt>
                  <dd class="col-7">{{ formatDate(item.dateFound) }}</dd>
                  <template v-if="item.currentLocation">
                    <dt class="col-5 text-secondary fw-normal">Held at</dt>
                    <dd class="col-7">{{ item.currentLocation }}</dd>
                  </template>
                </template>
                <dt class="col-5 text-secondary fw-normal">Location</dt>
                <dd class="col-7">{{ item.location ? item.location.address || 'Pinned on map' : 'Unknown' }}</dd>
                <dt class="col-5 text-secondary fw-normal">Reported by</dt>
                <dd class="col-7">{{ isReporter ? 'You' : item.reporterName }} · {{ timeAgo(item.createdAt) }}</dd>
              </dl>

              <div class="d-grid gap-2 mt-3">
                <button v-if="canMarkReturned" class="btn btn-success" @click="markReturned">
                  <i class="bi bi-bag-check me-1"></i>{{ item.type === 'lost' ? 'I got it back' : 'Returned to its owner' }}
                </button>
                <template v-if="!isReporter">
                  <RouterLink
                    v-if="item.type === 'lost' && ['open', 'under_review'].includes(item.status)"
                    :to="{ name: 'report-found', query: { lost: item.id } }"
                    class="btn btn-success"
                  >
                    <i class="bi bi-box2-heart me-1"></i>I found this item
                  </RouterLink>
                  <button class="btn" :class="item.type === 'lost' ? 'btn-outline-secondary' : 'btn-primary'" @click="contactReporter">
                    <i class="bi bi-chat-dots me-1"></i>{{ item.type === 'found' ? 'This might be mine — message the finder' : 'Message the owner' }}
                  </button>
                </template>
              </div>
            </div>
          </div>

          <!-- Status management -->
          <div v-if="canManage" class="card mb-4">
            <div class="card-body">
              <h2 class="h6 mb-3"><i class="bi bi-sliders me-1 text-primary"></i>{{ isStaff ? 'Staff actions' : 'Manage your report' }}</h2>
              <div class="mb-2">
                <label class="form-label small" for="status">Status</label>
                <select id="status" v-model="newStatus" class="form-select form-select-sm">
                  <option v-for="s in statusOptions" :key="s" :value="s">{{ STATUS_META[s].label }}</option>
                </select>
              </div>
              <div class="mb-2">
                <input v-model="statusNote" class="form-control form-control-sm" maxlength="200" placeholder="Note (optional), e.g. “Collected with student ID”" />
              </div>
              <div class="d-flex gap-2">
                <button class="btn btn-sm btn-primary" :disabled="savingStatus || newStatus === item.status" @click="saveStatus">
                  <span v-if="savingStatus" class="spinner-border spinner-border-sm me-1"></span>Update status
                </button>
                <button v-if="canDelete" class="btn btn-sm btn-outline-danger ms-auto" @click="remove"><i class="bi bi-trash me-1"></i>Delete</button>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-body">
              <h2 class="h6 mb-3"><i class="bi bi-clock-history me-1 text-primary"></i>Lifecycle</h2>
              <StatusTimeline :status="item.status" :history="item.statusHistory || []" />
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
