<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useOrgStore } from '@/stores/org'
import { useUiStore } from '@/stores/ui'
import { ROLES } from '@/utils/constants'
import { canChangeRole, canRemoveMember, rolesAssignableBy } from '@/utils/permissions'
import { formatDate, timeAgo } from '@/utils/format'
import RoleBadge from '@/components/org/RoleBadge.vue'
import UserAvatar from '@/components/common/UserAvatar.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import ErrorAlert from '@/components/common/ErrorAlert.vue'

const route = useRoute()
const auth = useAuthStore()
const org = useOrgStore()
const ui = useUiStore()

const orgId = computed(() => route.params.orgId)
const myRole = computed(() => org.roleIn(orgId.value))
const assignable = computed(() => rolesAssignableBy(myRole.value))

const members = ref([])
const invitations = ref([])
const loading = ref(true)
const error = ref(null)
const search = ref('')

const inviteEmail = ref('')
const inviteRole = ref('member')
const inviting = ref(false)
const lastInvite = ref(null)
const busyUid = ref(null)

let unsubs = []
watch(
  orgId,
  (id) => {
    unsubs.forEach((u) => u())
    loading.value = true
    const onError = (err) => {
      error.value = err
      loading.value = false
    }
    unsubs = [
      org.watchMembers(id, (list) => {
        members.value = list
        loading.value = false
      }, onError),
      org.watchPendingInvitations(id, (list) => (invitations.value = list), onError),
    ]
  },
  { immediate: true },
)
onBeforeUnmount(() => unsubs.forEach((u) => u()))

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return q ? members.value.filter((m) => `${m.displayName} ${m.email}`.toLowerCase().includes(q)) : members.value
})
const counts = computed(() =>
  members.value.reduce((acc, m) => ({ ...acc, [m.role]: (acc[m.role] || 0) + 1 }), {}),
)

async function invite() {
  const email = inviteEmail.value.trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return ui.toast('Enter a valid email address', 'warning')
  if (invitations.value.some((i) => i.email === email.toLowerCase())) return ui.toast('That address already has a pending invite', 'warning')
  inviting.value = true
  try {
    lastInvite.value = { email, ...(await org.inviteMember(orgId.value, email, inviteRole.value)) }
    inviteEmail.value = ''
    ui.toast('Invitation sent', 'success', { body: `${email} will receive an email with a join link.` })
  } catch (err) {
    ui.error(err, 'Could not send invitation')
  } finally {
    inviting.value = false
  }
}

async function copy(link) {
  await navigator.clipboard.writeText(link)
  ui.toast('Invite link copied')
}

async function changeRole(member, role) {
  if (role === member.role) return
  if (role === 'admin') {
    const ok = await ui.confirm({ title: `Make ${member.displayName} an admin?`, message: 'Admins can invite people, change roles below admin and edit organization settings.', confirmText: 'Promote' })
    if (!ok) return
  }
  busyUid.value = member.uid
  try {
    await org.changeRole(orgId.value, member.uid, role)
    ui.toast(`${member.displayName} is now ${ROLES[role].label}`)
  } catch (err) {
    ui.error(err, 'Could not change role')
  } finally {
    busyUid.value = null
  }
}

async function remove(member) {
  const ok = await ui.confirm({ title: `Remove ${member.displayName}?`, message: 'They lose access to this organization immediately.', confirmText: 'Remove', variant: 'danger' })
  if (!ok) return
  busyUid.value = member.uid
  try {
    await org.removeMember(orgId.value, member.uid)
    ui.toast('Member removed')
  } catch (err) {
    ui.error(err, 'Could not remove member')
  } finally {
    busyUid.value = null
  }
}

async function revoke(inv) {
  try {
    await org.revokeInvitation(inv.id)
    ui.toast('Invitation revoked')
  } catch (err) {
    ui.error(err)
  }
}
</script>

<template>
  <div class="container py-4">
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
      <div>
        <RouterLink :to="`/orgs/${orgId}`" class="small text-decoration-none"><i class="bi bi-arrow-left me-1"></i>{{ org.orgName(orgId) }}</RouterLink>
        <h1 class="h3 mb-0">Members & roles</h1>
      </div>
      <div class="d-flex gap-2 small">
        <span v-for="(n, r) in counts" :key="r" class="badge text-bg-light border">{{ ROLES[r]?.label }}: {{ n }}</span>
      </div>
    </div>

    <ErrorAlert :error="error" />

    <div class="row g-4">
      <div class="col-lg-8">
        <div class="card">
          <div class="card-header bg-white d-flex justify-content-between align-items-center gap-2">
            <strong>Roster</strong>
            <input v-model="search" class="form-control form-control-sm" style="max-width: 240px" placeholder="Search members" />
          </div>
          <LoadingSpinner v-if="loading" />
          <div v-else class="table-responsive">
            <table class="table align-middle mb-0">
              <tbody>
                <tr v-for="m in filtered" :key="m.uid">
                  <td>
                    <div class="d-flex align-items-center gap-2">
                      <UserAvatar :name="m.displayName" />
                      <div class="min-w-0">
                        <div class="fw-semibold text-truncate">{{ m.displayName }} <span v-if="m.uid === auth.uid" class="badge text-bg-light border">you</span></div>
                        <div class="small text-secondary text-truncate">{{ m.email }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="d-none d-md-table-cell small text-secondary">Joined {{ timeAgo(m.joinedAt) }}</td>
                  <td style="width: 160px">
                    <select
                      v-if="m.uid !== auth.uid && assignable.some((r) => canChangeRole(myRole, m.role, r) && r !== m.role)"
                      class="form-select form-select-sm"
                      :value="m.role"
                      :disabled="busyUid === m.uid"
                      :aria-label="`Role for ${m.displayName}`"
                      @change="changeRole(m, $event.target.value)"
                    >
                      <option :value="m.role" disabled>{{ ROLES[m.role].label }}</option>
                      <option v-for="r in assignable.filter((r) => r !== m.role && canChangeRole(myRole, m.role, r))" :key="r" :value="r">
                        {{ ROLES[r].label }}
                      </option>
                    </select>
                    <RoleBadge v-else :role="m.role" />
                  </td>
                  <td class="text-end" style="width: 48px">
                    <button v-if="m.uid !== auth.uid && canRemoveMember(myRole, m.role)" class="btn btn-sm btn-link text-danger" :disabled="busyUid === m.uid" :aria-label="`Remove ${m.displayName}`" @click="remove(m)">
                      <i class="bi bi-person-x"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="invitations.length" class="card mt-4">
          <div class="card-header bg-white"><strong>Pending invitations</strong></div>
          <div class="list-group list-group-flush">
            <div v-for="inv in invitations" :key="inv.id" class="list-group-item d-flex flex-wrap align-items-center gap-2">
              <i class="bi bi-envelope text-secondary"></i>
              <div class="flex-grow-1 min-w-0">
                <span class="fw-semibold">{{ inv.email }}</span> <RoleBadge :role="inv.role" />
                <div class="small text-secondary">Invited by {{ inv.invitedByName }} · expires {{ formatDate(inv.expiresAt) }}</div>
              </div>
              <button class="btn btn-sm btn-outline-secondary" @click="copy(org.inviteLink(inv.id))"><i class="bi bi-link-45deg"></i> Copy link</button>
              <button class="btn btn-sm btn-outline-danger" @click="revoke(inv)">Revoke</button>
            </div>
          </div>
        </div>
      </div>

      <div class="col-lg-4">
        <div class="card mb-4">
          <div class="card-body">
            <h2 class="h6"><i class="bi bi-person-plus me-1 text-primary"></i>Invite by email</h2>
            <form @submit.prevent="invite">
              <input v-model="inviteEmail" type="email" class="form-control mb-2" placeholder="name@example.com" required />
              <select v-model="inviteRole" class="form-select mb-2">
                <option v-for="r in assignable" :key="r" :value="r">{{ ROLES[r].label }}</option>
              </select>
              <button class="btn btn-primary w-100" :disabled="inviting"><span v-if="inviting" class="spinner-border spinner-border-sm me-2"></span>Send invitation</button>
            </form>
            <div v-if="lastInvite" class="alert alert-success small mt-3 mb-0">
              Invite for <strong>{{ lastInvite.email }}</strong> created. You can also share the link directly:
              <div class="input-group input-group-sm mt-2">
                <input class="form-control" :value="lastInvite.link" readonly />
                <button class="btn btn-outline-success" type="button" @click="copy(lastInvite.link)"><i class="bi bi-clipboard"></i></button>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-body">
            <h2 class="h6">What each role can do</h2>
            <div v-for="(meta, r) in ROLES" :key="r" class="d-flex gap-2 mb-2 small">
              <RoleBadge :role="r" class="align-self-start flex-shrink-0 text-nowrap" />
              <span class="text-secondary">{{ meta.description }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
