<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useOrgStore } from '@/stores/org'
import { useUiStore } from '@/stores/ui'
import { ORG_TYPES, RADIUS_OPTIONS, DEFAULT_ALERT_RADIUS } from '@/utils/constants'
import { formatDistance } from '@/utils/geo'
import MapPicker from '@/components/map/MapPicker.vue'

const router = useRouter()
const org = useOrgStore()
const ui = useUiStore()

const form = reactive({ name: '', type: 'campus', description: '', alertRadiusMeters: DEFAULT_ALERT_RADIUS, center: null })
const saving = ref(false)
const attempted = ref(false)

async function submit() {
  attempted.value = true
  if (form.name.trim().length < 2) return
  saving.value = true
  try {
    const id = await org.createOrg(form)
    ui.toast(`${form.name} created`, 'success', { body: 'Invite your team to get started.' })
    router.push(`/orgs/${id}/members`)
  } catch (err) {
    ui.error(err, 'Could not create organization')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="container py-4" style="max-width: 820px">
    <h1 class="h3 mb-1"><i class="bi bi-building-add text-primary me-2"></i>Create an organization</h1>
    <p class="text-secondary mb-4">You'll be the owner. Items, asset tags and members stay isolated to this workspace.</p>
    <form novalidate @submit.prevent="submit">
      <div class="card mb-3">
        <div class="card-body">
          <div class="mb-3">
            <label class="form-label" for="name">Organization name</label>
            <input id="name" v-model="form.name" class="form-control" :class="{ 'is-invalid': attempted && form.name.trim().length < 2 }" maxlength="120" placeholder="e.g. Riverside University — Main Campus" />
            <div class="invalid-feedback">Please enter a name.</div>
          </div>
          <div class="mb-3">
            <label class="form-label">Type</label>
            <div class="row g-2">
              <div v-for="t in ORG_TYPES" :key="t.value" class="col-6 col-md-4">
                <input :id="`type-${t.value}`" v-model="form.type" class="btn-check" type="radio" :value="t.value" />
                <label class="btn btn-outline-secondary w-100 text-start small" :for="`type-${t.value}`"><i class="bi me-2" :class="t.icon"></i>{{ t.label }}</label>
              </div>
            </div>
          </div>
          <div class="mb-3">
            <label class="form-label" for="desc">Description <span class="text-secondary">(optional)</span></label>
            <textarea id="desc" v-model="form.description" rows="2" maxlength="1000" class="form-control" placeholder="Where is the lost & found desk? Opening hours?"></textarea>
          </div>
          <div>
            <label class="form-label" for="radius">Default alert radius</label>
            <select id="radius" v-model.number="form.alertRadiusMeters" class="form-select" style="max-width: 220px">
              <option v-for="r in RADIUS_OPTIONS" :key="r" :value="r">{{ formatDistance(r) }}</option>
            </select>
          </div>
        </div>
      </div>
      <div class="card mb-3">
        <div class="card-body">
          <h2 class="h6">Location <span class="text-secondary fw-normal">(optional)</span></h2>
          <p class="small text-secondary">Used to centre maps for your members. Pin your main building or lost-and-found desk.</p>
          <MapPicker v-model="form.center" :radius="form.alertRadiusMeters" height="300px" />
        </div>
      </div>
      <div class="d-flex justify-content-end gap-2">
        <RouterLink to="/orgs" class="btn btn-light">Cancel</RouterLink>
        <button class="btn btn-primary px-4" :disabled="saving"><span v-if="saving" class="spinner-border spinner-border-sm me-2"></span>Create organization</button>
      </div>
    </form>
  </div>
</template>
