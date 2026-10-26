<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAssetStore } from '@/stores/asset'
import { useOrgStore } from '@/stores/org'
import { useUiStore } from '@/stores/ui'
import { CATEGORY_MAP } from '@/utils/constants'
import { imageUrl } from '@/services/media'
import { timeAgo, formatDateTime } from '@/utils/format'
import { osmLink } from '@/utils/geo'
import { isPermissionError } from '@/utils/errors'
import QrSticker from '@/components/assets/QrSticker.vue'
import ItemsMap from '@/components/map/ItemsMap.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorAlert from '@/components/common/ErrorAlert.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const assetStore = useAssetStore()
const org = useOrgStore()
const ui = useUiStore()

const asset = ref(null)
const reports = ref([])
const loading = ref(true)
const error = ref(null)
const busy = ref(false)
const sticker = ref(null)

let unsubs = []
watch(
  () => route.params.id,
  (id) => {
    unsubs.forEach((u) => u())
    loading.value = true
    error.value = null
    unsubs = [
      assetStore.watchAsset(
        id,
        (a) => {
          asset.value = a
          loading.value = false
        },
        (err) => {
          error.value = err
          loading.value = false
        },
      ),
      assetStore.watchScanReports(id, (list) => (reports.value = list), () => {}),
    ]
  },
  { immediate: true },
)
onBeforeUnmount(() => unsubs.forEach((u) => u()))

const isOwner = computed(() => asset.value?.ownerId === auth.uid)
const canManage = computed(() => isOwner.value || (!!asset.value?.orgId && org.hasRole(asset.value.orgId, 'admin')))
const pings = computed(() =>
  reports.value.filter((r) => r.location).map((r) => ({ id: r.id, ...r.location, label: `Scan ${timeAgo(r.createdAt)}` })),
)

async function toggleLost() {
  busy.value = true
  const lost = asset.value.status !== 'lost'
  try {
    await assetStore.updateAsset(asset.value, { status: lost ? 'lost' : 'active' })
    ui.toast(lost ? 'Marked as lost' : 'Marked as recovered', 'success', {
      body: lost ? 'Anyone who scans the tag will see that you are looking for it.' : undefined,
    })
  } catch (err) {
    ui.error(err)
  } finally {
    busy.value = false
  }
}

async function remove() {
  const ok = await ui.confirm({ title: 'Delete this asset?', message: 'The printed QR sticker will stop working immediately.', confirmText: 'Delete', variant: 'danger' })
  if (!ok) return
  try {
    await assetStore.deleteAsset(asset.value.id)
    ui.toast('Asset deleted')
    router.replace('/assets')
  } catch (err) {
    ui.error(err, 'Could not delete asset')
  }
}

function downloadPng() {
  const a = document.createElement('a')
  a.href = sticker.value.dataUrl
  a.download = `foundit-${asset.value.id}.png`
  a.click()
}

async function copyLink() {
  await navigator.clipboard.writeText(sticker.value.scanUrl)
  ui.toast('Scan link copied')
}

function openReport(r) {
  if (!r.seen) assetStore.markScanSeen(r.id).catch(() => {})
  if (r.chatId) router.push(`/chats/${r.chatId}`)
}
</script>

<template>
  <div class="container py-4">
    <LoadingSpinner v-if="loading" />
    <div v-else-if="error" class="card">
      <EmptyState v-if="isPermissionError(error)" icon="bi-lock" title="You can't view this asset" />
      <div v-else class="card-body"><ErrorAlert :error="error" /></div>
    </div>
    <div v-else-if="!asset" class="card"><EmptyState icon="bi-qr-code" title="Asset not found" /></div>

    <div v-else class="row g-4">
      <div class="col-lg-7">
        <div class="card mb-4">
          <div class="card-body d-flex gap-3">
            <img v-if="asset.photo" :src="imageUrl(asset.photo, { width: 240, height: 240, crop: 'fill' })" width="110" height="110" class="rounded object-fit-cover" alt="" />
            <span v-else class="avatar fs-2" style="width: 110px; height: 110px"><i class="bi" :class="CATEGORY_MAP[asset.category]?.icon"></i></span>
            <div class="flex-grow-1 min-w-0">
              <div class="d-flex flex-wrap gap-2 mb-1">
                <span v-if="asset.status === 'lost'" class="badge bg-lost">Reported lost</span>
                <span v-else class="badge text-bg-success">Protected</span>
                <span v-if="!asset.active" class="badge text-bg-secondary">Tag disabled</span>
                <span v-if="asset.orgId" class="badge text-bg-light border"><i class="bi bi-building me-1"></i>{{ org.orgName(asset.orgId) }}</span>
              </div>
              <h1 class="h4 mb-1">{{ asset.name }}</h1>
              <div class="small text-secondary mb-2">{{ CATEGORY_MAP[asset.category]?.label }} · Tag <code>{{ asset.id }}</code></div>
              <div v-if="asset.serialNumber" class="small"><span class="text-secondary">Serial:</span> {{ asset.serialNumber }}</div>
              <div v-if="asset.description" class="small text-secondary mt-1">{{ asset.description }}</div>
            </div>
          </div>
          <div v-if="canManage" class="card-footer bg-white d-flex flex-wrap gap-2">
            <button class="btn btn-sm" :class="asset.status === 'lost' ? 'btn-success' : 'btn-outline-danger'" :disabled="busy" @click="toggleLost">
              <i class="bi me-1" :class="asset.status === 'lost' ? 'bi-check2-circle' : 'bi-exclamation-diamond'"></i>
              {{ asset.status === 'lost' ? 'I got it back' : "I've lost this" }}
            </button>
            <RouterLink :to="`/assets/${asset.id}/edit`" class="btn btn-sm btn-outline-secondary"><i class="bi bi-pencil me-1"></i>Edit</RouterLink>
            <button class="btn btn-sm btn-outline-danger ms-auto" @click="remove"><i class="bi bi-trash"></i></button>
          </div>
        </div>

        <h2 class="h5 mb-3"><i class="bi bi-qr-code-scan text-primary me-2"></i>Finder reports</h2>
        <div v-if="!isOwner" class="alert alert-light border small">Finder reports go privately to the person who registered this tag.</div>
        <template v-else-if="reports.length">
          <ItemsMap v-if="pings.length" :pings="pings" height="260px" class="mb-3" />
          <div class="list-group">
            <button v-for="r in reports" :key="r.id" class="list-group-item list-group-item-action d-flex gap-3" :class="{ 'bg-primary-subtle': !r.seen }" @click="openReport(r)">
              <i class="bi fs-4" :class="r.location ? 'bi-geo-alt-fill text-warning' : 'bi-chat-left-text text-primary'"></i>
              <div class="flex-grow-1 min-w-0">
                <div class="d-flex justify-content-between">
                  <strong class="small">{{ r.seen ? 'Scan report' : 'New scan report' }}</strong>
                  <span class="small text-secondary" :title="formatDateTime(r.createdAt)">{{ timeAgo(r.createdAt) }}</span>
                </div>
                <div v-if="r.message" class="small">{{ r.message }}</div>
                <div v-if="r.contact" class="small text-secondary"><i class="bi bi-person-lines-fill me-1"></i>Finder shared: {{ r.contact }}</div>
                <a v-if="r.location" :href="osmLink(r.location)" target="_blank" rel="noopener" class="small" @click.stop>
                  <i class="bi bi-box-arrow-up-right me-1"></i>Open location ping
                </a>
              </div>
              <i class="bi bi-chat-dots text-primary align-self-center"></i>
            </button>
          </div>
        </template>
        <div v-else class="card"><EmptyState icon="bi-qr-code-scan" title="No scans yet" text="When someone scans this tag, their message and location ping will appear here in real time." /></div>
      </div>

      <div class="col-lg-5">
        <div class="card">
          <div class="card-body text-center">
            <h2 class="h6 mb-3">QR sticker</h2>
            <div class="d-flex justify-content-center mb-3">
              <QrSticker ref="sticker" :asset-id="asset.id" :name="asset.name" :org-name="org.orgName(asset.orgId)" size="lg" />
            </div>
            <div class="d-flex flex-wrap justify-content-center gap-2">
              <RouterLink :to="{ name: 'asset-print', query: { ids: asset.id } }" class="btn btn-primary btn-sm"><i class="bi bi-printer me-1"></i>Print sheet</RouterLink>
              <button class="btn btn-outline-secondary btn-sm" @click="downloadPng"><i class="bi bi-download me-1"></i>PNG</button>
              <button class="btn btn-outline-secondary btn-sm" @click="copyLink"><i class="bi bi-link-45deg me-1"></i>Copy link</button>
              <a :href="`/scan/${asset.id}`" target="_blank" class="btn btn-outline-secondary btn-sm"><i class="bi bi-eye me-1"></i>Preview</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
