<script setup>
import { reactive, ref, computed, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useOrgStore } from '@/stores/org'
import { RADIUS_OPTIONS } from '@/utils/constants'
import { formatDistance } from '@/utils/geo'
import { isoDay } from '@/utils/format'
import MapPicker from '@/components/map/MapPicker.vue'
import PhotoUploader from './PhotoUploader.vue'
import CategoryPicker from './CategoryPicker.vue'

const props = defineProps({
  type: { type: String, required: true }, // 'lost' | 'found'
  submitting: { type: Boolean, default: false },
})
const emit = defineEmits(['submit'])

const auth = useAuthStore()
const org = useOrgStore()
const today = isoDay()

const form = reactive({
  type: props.type,
  orgId: org.currentOrgId,
  title: '',
  category: '',
  description: '',
  photos: [],
  location: null,
  // lost
  locationMode: 'map', // 'map' | 'unknown'
  dateFrom: today,
  dateTo: today,
  areasVisited: '',
  alertRadiusMeters: auth.prefs.alertRadiusMeters,
  // found
  dateFound: today,
  currentLocation: '',
})

const uploading = ref(false)
const attempted = ref(false)

const isLost = computed(() => props.type === 'lost')
const needsMap = computed(() => !isLost.value || form.locationMode === 'map')
const mapCenter = computed(() => org.orgs[form.orgId]?.settings?.center || null)

// New scope → adopt that organization's default alert radius.
watch(
  () => form.orgId,
  (orgId) => {
    const radius = org.orgs[orgId]?.settings?.alertRadiusMeters
    if (radius) form.alertRadiusMeters = radius
  },
  { immediate: true },
)

const errors = computed(() => {
  const e = {}
  if (form.title.trim().length < 2) e.title = 'Give the item a short title.'
  if (!form.category) e.category = 'Choose a category.'
  if (needsMap.value && !form.location) e.location = isLost.value ? 'Drop a pin where you think you lost it, or choose “I don’t know”.' : 'Drop a pin where you found it.'
  if (isLost.value) {
    if (!form.dateFrom) e.dateFrom = 'When did you last have it?'
    if (form.dateTo && form.dateTo < form.dateFrom) e.dateTo = 'End date must be after the start date.'
    if (form.locationMode === 'unknown' && form.description.trim().length < 10)
      e.description = 'Without a location, a detailed description is essential (at least 10 characters).'
  } else if (!form.dateFound) {
    e.dateFound = 'When did you find it?'
  }
  return e
})
const valid = computed(() => Object.keys(errors.value).length === 0)
const show = (field) => attempted.value && errors.value[field]

function submit() {
  attempted.value = true
  if (!valid.value || uploading.value) return
  emit('submit', {
    ...form,
    location: needsMap.value ? form.location : null,
    dateTo: form.dateTo || form.dateFrom,
  })
}
</script>

<template>
  <form novalidate @submit.prevent="submit">
    <!-- Scope -->
    <div class="card mb-3">
      <div class="card-body">
        <label class="form-label fw-semibold">Where should this be reported?</label>
        <select v-model="form.orgId" class="form-select">
          <option :value="null">Public network — visible to every FoundIt user</option>
          <option v-for="o in org.myOrgs" :key="o.id" :value="o.id">{{ o.name }} — members only</option>
        </select>
        <div class="form-text">Organization reports are only visible to that organization's members and staff.</div>
      </div>
    </div>

    <!-- Details -->
    <div class="card mb-3">
      <div class="card-body">
        <h2 class="h6 mb-3"><i class="bi bi-card-text me-2 text-primary"></i>What is it?</h2>
        <div class="mb-3">
          <label class="form-label" for="title">Title</label>
          <input id="title" v-model="form.title" class="form-control" :class="{ 'is-invalid': show('title') }" maxlength="120"
            :placeholder="isLost ? 'e.g. Black Dell XPS laptop in grey sleeve' : 'e.g. Silver keyring with 3 keys'" />
          <div class="invalid-feedback">{{ errors.title }}</div>
        </div>
        <div class="mb-3">
          <label class="form-label">Category</label>
          <CategoryPicker v-model="form.category" />
          <div v-if="show('category')" class="text-danger small mt-1">{{ errors.category }}</div>
        </div>
        <div class="mb-3">
          <label class="form-label" for="description">Description</label>
          <textarea id="description" v-model="form.description" rows="4" maxlength="2000" class="form-control" :class="{ 'is-invalid': show('description') }"
            :placeholder="isLost ? 'Brand, colour, stickers, contents, distinguishing marks…' : 'Describe it, but keep one detail back so the owner can prove it is theirs.'"></textarea>
          <div class="invalid-feedback">{{ errors.description }}</div>
          <div class="form-text text-end">{{ form.description.length }}/2000</div>
        </div>
        <div>
          <label class="form-label">Photos <span class="text-secondary">(optional)</span></label>
          <PhotoUploader v-model="form.photos" :folder="type" @busy="uploading = $event" />
        </div>
      </div>
    </div>

    <!-- When & where -->
    <div class="card mb-3">
      <div class="card-body">
        <h2 class="h6 mb-3"><i class="bi bi-geo-alt me-2 text-primary"></i>When & where?</h2>

        <template v-if="isLost">
          <div class="btn-group w-100 mb-3" role="group" aria-label="Do you know where you lost it?">
            <input id="mode-map" v-model="form.locationMode" type="radio" class="btn-check" value="map" />
            <label class="btn btn-outline-primary" for="mode-map"><i class="bi bi-pin-map me-1"></i>I know roughly where</label>
            <input id="mode-unknown" v-model="form.locationMode" type="radio" class="btn-check" value="unknown" />
            <label class="btn btn-outline-primary" for="mode-unknown"><i class="bi bi-question-diamond me-1"></i>I have no idea</label>
          </div>

          <div class="row g-3 mb-3">
            <div class="col-sm-6">
              <label class="form-label" for="dateFrom">{{ form.locationMode === 'unknown' ? 'Last seen on' : 'Date lost' }}</label>
              <input id="dateFrom" v-model="form.dateFrom" type="date" :max="today" class="form-control" :class="{ 'is-invalid': show('dateFrom') }" />
              <div class="invalid-feedback">{{ errors.dateFrom }}</div>
            </div>
            <div class="col-sm-6">
              <label class="form-label" for="dateTo">{{ form.locationMode === 'unknown' ? 'Noticed missing on' : 'Or as late as' }}</label>
              <input id="dateTo" v-model="form.dateTo" type="date" :min="form.dateFrom" :max="today" class="form-control" :class="{ 'is-invalid': show('dateTo') }" />
              <div class="invalid-feedback">{{ errors.dateTo }}</div>
            </div>
          </div>

          <template v-if="form.locationMode === 'map'">
            <MapPicker v-model="form.location" :radius="Number(form.alertRadiusMeters)" :center="mapCenter" kind="lost" />
            <div v-if="show('location')" class="text-danger small mt-1">{{ errors.location }}</div>
            <div class="mt-3">
              <label class="form-label" for="radius">Alert me about found items within</label>
              <select id="radius" v-model.number="form.alertRadiusMeters" class="form-select" style="max-width: 220px">
                <option v-for="r in RADIUS_OPTIONS" :key="r" :value="r">{{ formatDistance(r) }}</option>
              </select>
              <div class="form-text">You'll get a dashboard alert and an email when a matching item is logged inside this radius.</div>
            </div>
          </template>
          <div v-else>
            <label class="form-label" for="areas">Places you visited during that time <span class="text-secondary">(optional)</span></label>
            <textarea id="areas" v-model="form.areasVisited" rows="3" maxlength="1000" class="form-control" placeholder="e.g. Library 2nd floor, cafeteria, bus route 12, gym locker room"></textarea>
            <div class="form-text">We'll match by category and date and flag it to organization staff.</div>
          </div>
        </template>

        <template v-else>
          <div class="row g-3 mb-3">
            <div class="col-sm-6">
              <label class="form-label" for="dateFound">Date found</label>
              <input id="dateFound" v-model="form.dateFound" type="date" :max="today" class="form-control" :class="{ 'is-invalid': show('dateFound') }" />
              <div class="invalid-feedback">{{ errors.dateFound }}</div>
            </div>
            <div class="col-sm-6">
              <label class="form-label" for="currentLocation">Where is it now?</label>
              <input id="currentLocation" v-model="form.currentLocation" maxlength="200" class="form-control" placeholder="e.g. Handed to front desk, Building B" />
            </div>
          </div>
          <MapPicker v-model="form.location" :center="mapCenter" kind="found" />
          <div v-if="show('location')" class="text-danger small mt-1">{{ errors.location }}</div>
        </template>
      </div>
    </div>

    <div class="d-flex justify-content-end gap-2">
      <RouterLink to="/dashboard" class="btn btn-light">Cancel</RouterLink>
      <button class="btn btn-primary px-4" :disabled="submitting || uploading">
        <span v-if="submitting" class="spinner-border spinner-border-sm me-2"></span>
        {{ uploading ? 'Waiting for uploads…' : isLost ? 'Report lost item' : 'Log found item' }}
      </button>
    </div>
  </form>
</template>
