<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { friendlyError } from '@/utils/errors'
import AuthShell from './AuthShell.vue'

const auth = useAuthStore()
const email = ref(auth.email || '')
const busy = ref(false)
const sent = ref(false)
const error = ref('')

async function submit() {
  busy.value = true
  error.value = ''
  try {
    await auth.resetPassword(email.value)
    sent.value = true
  } catch (err) {
    // Don't reveal whether an account exists for this address.
    if (err.code === 'auth/user-not-found') sent.value = true
    else error.value = friendlyError(err)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <AuthShell title="Reset your password" subtitle="We'll email you a secure link to choose a new password.">
    <div v-if="sent" class="alert alert-success small">
      <i class="bi bi-envelope-check me-1"></i>If an account exists for <strong>{{ email }}</strong>, a reset link is on its way. The link expires in one hour.
    </div>
    <form v-else @submit.prevent="submit">
      <div v-if="error" class="alert alert-danger small py-2">{{ error }}</div>
      <div class="mb-3">
        <label class="form-label" for="email">Email</label>
        <input id="email" v-model="email" type="email" class="form-control" autocomplete="email" required />
      </div>
      <button class="btn btn-primary btn-lg w-100" :disabled="busy">
        <span v-if="busy" class="spinner-border spinner-border-sm me-2"></span>Send reset link
      </button>
    </form>
    <template #footer>
      <RouterLink to="/login"><i class="bi bi-arrow-left me-1"></i>Back to sign in</RouterLink>
    </template>
  </AuthShell>
</template>
