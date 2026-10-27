<script setup>
import { reactive, ref, computed, watch, nextTick } from 'vue'
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
  initial: { type: Object, default: () => ({}) }, // prefilled fields, e.g. from a lost report
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
  ...props.initial,
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

const formEl = ref(null)

// The submit button is pinned to the bottom on phones, so bring the first problem into view.
async function revealFirstError() {
  await nextTick()
  const target = formEl.value?.querySelector('.is-invalid, .field-error')
  if (!target) return
  target.scrollIntoView({ behavior: 'smooth', block: 'center' })
  if (target.matches('input, textarea, select')) target.focus({ preventScroll: true })
}

function submit() {
  attempted.value = true
  if (!valid.value) return revealFirstError()
  if (uploading.value) return
  emit('submit', {
    ...form,
    location: needsMap.value ? form.location : null,
    dateTo: form.dateTo || form.dateFrom,
  })
}
</script>

<template>
  <form ref="formEl" class="saas-form" novalidate @submit.prevent="submit">
    <!-- Visibility -->
    <section class="form-section card">
      <header class="section-head">
        <span class="section-step">1</span>
        <div>
          <h2 class="section-title">Visibility</h2>
          <p class="section-hint">Organization reports are only visible to that organization's members and staff.</p>
        </div>
      </header>
      <div class="section-body">
        <div class="choice-list" role="radiogroup" aria-label="Where should this be reported?">
          <label class="choice" :class="{ selected: form.orgId === null }">
            <input v-model="form.orgId" type="radio" class="visually-hidden" :value="null" />
            <span class="choice-icon"><i class="bi bi-globe2"></i></span>
            <span class="choice-text">
              <span class="choice-title">Public network</span>
              <span class="choice-sub">Visible to every Found4 user</span>
            </span>
            <i class="choice-check bi bi-check-circle-fill"></i>
          </label>
          <label v-for="o in org.myOrgs" :key="o.id" class="choice" :class="{ selected: form.orgId === o.id }">
            <input v-model="form.orgId" type="radio" class="visually-hidden" :value="o.id" />
            <span class="choice-icon"><i class="bi bi-building"></i></span>
            <span class="choice-text">
              <span class="choice-title">{{ o.name }}</span>
              <span class="choice-sub">Members only</span>
            </span>
            <i class="choice-check bi bi-check-circle-fill"></i>
          </label>
        </div>
      </div>
    </section>

    <!-- Details -->
    <section class="form-section card">
      <header class="section-head">
        <span class="section-step">2</span>
        <div>
          <h2 class="section-title">What is it?</h2>
          <p class="section-hint">Specific details help the match engine and staff find it faster.</p>
        </div>
      </header>
      <div class="section-body">
        <div class="field">
          <label class="form-label" for="title">Title</label>
          <input id="title" v-model="form.title" class="form-control" :class="{ 'is-invalid': show('title') }" maxlength="120" autocapitalize="sentences" enterkeyhint="next"
            :placeholder="isLost ? 'e.g. Black Dell XPS laptop in grey sleeve' : 'e.g. Silver keyring with 3 keys'" />
          <div class="invalid-feedback">{{ errors.title }}</div>
        </div>
        <div class="field category-field">
          <label class="form-label">Category</label>
          <CategoryPicker v-model="form.category" />
          <div v-if="show('category')" class="field-error"><i class="bi bi-exclamation-circle me-1"></i>{{ errors.category }}</div>
        </div>
        <div class="field">
          <div class="label-row">
            <label class="form-label" for="description">Description</label>
            <span class="counter">{{ form.description.length }}/2000</span>
          </div>
          <textarea id="description" v-model="form.description" rows="4" maxlength="2000" class="form-control" :class="{ 'is-invalid': show('description') }"
            :placeholder="isLost ? 'Brand, colour, stickers, contents, distinguishing marks…' : 'Describe it, but keep one detail back so the owner can prove it is theirs.'"></textarea>
          <div class="invalid-feedback">{{ errors.description }}</div>
        </div>
        <div class="field">
          <label class="form-label">Photos <span class="optional">Optional</span></label>
          <PhotoUploader v-model="form.photos" :folder="type" @busy="uploading = $event" />
        </div>
      </div>
    </section>

    <!-- When & where -->
    <section class="form-section card">
      <header class="section-head">
        <span class="section-step">3</span>
        <div>
          <h2 class="section-title">When & where?</h2>
          <p class="section-hint">{{ isLost ? 'Pin the area so we can alert you about nearby finds.' : 'Pin where you found it so nearby owners get alerted.' }}</p>
        </div>
      </header>
      <div class="section-body">
        <template v-if="isLost">
          <div class="field">
            <div class="segmented mode-toggle" role="radiogroup" aria-label="Do you know where you lost it?">
              <input id="mode-map" v-model="form.locationMode" type="radio" class="visually-hidden" value="map" />
              <label for="mode-map"><i class="bi bi-pin-map"></i>I know roughly where</label>
              <input id="mode-unknown" v-model="form.locationMode" type="radio" class="visually-hidden" value="unknown" />
              <label for="mode-unknown"><i class="bi bi-question-diamond"></i>I have no idea</label>
            </div>
          </div>

          <div class="field">
            <div class="row g-2 g-sm-3">
            <div class="col-6">
              <label class="form-label" for="dateFrom">{{ form.locationMode === 'unknown' ? 'Last seen on' : 'Date lost' }}</label>
              <input id="dateFrom" v-model="form.dateFrom" type="date" :max="today" class="form-control" :class="{ 'is-invalid': show('dateFrom') }" />
              <div class="invalid-feedback">{{ errors.dateFrom }}</div>
            </div>
            <div class="col-6">
              <label class="form-label" for="dateTo">{{ form.locationMode === 'unknown' ? 'Noticed missing on' : 'Or as late as' }}</label>
              <input id="dateTo" v-model="form.dateTo" type="date" :min="form.dateFrom" :max="today" class="form-control" :class="{ 'is-invalid': show('dateTo') }" />
              <div class="invalid-feedback">{{ errors.dateTo }}</div>
            </div>
            </div>
          </div>

          <template v-if="form.locationMode === 'map'">
            <div class="field">
              <MapPicker v-model="form.location" :radius="Number(form.alertRadiusMeters)" :center="mapCenter" kind="lost" />
              <div v-if="show('location')" class="field-error"><i class="bi bi-exclamation-circle me-1"></i>{{ errors.location }}</div>
            </div>
            <div class="field">
              <label class="form-label" id="radius-label">Alert me about found items within</label>
              <div class="segmented radius-chips" role="radiogroup" aria-labelledby="radius-label">
                <template v-for="r in RADIUS_OPTIONS" :key="r">
                  <input :id="`radius-${r}`" v-model.number="form.alertRadiusMeters" type="radio" class="visually-hidden" :value="r" />
                  <label :for="`radius-${r}`">{{ formatDistance(r) }}</label>
                </template>
              </div>
              <div class="form-text">You'll get a dashboard alert and an email when a matching item is logged inside this radius.</div>
            </div>
          </template>
          <div v-else class="field">
            <label class="form-label" for="areas">Places you visited during that time <span class="optional">Optional</span></label>
            <textarea id="areas" v-model="form.areasVisited" rows="3" maxlength="1000" class="form-control" placeholder="e.g. Library 2nd floor, cafeteria, bus route 12, gym locker room"></textarea>
            <div class="form-text">We'll match by category and date and flag it to organization staff.</div>
          </div>
        </template>

        <template v-else>
          <div class="field">
            <div class="row g-3">
            <div class="col-sm-6">
              <label class="form-label" for="dateFound">Date found</label>
              <input id="dateFound" v-model="form.dateFound" type="date" :max="today" class="form-control" :class="{ 'is-invalid': show('dateFound') }" />
              <div class="invalid-feedback">{{ errors.dateFound }}</div>
            </div>
            <div class="col-sm-6">
              <label class="form-label" for="currentLocation">Where is it now? <span class="optional">Optional</span></label>
              <input id="currentLocation" v-model="form.currentLocation" maxlength="200" class="form-control" placeholder="e.g. Handed to front desk, Building B" />
            </div>
            </div>
          </div>
          <div class="field">
            <MapPicker v-model="form.location" :center="mapCenter" kind="found" />
            <div v-if="show('location')" class="field-error"><i class="bi bi-exclamation-circle me-1"></i>{{ errors.location }}</div>
          </div>
        </template>
      </div>
    </section>

    <div class="form-actions d-flex align-items-center justify-content-end gap-2">
      <span class="actions-note hide-mobile me-auto"><i class="bi bi-shield-check me-1"></i>You can edit or close this report any time.</span>
      <RouterLink to="/dashboard" class="btn btn-light">Cancel</RouterLink>
      <button class="btn btn-primary px-4" :disabled="submitting || uploading">
        <span v-if="submitting" class="spinner-border spinner-border-sm me-2"></span>
        {{ uploading ? 'Waiting for uploads…' : isLost ? 'Report lost item' : 'Log found item' }}
        <i v-if="!submitting && !uploading" class="bi bi-arrow-right ms-1"></i>
      </button>
    </div>
  </form>
</template>

<style scoped>
/* Section cards: numbered header, hairline, body */
.form-section { margin-bottom: 1.25rem; border-radius: var(--fi-radius-xl); box-shadow: var(--fi-shadow-sm); overflow: hidden; }
.section-head { display: flex; gap: 0.85rem; align-items: flex-start; padding: 1.15rem 1.5rem; border-bottom: 1px solid var(--fi-line); background: linear-gradient(180deg, rgba(var(--fi-wash), 0.6), transparent); }
.section-step {
  flex-shrink: 0; width: 1.75rem; height: 1.75rem; border-radius: 0.55rem; margin-top: 0.05rem;
  display: inline-flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 700;
  color: var(--fi-primary-700); background: rgba(var(--fi-primary-rgb), 0.1); box-shadow: inset 0 0 0 1px rgba(var(--fi-primary-rgb), 0.18);
}
.section-title { font-size: 0.975rem; font-weight: 650; letter-spacing: -0.015em; margin: 0; color: var(--fi-ink); }
.section-hint { font-size: 0.8125rem; color: var(--fi-muted); margin: 0.15rem 0 0; }
.section-body { padding: 1.5rem; }
.field + .field { margin-top: 1.4rem; }

/* Labels & inputs */
.form-label { font-weight: 600; }
.label-row { display: flex; align-items: baseline; justify-content: space-between; }
.counter { font-size: 0.75rem; color: var(--fi-subtle); font-variant-numeric: tabular-nums; }
.optional { margin-left: 0.35rem; padding: 0.05rem 0.45rem; border-radius: 999px; background: var(--fi-sunken); color: var(--fi-muted); font-size: 0.6875rem; font-weight: 550; vertical-align: 0.1em; }
.form-control, .form-select { border-radius: 0.625rem; padding: 0.65rem 0.9rem; }
.form-control.is-invalid { box-shadow: 0 0 0 4px rgba(var(--fi-lost-rgb), 0.1); }
.field-error { margin-top: 0.45rem; font-size: 0.8125rem; color: var(--fi-lost); }

/* Radio cards */
.choice-list { display: grid; gap: 0.6rem; max-height: 17rem; overflow-y: auto; }
.choice {
  display: flex; align-items: center; gap: 0.85rem; padding: 0.85rem 1rem; margin: 0; cursor: pointer;
  border: 1px solid var(--fi-line-strong); border-radius: var(--fi-radius); background: var(--fi-surface);
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
}
.choice:hover { border-color: #c9ccd8; }
.choice:focus-within { box-shadow: var(--fi-ring); }
.choice.selected { border-color: var(--fi-primary); background: rgba(var(--fi-primary-rgb), 0.04); box-shadow: 0 0 0 1px var(--fi-primary); }
.choice-icon { width: 2.25rem; height: 2.25rem; border-radius: 0.6rem; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; background: var(--fi-sunken); color: var(--fi-muted); }
.choice.selected .choice-icon { background: rgba(var(--fi-primary-rgb), 0.12); color: var(--fi-primary); }
.choice-text { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.choice-title { font-weight: 600; font-size: 0.9rem; color: var(--fi-ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.choice-sub { font-size: 0.775rem; color: var(--fi-muted); }
.choice-check { color: var(--fi-primary); font-size: 1.1rem; opacity: 0; transform: scale(0.6); transition: opacity 0.15s ease, transform 0.2s var(--fi-ease); }
.choice.selected .choice-check { opacity: 1; transform: none; }

/* Segmented control */
.segmented { display: flex; gap: 0.25rem; padding: 0.25rem; border-radius: 0.75rem; background: var(--fi-sunken); box-shadow: inset 0 0 0 1px var(--fi-line); }
.segmented label {
  flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 0.45rem; margin: 0;
  padding: 0.55rem 0.75rem; border-radius: 0.55rem; cursor: pointer; white-space: nowrap;
  font-size: 0.85rem; font-weight: 550; color: var(--fi-muted);
  transition: background-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
}
.segmented label:hover { color: var(--fi-ink); }
.segmented input:checked + label { background: var(--fi-surface); color: var(--fi-ink); box-shadow: var(--fi-shadow-sm), 0 0 0 1px var(--fi-line); }
.segmented input:checked + label .bi { color: var(--fi-primary); }
.segmented input:focus-visible + label { box-shadow: var(--fi-ring); }
.radius-chips { max-width: 28rem; }

/* Category tiles: tinted selection instead of a solid fill */
.category-field :deep(.btn) { border-radius: var(--fi-radius); box-shadow: none; min-height: 4.25rem; }
.category-field :deep(.btn-outline-secondary) { border-color: var(--fi-line-strong) !important; }
.category-field :deep(.btn-primary) {
  --bs-btn-bg: rgba(var(--fi-primary-rgb), 0.06); --bs-btn-hover-bg: rgba(var(--fi-primary-rgb), 0.1); --bs-btn-active-bg: rgba(var(--fi-primary-rgb), 0.12);
  --bs-btn-color: var(--fi-primary-700); --bs-btn-hover-color: var(--fi-primary-700); --bs-btn-active-color: var(--fi-primary-700);
  border-color: var(--fi-primary); box-shadow: 0 0 0 1px var(--fi-primary);
}

/* Actions */
.form-actions { padding-top: 0.25rem; }
.actions-note { font-size: 0.8125rem; color: var(--fi-muted); }

@media (max-width: 767.98px) {
  .form-section { margin-bottom: 1rem; }
  .section-head { padding: 1rem 1.25rem; }
  .section-body { padding: 1.25rem; }
  .field + .field { margin-top: 1.25rem; }

  /* Stack icon over label so both options fit without wrapping mid-phrase */
  .mode-toggle label { flex-direction: column; gap: 0.3rem; padding: 0.7rem 0.5rem; font-size: 0.8125rem; line-height: 1.25; white-space: normal; text-align: center; }
  .mode-toggle label .bi { font-size: 1.15rem; }
  .radius-chips { max-width: none; overflow-x: auto; scrollbar-width: none; }
  .radius-chips::-webkit-scrollbar { display: none; }
  .radius-chips label { padding: 0.55rem 0.6rem; }

  /* Submit bar: clear of the last card, thumb-sized */
  .form-actions { margin-top: 1.5rem !important; padding-top: 0.9rem !important; gap: 0.75rem !important; }
}
</style>
