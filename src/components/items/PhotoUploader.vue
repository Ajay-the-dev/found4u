<script setup>
import { ref, computed } from 'vue'
import { uploadImage, imageUrl, mediaProvider } from '@/services/media'
import { friendlyError } from '@/utils/errors'
import { MAX_PHOTOS } from '@/utils/constants'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  max: { type: Number, default: MAX_PHOTOS },
  folder: { type: String, default: 'items' },
})
const emit = defineEmits(['update:modelValue', 'busy'])

const uploads = ref([]) // { key, name, progress, error, preview }
const inputEl = ref(null)
const remaining = computed(() => props.max - props.modelValue.length - uploads.value.filter((u) => !u.error).length)
const providerLabel = { cloudinary: 'stored with Cloudinary', firebase: 'stored with Firebase Storage' }[mediaProvider] || 'image storage is not configured'

async function onFiles(event) {
  const files = [...event.target.files].slice(0, Math.max(0, remaining.value))
  event.target.value = ''
  if (!files.length) return
  emit('busy', true)
  // Track the latest photo list locally so concurrent uploads don't overwrite each other.
  let current = [...props.modelValue]
  await Promise.all(
    files.map(async (file) => {
      const entry = { key: `${file.name}-${Date.now()}-${Math.random()}`, name: file.name, progress: 0, error: '', preview: URL.createObjectURL(file) }
      uploads.value.push(entry)
      const tracked = uploads.value.find((u) => u.key === entry.key)
      try {
        const photo = await uploadImage(file, { folder: props.folder, onProgress: (p) => (tracked.progress = p) })
        current = [...current, photo]
        emit('update:modelValue', current)
        uploads.value = uploads.value.filter((u) => u.key !== entry.key)
        URL.revokeObjectURL(entry.preview)
      } catch (err) {
        tracked.error = friendlyError(err)
      }
    }),
  )
  emit('busy', false)
}

function removePhoto(index) {
  emit('update:modelValue', props.modelValue.filter((_, i) => i !== index))
}

function dismissFailed(key) {
  uploads.value = uploads.value.filter((u) => u.key !== key)
}
</script>

<template>
  <div>
    <div class="row g-2">
      <div v-for="(photo, i) in modelValue" :key="photo.url" class="col-4 col-md-3 col-lg-2">
        <div class="position-relative rounded overflow-hidden border">
          <img :src="imageUrl(photo, { width: 300, height: 225, crop: 'fill' })" class="thumb" alt="Item photo" />
          <button type="button" class="btn btn-sm btn-dark position-absolute top-0 end-0 m-1 py-0 px-1 opacity-75" aria-label="Remove photo" @click="removePhoto(i)">
            <i class="bi bi-x-lg"></i>
          </button>
          <span v-if="i === 0" class="badge text-bg-primary position-absolute bottom-0 start-0 m-1">Cover</span>
        </div>
      </div>

      <div v-for="u in uploads" :key="u.key" class="col-4 col-md-3 col-lg-2">
        <div class="position-relative rounded overflow-hidden border">
          <img :src="u.preview" class="thumb opacity-50" alt="" />
          <div class="position-absolute top-50 start-50 translate-middle w-75 text-center">
            <template v-if="u.error">
              <i class="bi bi-exclamation-triangle-fill text-danger fs-4"></i>
              <div class="small text-danger bg-white rounded px-1">{{ u.error }}</div>
              <button type="button" class="btn btn-link btn-sm p-0" @click="dismissFailed(u.key)">Dismiss</button>
            </template>
            <div v-else class="progress" role="progressbar" :aria-valuenow="u.progress" aria-valuemin="0" aria-valuemax="100" style="height: 6px">
              <div class="progress-bar" :style="{ width: `${u.progress}%` }"></div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="remaining > 0" class="col-4 col-md-3 col-lg-2">
        <button type="button" class="thumb-placeholder border rounded w-100 btn btn-light fs-6 flex-column" @click="inputEl.click()">
          <i class="bi bi-camera fs-3"></i>
          <span class="small">Add photo</span>
        </button>
      </div>
    </div>
    <input ref="inputEl" type="file" accept="image/*" multiple class="d-none" @change="onFiles" />
    <div class="form-text">Up to {{ max }} images, 10 MB each · {{ providerLabel }}.</div>
  </div>
</template>
