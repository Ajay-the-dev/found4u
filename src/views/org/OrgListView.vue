<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useOrgStore } from '@/stores/org'
import { useUiStore } from '@/stores/ui'
import { ORG_TYPES, ROLES } from '@/utils/constants'
import { atLeast } from '@/utils/permissions'
import { formatDate } from '@/utils/format'
import RoleBadge from '@/components/org/RoleBadge.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

const router = useRouter()
const org = useOrgStore()
const ui = useUiStore()

const invitations = ref([])
const accepting = ref(null)
const typeMeta = (t) => ORG_TYPES.find((o) => o.value === t) || ORG_TYPES.at(-1)

onMounted(async () => {
  try {
    invitations.value = await org.fetchMyInvitations()
  } catch (err) {
    console.warn('[orgs] invitations', err)
  }
})

async function accept(inv) {
  accepting.value = inv.id
  try {
    const orgId = await org.acceptInvitation(inv)
    ui.toast(`Joined ${inv.orgName}`, 'success')
    router.push(`/orgs/${orgId}`)
  } catch (err) {
    ui.error(err, 'Could not accept invitation')
  } finally {
    accepting.value = null
  }
}
</script>

<template>
  <div class="container py-4">
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
      <div>
        <h1 class="h3 mb-1">Organizations</h1>
        <p class="text-secondary small mb-0">Each organization has its own lost &amp; found, asset tags and team.</p>
      </div>
      <RouterLink to="/orgs/new" class="btn btn-primary"><i class="bi bi-plus-lg me-1"></i>Create organization</RouterLink>
    </div>

    <div v-if="invitations.length" class="card border-primary mb-4">
      <div class="card-header bg-primary-subtle"><i class="bi bi-envelope-paper me-1"></i><strong>Pending invitations</strong></div>
      <div class="list-group list-group-flush">
        <div v-for="inv in invitations" :key="inv.id" class="list-group-item d-flex flex-wrap align-items-center gap-2">
          <div class="flex-grow-1">
            <strong>{{ inv.orgName }}</strong> invited you as <RoleBadge :role="inv.role" />
            <div class="small text-secondary">From {{ inv.invitedByName }} · expires {{ formatDate(inv.expiresAt) }}</div>
          </div>
          <button class="btn btn-sm btn-primary" :disabled="accepting === inv.id" @click="accept(inv)">
            <span v-if="accepting === inv.id" class="spinner-border spinner-border-sm me-1"></span>Accept
          </button>
        </div>
      </div>
    </div>

    <LoadingSpinner v-if="!org.loaded" />
    <div v-else-if="!org.myOrgs.length" class="card">
      <EmptyState icon="bi-diagram-3" title="You're not in any organization" text="Create a workspace for your campus, office or transit hub, or ask an admin to send you an invite.">
        <RouterLink to="/orgs/new" class="btn btn-sm btn-primary">Create organization</RouterLink>
      </EmptyState>
    </div>
    <div v-else v-reveal.stagger class="row g-3">
      <div v-for="o in org.myOrgs" :key="o.id" class="col-md-6 col-xl-4">
        <div class="card h-100 card-hover">
          <div class="card-body">
            <div class="d-flex align-items-start gap-3 mb-2">
              <span class="stat-icon tone-primary"><i class="bi" :class="typeMeta(o.type).icon"></i></span>
              <div class="min-w-0 flex-grow-1">
                <RouterLink :to="`/orgs/${o.id}`" class="h6 d-block mb-0 text-decoration-none text-body stretched-link text-truncate">{{ o.name }}</RouterLink>
                <div class="small text-secondary">{{ typeMeta(o.type).label }}</div>
              </div>
              <RoleBadge :role="o.role" />
            </div>
            <p class="small text-secondary mb-0">{{ o.description || ROLES[o.role].description }}</p>
          </div>
          <div class="card-footer bg-white d-flex gap-2 small position-relative" style="z-index: 2">
            <RouterLink v-if="atLeast(o.role, 'staff')" :to="`/orgs/${o.id}/command`" class="btn btn-sm btn-outline-primary"><i class="bi bi-broadcast me-1"></i>Command center</RouterLink>
            <RouterLink v-if="atLeast(o.role, 'admin')" :to="`/orgs/${o.id}/members`" class="btn btn-sm btn-outline-secondary"><i class="bi bi-people me-1"></i>Members</RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
