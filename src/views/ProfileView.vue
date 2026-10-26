<script setup>
import { ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { RADIUS_OPTIONS } from '@/utils/constants'
import { formatDistance } from '@/utils/geo'
import UserAvatar from '@/components/common/UserAvatar.vue'

const auth = useAuthStore()
const ui = useUiStore()

const name = ref(auth.displayName)
const emailAlerts = ref(auth.prefs.emailAlerts)
const radius = ref(auth.prefs.alertRadiusMeters)
const saving = ref(false)

// The profile doc may arrive after first render.
watch(
  () => auth.profile,
  (p) => {
    if (!p) return
    name.value = p.displayName || name.value
    emailAlerts.value = auth.prefs.emailAlerts
    radius.value = auth.prefs.alertRadiusMeters
  },
)

async function save() {
  if (name.value.trim().length < 2) return ui.toast('Please enter your name', 'warning')
  saving.value = true
  try {
    await auth.updateUserProfile({ displayName: name.value, prefs: { emailAlerts: emailAlerts.value, alertRadiusMeters: radius.value } })
    ui.toast('Profile saved')
  } catch (err) {
    ui.error(err, 'Could not save profile')
  } finally {
    saving.value = false
  }
}

async function sendReset() {
  try {
    await auth.resetPassword(auth.email)
    ui.toast('Password reset email sent', 'success', { body: auth.email })
  } catch (err) {
    ui.error(err)
  }
}
</script>

<template>
  <div class="container py-4" style="max-width: 720px">
    <h1 class="h3 mb-4">Profile & alerts</h1>
    <form class="card mb-4" @submit.prevent="save">
      <div class="card-body">
        <div class="d-flex align-items-center gap-3 mb-4">
          <UserAvatar :name="auth.displayName" :photo="auth.photoURL" size="3.5rem" />
          <div>
            <div class="fw-semibold">{{ auth.email }}</div>
            <span v-if="auth.emailVerified || !auth.needsEmailVerification" class="badge text-bg-success"><i class="bi bi-patch-check me-1"></i>Verified</span>
            <span v-else class="badge text-bg-warning">Not verified</span>
          </div>
        </div>
        <div class="mb-3">
          <label class="form-label" for="name">Display name</label>
          <input id="name" v-model="name" class="form-control" maxlength="80" />
          <div class="form-text">Shown to people you chat with about items. Never shown on QR scan pages.</div>
        </div>
        <hr />
        <h2 class="h6"><i class="bi bi-radar text-primary me-1"></i>Radius alerts</h2>
        <div class="mb-3">
          <label class="form-label small" for="radius">Default alert radius for new lost reports</label>
          <select id="radius" v-model.number="radius" class="form-select" style="max-width: 220px">
            <option v-for="r in RADIUS_OPTIONS" :key="r" :value="r">{{ formatDistance(r) }}</option>
          </select>
        </div>
        <div class="form-check form-switch">
          <input id="emailAlerts" v-model="emailAlerts" class="form-check-input" type="checkbox" role="switch" />
          <label class="form-check-label" for="emailAlerts">Email me about matches, scans and status changes</label>
        </div>
      </div>
      <div class="card-footer bg-white text-end">
        <button class="btn btn-primary" :disabled="saving"><span v-if="saving" class="spinner-border spinner-border-sm me-2"></span>Save</button>
      </div>
    </form>

    <div class="card">
      <div class="card-body d-flex flex-wrap justify-content-between align-items-center gap-2">
        <div>
          <div class="fw-semibold">Password</div>
          <div class="small text-secondary">We'll email you a secure link to set a new password.</div>
        </div>
        <button class="btn btn-outline-secondary" @click="sendReset"><i class="bi bi-key me-1"></i>Send reset link</button>
      </div>
    </div>
  </div>
</template>
