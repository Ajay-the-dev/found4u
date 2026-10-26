<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { useAssetStore } from '@/stores/asset'
import { useOrgStore } from '@/stores/org'
import QrSticker from '@/components/assets/QrSticker.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

const route = useRoute()
const assetStore = useAssetStore()
const org = useOrgStore()

const ids = computed(() => String(route.query.ids || '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 60))
const assets = ref({})
const failed = ref([])
const size = ref('md')
const copies = ref(1)
const showName = ref(true)

let unsubs = []
onMounted(() => {
  unsubs = ids.value.map((id) =>
    assetStore.watchAsset(
      id,
      (a) => (a ? (assets.value = { ...assets.value, [id]: a }) : failed.value.push(id)),
      () => failed.value.push(id),
    ),
  )
})
onBeforeUnmount(() => unsubs.forEach((u) => u()))

const print = () => window.print()
const loading = computed(() => Object.keys(assets.value).length + failed.value.length < ids.value.length)
const sheet = computed(() =>
  ids.value
    .filter((id) => assets.value[id])
    .flatMap((id) => Array.from({ length: Math.min(12, Math.max(1, copies.value || 1)) }, (_, n) => ({ key: `${id}-${n}`, asset: assets.value[id] }))),
)
</script>

<template>
  <div class="container py-4">
    <div class="d-print-none card mb-4">
      <div class="card-body d-flex flex-wrap align-items-end gap-3">
        <RouterLink to="/assets" class="btn btn-light"><i class="bi bi-arrow-left"></i></RouterLink>
        <div>
          <label class="form-label small mb-1" for="size">Sticker size</label>
          <select id="size" v-model="size" class="form-select form-select-sm">
            <option value="sm">Small · keys, ID cards</option>
            <option value="md">Medium · laptops, bags</option>
            <option value="lg">Large · equipment</option>
          </select>
        </div>
        <div>
          <label class="form-label small mb-1" for="copies">Copies each</label>
          <input id="copies" v-model.number="copies" type="number" min="1" max="12" class="form-control form-control-sm" style="width: 90px" />
        </div>
        <div class="form-check mb-1">
          <input id="names" v-model="showName" class="form-check-input" type="checkbox" />
          <label class="form-check-label small" for="names">Show asset name</label>
        </div>
        <button class="btn btn-primary ms-auto" :disabled="!sheet.length" @click="print"><i class="bi bi-printer me-1"></i>Print</button>
      </div>
      <div v-if="failed.length" class="card-footer small text-danger">Could not load: {{ failed.join(', ') }}</div>
    </div>

    <LoadingSpinner v-if="loading" label="Preparing stickers…" />
    <div v-else-if="!sheet.length" class="text-center text-secondary py-5">No stickers to print. Select assets on the Asset tags page.</div>
    <div v-else class="d-flex flex-wrap gap-3 justify-content-center justify-content-md-start">
      <QrSticker v-for="s in sheet" :key="s.key" :asset-id="s.asset.id" :name="s.asset.name" :org-name="org.orgName(s.asset.orgId)" :size="size" :show-name="showName" />
    </div>
  </div>
</template>
