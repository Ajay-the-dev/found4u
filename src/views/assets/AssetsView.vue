<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAssetStore } from '@/stores/asset'
import { useOrgStore } from '@/stores/org'
import { CATEGORY_MAP } from '@/utils/constants'
import { imageUrl } from '@/services/media'
import { timeAgo } from '@/utils/format'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorAlert from '@/components/common/ErrorAlert.vue'

const router = useRouter()
const auth = useAuthStore()
const assetStore = useAssetStore()
const org = useOrgStore()

const mine = ref([])
const orgAssets = ref([])
const loading = ref(true)
const error = ref(null)
const selected = ref(new Set())
const tab = ref('mine')

const canSeeOrgAssets = computed(() => org.currentOrg && org.hasRole(org.currentOrgId, 'staff'))
const list = computed(() => (tab.value === 'org' ? orgAssets.value : mine.value))

let unsubs = []
function subscribe() {
  unsubs.forEach((u) => u())
  unsubs = []
  loading.value = true
  error.value = null
  const onError = (err) => {
    error.value = err
    loading.value = false
  }
  unsubs.push(
    assetStore.watchMyAssets(auth.uid, (l) => {
      mine.value = l
      loading.value = false
    }, onError),
  )
  if (canSeeOrgAssets.value) unsubs.push(assetStore.watchOrgAssets(org.currentOrgId, (l) => (orgAssets.value = l), onError))
}
watch(() => [auth.uid, org.currentOrgId, canSeeOrgAssets.value], subscribe, { immediate: true })
watch(canSeeOrgAssets, (v) => !v && (tab.value = 'mine'))
onBeforeUnmount(() => unsubs.forEach((u) => u()))

function toggle(id) {
  const next = new Set(selected.value)
  next.has(id) ? next.delete(id) : next.add(id)
  selected.value = next
}
function toggleAll() {
  selected.value = selected.value.size === list.value.length ? new Set() : new Set(list.value.map((a) => a.id))
}
function printSelected() {
  router.push({ name: 'asset-print', query: { ids: [...selected.value].join(',') } })
}
</script>

<template>
  <div class="container py-4">
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
      <div>
        <h1 class="h3 mb-1">Asset tags</h1>
        <p class="text-secondary small mb-0">Tag high-value items with a QR sticker. Finders can reach you without ever seeing your contact details.</p>
      </div>
      <div class="d-flex gap-2">
        <button class="btn btn-outline-secondary" :disabled="!selected.size" @click="printSelected">
          <i class="bi bi-printer me-1"></i>Print {{ selected.size || '' }} sticker{{ selected.size === 1 ? '' : 's' }}
        </button>
        <RouterLink to="/assets/new" class="btn btn-primary"><i class="bi bi-plus-lg me-1"></i>Register asset</RouterLink>
      </div>
    </div>

    <ul v-if="canSeeOrgAssets" class="nav nav-tabs mb-3">
      <li class="nav-item"><button class="nav-link" :class="{ active: tab === 'mine' }" @click="tab = 'mine'; selected = new Set()">My assets</button></li>
      <li class="nav-item"><button class="nav-link" :class="{ active: tab === 'org' }" @click="tab = 'org'; selected = new Set()">{{ org.currentOrg.name }} assets</button></li>
    </ul>

    <ErrorAlert :error="error" retryable @retry="subscribe" />
    <LoadingSpinner v-if="loading" />

    <div v-else-if="!list.length" class="card">
      <EmptyState icon="bi-qr-code" title="No tagged assets yet" text="Register a laptop, ID card, keys or camera and print a QR sticker for it.">
        <RouterLink to="/assets/new" class="btn btn-sm btn-primary">Register your first asset</RouterLink>
      </EmptyState>
    </div>

    <div v-else class="card">
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light small">
            <tr>
              <th style="width: 2rem"><input class="form-check-input" type="checkbox" :checked="selected.size === list.length" aria-label="Select all" @change="toggleAll" /></th>
              <th>Asset</th>
              <th class="d-none d-md-table-cell">Tag ID</th>
              <th class="d-none d-md-table-cell">Status</th>
              <th class="d-none d-lg-table-cell">Registered</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in list" :key="a.id">
              <td><input class="form-check-input" type="checkbox" :checked="selected.has(a.id)" :aria-label="`Select ${a.name}`" @change="toggle(a.id)" /></td>
              <td>
                <RouterLink :to="`/assets/${a.id}`" class="d-flex align-items-center gap-2 text-decoration-none text-body">
                  <img v-if="a.photo" :src="imageUrl(a.photo, { width: 80, height: 80, crop: 'fill' })" width="40" height="40" class="rounded object-fit-cover" alt="" />
                  <span v-else class="avatar" style="width: 40px; height: 40px"><i class="bi" :class="CATEGORY_MAP[a.category]?.icon || 'bi-box'"></i></span>
                  <span>
                    <span class="d-block fw-semibold">{{ a.name }}</span>
                    <span class="d-block small text-secondary">{{ CATEGORY_MAP[a.category]?.label }}</span>
                  </span>
                </RouterLink>
              </td>
              <td class="d-none d-md-table-cell"><code>{{ a.id }}</code></td>
              <td class="d-none d-md-table-cell">
                <span v-if="a.status === 'lost'" class="badge bg-lost">Reported lost</span>
                <span v-else-if="!a.active" class="badge text-bg-secondary">Tag disabled</span>
                <span v-else class="badge text-bg-success">Protected</span>
              </td>
              <td class="d-none d-lg-table-cell small text-secondary">{{ timeAgo(a.createdAt) }}</td>
              <td class="text-end"><RouterLink :to="`/assets/${a.id}`" class="btn btn-sm btn-light">Open</RouterLink></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
