<script setup>
import { reactive, ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAssetStore } from '@/stores/asset'
import { useOrgStore } from '@/stores/org'
import { useUiStore } from '@/stores/ui'
import PhotoUploader from '@/components/items/PhotoUploader.vue'
import CategoryPicker from '@/components/items/CategoryPicker.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import ErrorAlert from '@/components/common/ErrorAlert.vue'

const route = useRoute()
const router = useRouter()
const assetStore = useAssetStore()
const org = useOrgStore()
const ui = useUiStore()

const editingId = computed(() => route.params.id || null)
const existing = ref(null)
const loading = ref(!!editingId.value)
const loadError = ref(null)
const saving = ref(false)
const uploading = ref(false)
const attempted = ref(false)

const form = reactive({
  name: '',
  category: 'electronics',
  description: '',
  serialNumber: '',
  publicMessage: 'Thanks for scanning! Please message me here and I will arrange a pick-up.',
  photos: [],
  orgId: null,
  active: true,
})

let unsub = null
onMounted(() => {
  if (!editingId.value) return
  unsub = assetStore.watchAsset(
    editingId.value,
    (asset) => {
      // Only hydrate the form once so live updates don't clobber unsaved edits.
      if (!existing.value && asset) {
        Object.assign(form, {
          name: asset.name,
          category: asset.category,
          description: asset.description,
          serialNumber: asset.serialNumber,
          publicMessage: asset.publicMessage,
          photos: asset.photo ? [asset.photo] : [],
          orgId: asset.orgId,
          active: asset.active !== false,
        })
      }
      existing.value = asset
      loading.value = false
    },
    (err) => {
      loadError.value = err
      loading.value = false
    },
  )
})
onBeforeUnmount(() => unsub?.())

const errors = computed(() => ({
  name: form.name.trim().length < 2 ? 'Give the asset a name.' : '',
  category: !form.category ? 'Choose a category.' : '',
}))

async function save() {
  attempted.value = true
  if (errors.value.name || errors.value.category || uploading.value) return
  saving.value = true
  const payload = {
    name: form.name.trim(),
    category: form.category,
    description: form.description.trim(),
    serialNumber: form.serialNumber.trim(),
    publicMessage: form.publicMessage.trim(),
    photo: form.photos[0] || null,
    active: form.active,
  }
  try {
    if (existing.value) {
      await assetStore.updateAsset(existing.value, payload)
      ui.toast('Asset updated')
      router.push(`/assets/${existing.value.id}`)
    } else {
      const id = await assetStore.createAsset({ ...payload, orgId: form.orgId })
      ui.toast('Asset registered', 'success', { body: `Tag ${id} is ready to print.` })
      router.push(`/assets/${id}`)
    }
  } catch (err) {
    ui.error(err, 'Could not save asset')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="container py-4" style="max-width: 820px">
    <h1 class="h3 mb-4"><i class="bi bi-qr-code text-primary me-2"></i>{{ editingId ? 'Edit asset' : 'Register an asset' }}</h1>
    <LoadingSpinner v-if="loading" />
    <ErrorAlert v-else-if="loadError" :error="loadError" />

    <form v-else novalidate @submit.prevent="save">
      <div class="card mb-3">
        <div class="card-body">
          <div class="mb-3">
            <label class="form-label" for="name">Asset name</label>
            <input id="name" v-model="form.name" class="form-control" :class="{ 'is-invalid': attempted && errors.name }" maxlength="120" placeholder="e.g. MacBook Pro 14” (silver)" />
            <div class="invalid-feedback">{{ errors.name }}</div>
          </div>
          <div class="mb-3">
            <label class="form-label">Category</label>
            <CategoryPicker v-model="form.category" />
          </div>
          <div class="row g-3 mb-3">
            <div class="col-md-6">
              <label class="form-label" for="serial">Serial / identifying number <span class="text-secondary">(private)</span></label>
              <input id="serial" v-model="form.serialNumber" class="form-control" maxlength="120" />
            </div>
            <div v-if="!editingId" class="col-md-6">
              <label class="form-label" for="owner">Owned by</label>
              <select id="owner" v-model="form.orgId" class="form-select">
                <option :value="null">Me personally</option>
                <option v-for="o in org.staffOrgs" :key="o.id" :value="o.id">{{ o.name }} (organization asset)</option>
              </select>
            </div>
          </div>
          <div class="mb-3">
            <label class="form-label" for="desc">Private notes</label>
            <textarea id="desc" v-model="form.description" rows="2" maxlength="1000" class="form-control" placeholder="Only you (and org staff) can see this."></textarea>
          </div>
          <div>
            <label class="form-label">Photo</label>
            <PhotoUploader v-model="form.photos" :max="1" folder="assets" @busy="uploading = $event" />
          </div>
        </div>
      </div>

      <div class="card mb-3">
        <div class="card-body">
          <h2 class="h6"><i class="bi bi-eye me-1 text-primary"></i>What finders see after scanning</h2>
          <p class="small text-secondary">Finders see the asset name, photo and this message. Your name, email and phone are never shown.</p>
          <textarea v-model="form.publicMessage" rows="3" maxlength="500" class="form-control mb-3"></textarea>
          <div class="form-check form-switch">
            <input id="active" v-model="form.active" class="form-check-input" type="checkbox" role="switch" />
            <label class="form-check-label" for="active">Tag is active — scans can reach me</label>
          </div>
        </div>
      </div>

      <div class="d-flex justify-content-end gap-2">
        <RouterLink :to="editingId ? `/assets/${editingId}` : '/assets'" class="btn btn-light">Cancel</RouterLink>
        <button class="btn btn-primary px-4" :disabled="saving || uploading">
          <span v-if="saving" class="spinner-border spinner-border-sm me-2"></span>{{ editingId ? 'Save changes' : 'Register & generate QR' }}
        </button>
      </div>
    </form>
  </div>
</template>
