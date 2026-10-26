<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useOrgStore } from '@/stores/org'
import { useChatStore } from '@/stores/chat'
import { useNotificationStore, NOTIFICATION_ICONS } from '@/stores/notification'
import { atLeast } from '@/utils/permissions'
import { timeAgo } from '@/utils/format'
import UserAvatar from '@/components/common/UserAvatar.vue'
import RoleBadge from '@/components/org/RoleBadge.vue'

const router = useRouter()
const auth = useAuthStore()
const org = useOrgStore()
const chat = useChatStore()
const notifications = useNotificationStore()

const scopeLabel = computed(() => org.currentOrg?.name || 'Public network')
const canCommand = computed(() => org.currentOrg && atLeast(org.currentRole, 'staff'))

function switchScope(orgId) {
  org.setCurrentOrg(orgId)
}

async function openNotification(n) {
  if (!n.read) notifications.markRead(n.id).catch(() => {})
  if (n.link) router.push(n.link)
}

async function logout() {
  await auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <nav class="navbar navbar-expand-lg bg-white border-bottom sticky-top d-print-none">
    <div class="container">
      <RouterLink class="navbar-brand d-flex align-items-center gap-2 fw-bold" :to="auth.isAuthenticated ? '/dashboard' : '/'">
        <span class="brand-mark"><i class="bi bi-search-heart"></i></span>
        FoundIt
      </RouterLink>

      <template v-if="auth.isAuthenticated">
        <!-- Always-visible icons on mobile -->
        <div class="d-flex align-items-center gap-1 ms-auto me-2 d-lg-none">
          <RouterLink to="/notifications" class="btn btn-link text-body position-relative px-2" aria-label="Notifications">
            <i class="bi bi-bell fs-5"></i>
            <span v-if="notifications.unreadCount" class="position-absolute top-0 start-100 badge rounded-pill bg-danger nav-badge">
              {{ notifications.unreadCount }}
            </span>
          </RouterLink>
          <RouterLink to="/chats" class="btn btn-link text-body position-relative px-2" aria-label="Messages">
            <i class="bi bi-chat-dots fs-5"></i>
            <span v-if="chat.unreadCount" class="position-absolute top-0 start-100 badge rounded-pill bg-danger nav-badge">
              {{ chat.unreadCount }}
            </span>
          </RouterLink>
        </div>

        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav" aria-controls="mainNav" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>

        <div id="mainNav" class="collapse navbar-collapse">
          <ul class="navbar-nav me-auto mb-2 mb-lg-0">
            <li class="nav-item"><RouterLink class="nav-link" active-class="active fw-semibold" to="/dashboard">Dashboard</RouterLink></li>
            <li class="nav-item"><RouterLink class="nav-link" active-class="active fw-semibold" to="/items">Browse</RouterLink></li>
            <li class="nav-item dropdown">
              <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">Report</a>
              <ul class="dropdown-menu shadow-sm">
                <li><RouterLink class="dropdown-item" to="/report/lost"><i class="bi bi-question-circle text-lost me-2"></i>I lost something</RouterLink></li>
                <li><RouterLink class="dropdown-item" to="/report/found"><i class="bi bi-box2-heart text-found me-2"></i>I found something</RouterLink></li>
              </ul>
            </li>
            <li class="nav-item"><RouterLink class="nav-link" active-class="active fw-semibold" to="/assets">Asset tags</RouterLink></li>
            <li v-if="canCommand" class="nav-item">
              <RouterLink class="nav-link" active-class="active fw-semibold" :to="`/orgs/${org.currentOrgId}/command`">
                <i class="bi bi-broadcast me-1"></i>Command center
              </RouterLink>
            </li>
          </ul>

          <div class="d-flex flex-column flex-lg-row align-items-lg-center gap-2">
            <!-- Scope switcher -->
            <div class="dropdown">
              <button class="btn btn-sm btn-light border dropdown-toggle text-truncate" style="max-width: 220px" data-bs-toggle="dropdown" aria-expanded="false">
                <i class="bi" :class="org.currentOrg ? 'bi-building' : 'bi-globe2'"></i>
                <span class="ms-1">{{ scopeLabel }}</span>
              </button>
              <ul class="dropdown-menu dropdown-menu-end shadow-sm">
                <li><h6 class="dropdown-header">Workspace</h6></li>
                <li>
                  <button class="dropdown-item d-flex justify-content-between" :class="{ active: !org.currentOrgId }" @click="switchScope(null)">
                    <span><i class="bi bi-globe2 me-2"></i>Public network</span>
                  </button>
                </li>
                <li v-for="o in org.myOrgs" :key="o.id">
                  <button class="dropdown-item d-flex justify-content-between align-items-center gap-3" :class="{ active: org.currentOrgId === o.id }" @click="switchScope(o.id)">
                    <span class="text-truncate"><i class="bi bi-building me-2"></i>{{ o.name }}</span>
                    <RoleBadge :role="o.role" />
                  </button>
                </li>
                <li><hr class="dropdown-divider" /></li>
                <li><RouterLink class="dropdown-item" to="/orgs"><i class="bi bi-diagram-3 me-2"></i>Manage organizations</RouterLink></li>
                <li><RouterLink class="dropdown-item" to="/orgs/new"><i class="bi bi-plus-lg me-2"></i>Create organization</RouterLink></li>
              </ul>
            </div>

            <!-- Notifications (desktop) -->
            <div class="dropdown d-none d-lg-block">
              <button class="btn btn-link text-body position-relative px-2" data-bs-toggle="dropdown" aria-expanded="false" aria-label="Notifications">
                <i class="bi bi-bell fs-5"></i>
                <span v-if="notifications.unreadCount" class="position-absolute top-0 start-100 badge rounded-pill bg-danger nav-badge">
                  {{ notifications.unreadCount > 99 ? '99+' : notifications.unreadCount }}
                </span>
              </button>
              <div class="dropdown-menu dropdown-menu-end shadow p-0" style="width: 340px">
                <div class="d-flex justify-content-between align-items-center px-3 py-2 border-bottom">
                  <strong class="small">Notifications</strong>
                  <button v-if="notifications.unreadCount" class="btn btn-link btn-sm p-0" @click.stop="notifications.markAllRead()">Mark all read</button>
                </div>
                <div v-if="!notifications.latest.length" class="text-center text-secondary small py-4">You're all caught up.</div>
                <button
                  v-for="n in notifications.latest"
                  :key="n.id"
                  class="dropdown-item d-flex gap-2 py-2 text-wrap"
                  :class="{ 'bg-primary-subtle': !n.read }"
                  @click="openNotification(n)"
                >
                  <i class="bi text-primary mt-1" :class="NOTIFICATION_ICONS[n.type] || NOTIFICATION_ICONS.default"></i>
                  <span class="min-w-0">
                    <span class="d-block small fw-semibold">{{ n.title }}</span>
                    <span class="d-block small text-secondary">{{ n.body }}</span>
                    <span class="d-block text-secondary" style="font-size: 0.7rem">{{ timeAgo(n.createdAt) }}</span>
                  </span>
                </button>
                <RouterLink to="/notifications" class="dropdown-item text-center small border-top py-2">View all</RouterLink>
              </div>
            </div>

            <RouterLink to="/chats" class="btn btn-link text-body position-relative px-2 d-none d-lg-inline-block" aria-label="Messages">
              <i class="bi bi-chat-dots fs-5"></i>
              <span v-if="chat.unreadCount" class="position-absolute top-0 start-100 badge rounded-pill bg-danger nav-badge">{{ chat.unreadCount }}</span>
            </RouterLink>

            <!-- Account -->
            <div class="dropdown">
              <button class="btn btn-link text-body text-decoration-none d-flex align-items-center gap-2 px-1" data-bs-toggle="dropdown" aria-expanded="false">
                <UserAvatar :name="auth.displayName" :photo="auth.photoURL" />
                <span class="d-lg-none">{{ auth.displayName }}</span>
              </button>
              <ul class="dropdown-menu dropdown-menu-end shadow-sm">
                <li class="px-3 py-2 small">
                  <div class="fw-semibold">{{ auth.displayName }}</div>
                  <div class="text-secondary">{{ auth.email }}</div>
                </li>
                <li><hr class="dropdown-divider" /></li>
                <li><RouterLink class="dropdown-item" to="/profile"><i class="bi bi-sliders me-2"></i>Profile & alerts</RouterLink></li>
                <li><RouterLink class="dropdown-item" to="/orgs"><i class="bi bi-diagram-3 me-2"></i>Organizations</RouterLink></li>
                <li><hr class="dropdown-divider" /></li>
                <li><button class="dropdown-item text-danger" @click="logout"><i class="bi bi-box-arrow-right me-2"></i>Sign out</button></li>
              </ul>
            </div>
          </div>
        </div>
      </template>

      <div v-else class="d-flex gap-2 ms-auto">
        <RouterLink to="/login" class="btn btn-sm btn-outline-primary">Sign in</RouterLink>
        <RouterLink to="/register" class="btn btn-sm btn-primary">Get started</RouterLink>
      </div>
    </div>
  </nav>
</template>
