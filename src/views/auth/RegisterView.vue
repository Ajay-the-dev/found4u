<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { friendlyError } from '@/utils/errors'
import AuthShell from './AuthShell.vue'
import GoogleButton from './GoogleButton.vue'

const auth = useAuthStore()
const ui = useUiStore()
const route = useRoute()
const router = useRouter()

const name = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const busy = ref(false)
const error = ref('')

const strength = computed(() => {
  const p = password.value
  let score = 0
  if (p.length >= 8) score++
  if (p.length >= 12) score++
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++
  if (/\d/.test(p)) score++
  if (/[^\w\s]/.test(p)) score++
  return Math.min(score, 4)
})
const strengthLabel = computed(() => ['Too short', 'Weak', 'Fair', 'Good', 'Strong'][strength.value])
const strengthColor = computed(() => ['danger', 'danger', 'warning', 'info', 'success'][strength.value])

const redirectTarget = () => (typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/') ? route.query.redirect : '/dashboard')

async function submit() {
  error.value = ''
  if (name.value.trim().length < 2) return (error.value = 'Please enter your name.')
  if (password.value.length < 8) return (error.value = 'Password must be at least 8 characters.')
  if (password.value !== confirmPassword.value) return (error.value = 'Passwords do not match.')
  busy.value = true
  try {
    await auth.register({ name: name.value, email: email.value, password: password.value })
    ui.toast('Account created', 'success', { body: `We sent a verification link to ${email.value}.` })
    router.replace(redirectTarget())
  } catch (err) {
    error.value = friendlyError(err)
  } finally {
    busy.value = false
  }
}

async function google() {
  busy.value = true
  error.value = ''
  try {
    if (await auth.loginWithGoogle()) router.replace(redirectTarget())
  } catch (err) {
    error.value = friendlyError(err)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <AuthShell title="Create your account" subtitle="Report items, register QR tags and join your organization.">
    <div v-if="error" class="alert alert-danger small py-2">{{ error }}</div>
    <GoogleButton :busy="busy" @click="google" />
    <div class="d-flex align-items-center gap-2 my-3 text-secondary small"><hr class="flex-grow-1" />or<hr class="flex-grow-1" /></div>
    <form @submit.prevent="submit">
      <div class="mb-3">
        <label class="form-label" for="name">Full name</label>
        <input id="name" v-model="name" class="form-control" autocomplete="name" required maxlength="80" />
      </div>
      <div class="mb-3">
        <label class="form-label" for="email">Email</label>
        <input id="email" v-model="email" type="email" class="form-control" autocomplete="email" required />
        <div class="form-text">Use the address your organization will invite.</div>
      </div>
      <div class="mb-3">
        <label class="form-label" for="password">Password</label>
        <input id="password" v-model="password" type="password" class="form-control" autocomplete="new-password" required minlength="8" />
        <div v-if="password" class="d-flex align-items-center gap-2 mt-1">
          <div class="progress flex-grow-1" style="height: 4px">
            <div class="progress-bar" :class="`bg-${strengthColor}`" :style="{ width: `${(strength / 4) * 100}%` }"></div>
          </div>
          <span class="small" :class="`text-${strengthColor}`">{{ strengthLabel }}</span>
        </div>
      </div>
      <div class="mb-4">
        <label class="form-label" for="confirm">Confirm password</label>
        <input id="confirm" v-model="confirmPassword" type="password" class="form-control" autocomplete="new-password" required />
      </div>
      <button class="btn btn-primary w-100" :disabled="busy">
        <span v-if="busy" class="spinner-border spinner-border-sm me-2"></span>Create account
      </button>
    </form>
    <template #footer>
      Already have an account? <RouterLink :to="{ name: 'login', query: route.query }">Sign in</RouterLink>
    </template>
  </AuthShell>
</template>
