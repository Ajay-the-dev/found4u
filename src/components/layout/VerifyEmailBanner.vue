<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'

const auth = useAuthStore()
const ui = useUiStore()
const busy = ref(false)

async function resend() {
  busy.value = true
  try {
    await auth.resendVerification()
    ui.toast('Verification email sent', 'success', { body: `Check ${auth.email}` })
  } catch (err) {
    ui.error(err, 'Could not send email')
  } finally {
    busy.value = false
  }
}

async function recheck() {
  busy.value = true
  try {
    const ok = await auth.refreshVerification()
    ui.toast(ok ? 'Email verified — thanks!' : 'Not verified yet', ok ? 'success' : 'warning')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div v-if="auth.needsEmailVerification" class="alert alert-warning rounded-0 border-0 border-bottom mb-0 py-2 d-print-none">
    <div class="container d-flex flex-wrap align-items-center gap-2 small">
      <span class="d-none d-md-inline-flex stat-icon tone-warning rounded-2 align-items-center justify-content-center" style="width: 1.5rem; height: 1.5rem"><i class="bi bi-envelope-exclamation"></i></span>
      <span class="me-auto"><span class="d-md-none">Verify <strong>{{ auth.email }}</strong> to join organizations.</span><span class="d-none d-md-inline">Please verify <strong>{{ auth.email }}</strong> — it's required to accept organization invitations.</span></span>
      <button class="btn btn-sm btn-outline-secondary" :disabled="busy" @click="resend">Resend email</button>
      <button class="btn btn-sm btn-dark" :disabled="busy" @click="recheck">I've verified</button>
    </div>
  </div>
</template>
