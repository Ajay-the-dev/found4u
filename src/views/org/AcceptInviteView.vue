<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useOrgStore } from '@/stores/org'
import { useUiStore } from '@/stores/ui'
import { ROLES } from '@/utils/constants'
import { formatDate } from '@/utils/format'
import { friendlyError } from '@/utils/errors'
import RoleBadge from '@/components/org/RoleBadge.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const org = useOrgStore()
const ui = useUiStore()

const token = computed(() => route.params.token)
const invitation = ref(null)
const loading = ref(true)
const error = ref('')
const busy = ref(false)

const problem = computed(() => {
  const inv = invitation.value
  if (!inv) return null
  if (inv.status === 'accepted') return 'This invitation has already been used.'
  if (inv.status === 'revoked') return 'This invitation was revoked by an admin.'
  if (inv.expiresAt?.toMillis() < Date.now()) return 'This invitation has expired. Ask an admin to send a new one.'
  if (inv.email !== auth.email) return `This invitation was sent to ${inv.email}, but you're signed in as ${auth.email}.`
  return null
})
const alreadyMember = computed(() => invitation.value && !!org.roleIn(invitation.value.orgId))

onMounted(async () => {
  if (!auth.isAuthenticated) return (loading.value = false)
  try {
    await org.waitUntilLoaded()
    invitation.value = await org.getInvitation(token.value)
    if (!invitation.value) error.value = 'This invitation link is invalid.'
  } catch (err) {
    error.value = friendlyError(err)
  } finally {
    loading.value = false
  }
})

async function accept() {
  busy.value = true
  try {
    const orgId = await org.acceptInvitation(invitation.value)
    ui.toast(`Welcome to ${invitation.value.orgName}!`, 'success')
    router.replace(`/orgs/${orgId}`)
  } catch (err) {
    ui.error(err, 'Could not join organization')
  } finally {
    busy.value = false
  }
}

async function switchAccount() {
  await auth.logout()
  router.push({ name: 'login', query: { redirect: route.fullPath } })
}
</script>

<template>
  <div class="container py-5" style="max-width: 560px">
    <div class="card p-4 text-center">
      <div class="display-6 text-primary mb-2"><i class="bi bi-envelope-paper-heart"></i></div>

      <template v-if="!auth.isAuthenticated">
        <h1 class="h4">You've been invited to an organization</h1>
        <p class="text-secondary">Sign in or create an account with the email address the invitation was sent to.</p>
        <div class="d-flex justify-content-center gap-2">
          <RouterLink :to="{ name: 'login', query: { redirect: route.fullPath } }" class="btn btn-primary">Sign in</RouterLink>
          <RouterLink :to="{ name: 'register', query: { redirect: route.fullPath } }" class="btn btn-outline-primary">Create account</RouterLink>
        </div>
      </template>

      <LoadingSpinner v-else-if="loading" label="Checking invitation…" />
      <div v-else-if="error" class="alert alert-danger mb-0">{{ error }}</div>

      <template v-else-if="invitation">
        <h1 class="h4">Join {{ invitation.orgName }}</h1>
        <p class="text-secondary mb-2">{{ invitation.invitedByName }} invited you as</p>
        <div class="mb-2"><RoleBadge :role="invitation.role" /></div>
        <p class="small text-secondary">{{ ROLES[invitation.role]?.description }}</p>

        <div v-if="alreadyMember" class="alert alert-info">
          You're already a member. <RouterLink :to="`/orgs/${invitation.orgId}`">Open the organization</RouterLink>
        </div>
        <div v-else-if="problem" class="alert alert-warning text-start small">
          {{ problem }}
          <button v-if="invitation.email !== auth.email" class="btn btn-sm btn-outline-dark d-block mt-2" @click="switchAccount">Sign in with a different account</button>
        </div>
        <template v-else>
          <div v-if="auth.needsEmailVerification" class="alert alert-warning small text-start">
            Verify <strong>{{ auth.email }}</strong> before joining. Use the banner above to resend the email.
          </div>
          <button class="btn btn-primary px-4" :disabled="busy" @click="accept">
            <span v-if="busy" class="spinner-border spinner-border-sm me-2"></span>Accept invitation
          </button>
          <div class="small text-secondary mt-2">Expires {{ formatDate(invitation.expiresAt) }}</div>
        </template>
      </template>
    </div>
  </div>
</template>
