<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { friendlyError } from '@/utils/errors'
import AuthShell from './AuthShell.vue'
import GoogleButton from './GoogleButton.vue'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const email = ref('')
const password = ref('')
const busy = ref(false)
const error = ref('')

const redirectTarget = () => (typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/') ? route.query.redirect : '/dashboard')

async function run(fn) {
  busy.value = true
  error.value = ''
  try {
    const user = await fn()
    if (user) router.replace(redirectTarget())
  } catch (err) {
    error.value = friendlyError(err)
  } finally {
    busy.value = false
  }
}

const submit = () => run(() => auth.login(email.value, password.value))
const google = () => run(() => auth.loginWithGoogle())
</script>

<template>
  <AuthShell title="Welcome back" subtitle="Sign in to manage your reports, tags and organizations.">
    <div v-if="error" class="alert alert-danger small py-2">{{ error }}</div>
    <GoogleButton :busy="busy" @click="google" />
    <div class="d-flex align-items-center gap-2 my-3 text-secondary small"><hr class="flex-grow-1" />or<hr class="flex-grow-1" /></div>
    <form @submit.prevent="submit">
      <div class="mb-3">
        <label class="form-label" for="email">Email</label>
        <input id="email" v-model="email" type="email" class="form-control" autocomplete="email" required />
      </div>
      <div class="mb-2">
        <label class="form-label" for="password">Password</label>
        <input id="password" v-model="password" type="password" class="form-control" autocomplete="current-password" required />
      </div>
      <div class="text-end mb-3">
        <RouterLink to="/forgot-password" class="small">Forgot password?</RouterLink>
      </div>
      <button class="btn btn-primary w-100" :disabled="busy">
        <span v-if="busy" class="spinner-border spinner-border-sm me-2"></span>Sign in
      </button>
    </form>
    <template #footer>
      New to FoundIt? <RouterLink :to="{ name: 'register', query: route.query }">Create an account</RouterLink>
    </template>
  </AuthShell>
</template>
