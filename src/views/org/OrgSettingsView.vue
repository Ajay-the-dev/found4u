<script setup>
import { reactive, ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useOrgStore } from '@/stores/org'
import { useUiStore } from '@/stores/ui'
import { ORG_TYPES, RADIUS_OPTIONS } from '@/utils/constants'
import { formatDistance } from '@/utils/geo'
import MapPicker from '@/components/map/MapPicker.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

const route = useRoute()
const router = useRouter()
const org = useOrgStore()
const ui = useUiStore()

const orgId = computed(() => route.params.orgId)
const current = computed(() => org.orgs[orgId.value])
const form = reactive({ name: '', type: 'other', description: '', alertRadiusMeters: 1000, center: null })
const saving = ref(false)
const hydrated = ref(false)

watch(
  current,
  (o) => {
    if (!o || hydrated.value) return
    Object.assign(form, {
      name: o.name,
      type: o.type || 'other',
      description: o.description || '',
      alertRadiusMeters: o.settings?.alertRadiusMeters || 1000,
      center: o.settings?.center || null,
    })
    hydrated.value = true
  },
  { immediate: true },
)

const isOwner = computed(() => org.roleIn(orgId.value) === 'owner')
const confirmName = ref('')
const deleting = ref(false)
const canDelete = computed(() => current.value && confirmName.value.trim() === current.value.name)

async function deleteOrganization() {
  if (!canDelete.value) return
  const name = current.value.name
  deleting.value = true
  try {
    await org.deleteOrg(orgId.value)
    ui.toast('Organization deleted', 'success', { body: `${name} and all of its data have been removed.` })
    router.replace({ name: 'orgs' })
  } catch (err) {
    ui.error(err, 'Could not delete organization')
    deleting.value = false
  }
}

async function save() {
  if (form.name.trim().length < 2) return ui.toast('Name is too short', 'warning')
  saving.value = true
  try {
    await org.updateOrg(orgId.value, {
      name: form.name.trim(),
      type: form.type,
      description: form.description.trim(),
      settings: { alertRadiusMeters: form.alertRadiusMeters, center: form.center },
    })
    ui.toast('Settings saved')
  } catch (err) {
    ui.error(err, 'Could not save settings')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="container py-4" style="max-width: 820px">
    <RouterLink :to="`/orgs/${orgId}`" class="small text-decoration-none"><i class="bi bi-arrow-left me-1"></i>{{ current?.name }}</RouterLink>
    <h1 class="h3 mb-4">Organization settings</h1>
    <LoadingSpinner v-if="!hydrated" />
    <form v-else @submit.prevent="save">
      <div class="card mb-3">
        <div class="card-body">
          <div class="mb-3">
            <label class="form-label" for="name">Name</label>
            <input id="name" v-model="form.name" class="form-control" maxlength="120" />
          </div>
          <div class="mb-3">
            <label class="form-label" for="type">Type</label>
            <select id="type" v-model="form.type" class="form-select">
              <option v-for="t in ORG_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
            </select>
          </div>
          <div class="mb-3">
            <label class="form-label" for="desc">Description</label>
            <textarea id="desc" v-model="form.description" rows="3" maxlength="1000" class="form-control"></textarea>
          </div>
          <div>
            <label class="form-label" for="radius">Default alert radius</label>
            <select id="radius" v-model.number="form.alertRadiusMeters" class="form-select" style="max-width: 220px">
              <option v-for="r in RADIUS_OPTIONS" :key="r" :value="r">{{ formatDistance(r) }}</option>
            </select>
            <div class="form-text">Pre-selected for members' lost reports and used by the command center's proximity flags.</div>
          </div>
        </div>
      </div>
      <div class="card mb-3">
        <div class="card-body">
          <h2 class="h6">Map centre</h2>
          <MapPicker v-model="form.center" :radius="form.alertRadiusMeters" height="300px" />
        </div>
      </div>
      <div class="text-end">
        <button class="btn btn-primary px-4" :disabled="saving"><span v-if="saving" class="spinner-border spinner-border-sm me-2"></span>Save settings</button>
      </div>
    </form>

    <div v-if="hydrated && isOwner" class="card danger-zone mt-5">
      <div class="card-body">
        <h2 class="h6 text-danger mb-1"><i class="bi bi-exclamation-octagon me-1"></i>Danger zone</h2>
        <p class="small text-secondary mb-3">
          Deleting <strong class="text-body">{{ current?.name }}</strong> permanently removes the organization, its members, pending invitations,
          all lost &amp; found reports and matches filed under it, and its asset tags. This can't be undone.
        </p>
        <label class="form-label" for="confirm-name">Type <strong>{{ current?.name }}</strong> to confirm</label>
        <div class="d-flex flex-column flex-sm-row gap-2">
          <input id="confirm-name" v-model="confirmName" class="form-control" autocomplete="off" :disabled="deleting" @keydown.enter.prevent="deleteOrganization" />
          <button type="button" class="btn btn-danger text-nowrap" :disabled="!canDelete || deleting" @click="deleteOrganization">
            <span v-if="deleting" class="spinner-border spinner-border-sm me-2"></span>Delete organization
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.danger-zone { border-color: #ffd5dc; }
</style>
