<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useItemStore } from '@/stores/item'
import { useOrgStore } from '@/stores/org'
import { useChatStore } from '@/stores/chat'
import { useNotificationStore, NOTIFICATION_ICONS } from '@/stores/notification'
import { useUiStore } from '@/stores/ui'
import { ACTIVE_STATUSES } from '@/utils/constants'
import { atLeast } from '@/utils/permissions'
import { timeAgo } from '@/utils/format'
import ItemCard from '@/components/items/ItemCard.vue'
import MatchCard from '@/components/items/MatchCard.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import RoleBadge from '@/components/org/RoleBadge.vue'

const router = useRouter()
const auth = useAuthStore()
const items = useItemStore()
const org = useOrgStore()
const chat = useChatStore()
const notifications = useNotificationStore()
const ui = useUiStore()

const firstName = computed(() => auth.displayName.split(' ')[0])
const activeItems = computed(() => items.myItems.filter((i) => ACTIVE_STATUSES.includes(i.status) || i.status === 'matched'))
const closedItems = computed(() => items.myItems.filter((i) => ['claimed', 'resolved'].includes(i.status)))
const openMatches = computed(() => items.myMatches.filter((m) => ['pending', 'confirmed'].includes(m.status)))

const stats = computed(() => [
  { label: 'Active lost reports', value: items.myActiveLost.length, icon: 'bi-question-circle', tone: 'lost' },
  { label: 'Items you found', value: items.myItems.filter((i) => i.type === 'found').length, icon: 'bi-box2-heart', tone: 'found' },
  { label: 'Potential matches', value: items.myPendingMatches.length, icon: 'bi-link-45deg', tone: 'primary' },
  { label: 'Unread chats', value: chat.unreadCount, icon: 'bi-chat-dots', tone: 'warning' },
])

const perspectiveFor = (m) => (m.lostOwnerId === auth.uid ? 'lost' : 'found')

async function confirmMatch(m) {
  try {
    await items.updateMatch(m.id, { status: 'confirmed' })
    ui.toast('Match confirmed', 'success', { body: 'Both items are now marked as matched. Arrange the handover in chat.' })
  } catch (err) {
    ui.error(err, 'Could not confirm match')
  }
}

async function dismissMatch(m) {
  if (!(await ui.confirm({ title: 'Dismiss this match?', message: "We'll stop suggesting these two items to each other.", confirmText: 'Dismiss', variant: 'secondary' }))) return
  try {
    await items.updateMatch(m.id, { status: 'dismissed' })
  } catch (err) {
    ui.error(err, 'Could not dismiss match')
  }
}

async function chatAboutMatch(m) {
  try {
    const id = await chat.openMatchChat(m)
    router.push(`/chats/${id}`)
  } catch (err) {
    ui.error(err, 'Could not open chat')
  }
}

function openNotification(n) {
  if (!n.read) notifications.markRead(n.id).catch(() => {})
  if (n.link) router.push(n.link)
}
</script>

<template>
  <div class="container py-4">
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
      <div>
        <h1 class="h3 mb-1">Hi {{ firstName }} 👋</h1>
        <p class="text-secondary mb-0">
          Working in <strong>{{ org.currentOrg?.name || 'the public network' }}</strong>
          <RoleBadge v-if="org.currentRole" :role="org.currentRole" class="ms-1" />
        </p>
      </div>
      <div class="d-flex flex-wrap gap-2">
        <RouterLink to="/report/lost" class="btn btn-outline-danger"><i class="bi bi-question-circle me-1"></i>I lost something</RouterLink>
        <RouterLink to="/report/found" class="btn btn-success"><i class="bi bi-box2-heart me-1"></i>I found something</RouterLink>
        <RouterLink to="/assets/new" class="btn btn-outline-primary"><i class="bi bi-qr-code me-1"></i>Tag an asset</RouterLink>
      </div>
    </div>

    <div class="row g-3 mb-4">
      <div v-for="s in stats" :key="s.label" class="col-6 col-lg-3">
        <div class="card stat-card h-100">
          <div class="card-body d-flex align-items-center gap-3">
            <span class="stat-icon" :class="`tone-${s.tone}`">
              <i class="bi" :class="s.icon"></i>
            </span>
            <div>
              <div class="h4 mb-0">{{ s.value }}</div>
              <div class="small text-secondary">{{ s.label }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="row g-4">
      <div class="col-lg-8">
        <!-- Matches -->
        <section v-if="openMatches.length" class="mb-4">
          <h2 class="h5 mb-3"><i class="bi bi-radar text-primary me-2"></i>Potential matches</h2>
          <div class="d-flex flex-column gap-3">
            <MatchCard
              v-for="m in openMatches"
              :key="m.id"
              :match="m"
              :perspective="perspectiveFor(m)"
              @confirm="confirmMatch"
              @dismiss="dismissMatch"
              @chat="chatAboutMatch"
            />
          </div>
        </section>

        <!-- Reports -->
        <section>
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h2 class="h5 mb-0">Your active reports</h2>
            <RouterLink to="/items" class="small">Browse all <i class="bi bi-arrow-right"></i></RouterLink>
          </div>
          <LoadingSpinner v-if="items.mineLoading" />
          <div v-else-if="activeItems.length" class="row g-3">
            <div v-for="item in activeItems" :key="item.id" class="col-sm-6 col-xl-4">
              <ItemCard :item="item" />
            </div>
          </div>
          <div v-else class="card">
            <EmptyState icon="bi-clipboard-check" title="No active reports" text="When you report a lost or found item, it'll show up here with live match alerts." />
          </div>

          <details v-if="closedItems.length" class="mt-4">
            <summary class="text-secondary small cursor-pointer">Closed reports ({{ closedItems.length }})</summary>
            <div class="d-flex flex-column gap-2 mt-2">
              <ItemCard v-for="item in closedItems" :key="item.id" :item="item" compact />
            </div>
          </details>
        </section>
      </div>

      <div class="col-lg-4">
        <!-- Notifications -->
        <div class="card mb-4">
          <div class="card-header bg-white d-flex justify-content-between align-items-center">
            <strong class="small"><i class="bi bi-bell me-1"></i>Recent alerts</strong>
            <RouterLink to="/notifications" class="small">All</RouterLink>
          </div>
          <div v-if="!notifications.latest.length" class="card-body small text-secondary">No alerts yet. We'll ping you when something matches.</div>
          <div class="list-group list-group-flush">
            <button v-for="n in notifications.latest.slice(0, 5)" :key="n.id" class="list-group-item list-group-item-action d-flex gap-2" :class="{ 'bg-primary-subtle': !n.read }" @click="openNotification(n)">
              <i class="bi text-primary mt-1" :class="NOTIFICATION_ICONS[n.type] || NOTIFICATION_ICONS.default"></i>
              <span class="min-w-0">
                <span class="d-block small fw-semibold">{{ n.title }}</span>
                <span class="d-block small text-secondary text-truncate">{{ n.body }}</span>
                <span class="d-block text-secondary" style="font-size: 0.7rem">{{ timeAgo(n.createdAt) }}</span>
              </span>
            </button>
          </div>
        </div>

        <!-- Organizations -->
        <div class="card">
          <div class="card-header bg-white d-flex justify-content-between align-items-center">
            <strong class="small"><i class="bi bi-diagram-3 me-1"></i>Your organizations</strong>
            <RouterLink to="/orgs/new" class="small">New</RouterLink>
          </div>
          <div v-if="!org.myOrgs.length" class="card-body small text-secondary">
            You're not in any organization yet. <RouterLink to="/orgs/new">Create one</RouterLink> or ask an admin to invite you.
          </div>
          <div class="list-group list-group-flush">
            <div v-for="o in org.myOrgs" :key="o.id" class="list-group-item d-flex align-items-center gap-2">
              <RouterLink :to="`/orgs/${o.id}`" class="flex-grow-1 text-truncate text-decoration-none">{{ o.name }}</RouterLink>
              <RouterLink v-if="atLeast(o.role, 'staff')" :to="`/orgs/${o.id}/command`" class="btn btn-sm btn-outline-primary py-0" title="Command center"><i class="bi bi-broadcast"></i></RouterLink>
              <RoleBadge :role="o.role" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
