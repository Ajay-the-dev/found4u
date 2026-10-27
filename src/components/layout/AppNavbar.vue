<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useOrgStore } from '@/stores/org'
import { useChatStore } from '@/stores/chat'
import { useNotificationStore, NOTIFICATION_ICONS } from '@/stores/notification'
import { atLeast } from '@/utils/permissions'
import { timeAgo } from '@/utils/format'
import UserAvatar from '@/components/common/UserAvatar.vue'
import RoleBadge from '@/components/org/RoleBadge.vue'
import BottomSheet from '@/components/common/BottomSheet.vue'
import BrandLogo from '@/components/common/BrandLogo.vue'

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

const scrolled = ref(false)
const onScroll = () => (scrolled.value = window.scrollY > 4)
onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))

const badge = (n) => (n > 99 ? '99+' : n)

// Phone-only bottom sheets (tablet/desktop keep the dropdowns).
const scopeSheet = ref(false)
const accountSheet = ref(false)
function pickScope(orgId) {
  switchScope(orgId)
  scopeSheet.value = false
}

async function logout() {
  await auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <nav class="navbar navbar-expand-lg app-navbar surface-glass sticky-top d-print-none" :class="{ 'is-scrolled': scrolled }">
    <div class="container">
      <RouterLink class="navbar-brand d-flex align-items-center gap-2 fw-bold me-lg-4" :to="auth.isAuthenticated ? '/dashboard' : '/'">
        <span class="brand-mark"><BrandLogo /></span>
        Found4
      </RouterLink>

      <template v-if="auth.isAuthenticated">
        <!-- Phone: workspace chip + avatar; primary nav lives in the bottom tab bar -->
        <div class="d-flex d-md-none align-items-center gap-2 ms-auto min-w-0">
          <button type="button" class="scope-btn scope-btn-sm" @click="scopeSheet = true">
            <span class="scope-icon" :class="org.currentOrg ? 'tone-violet' : 'tone-primary'"><i class="bi" :class="org.currentOrg ? 'bi-building' : 'bi-globe2'"></i></span>
            <span class="text-truncate">{{ scopeLabel }}</span>
            <i class="bi bi-chevron-down text-secondary small"></i>
          </button>
          <button type="button" class="btn btn-link p-0 flex-shrink-0" aria-label="Account" @click="accountSheet = true">
            <UserAvatar :name="auth.displayName" :photo="auth.photoURL" />
          </button>
        </div>

        <!-- Tablet: icons next to the hamburger -->
        <div class="d-none d-md-flex d-lg-none align-items-center gap-1 ms-auto me-1">
          <RouterLink to="/notifications" class="icon-btn" aria-label="Notifications">
            <i class="bi bi-bell"></i>
            <span v-if="notifications.unreadCount" class="dot">{{ badge(notifications.unreadCount) }}</span>
          </RouterLink>
          <RouterLink to="/chats" class="icon-btn" aria-label="Messages">
            <i class="bi bi-chat"></i>
            <span v-if="chat.unreadCount" class="dot">{{ badge(chat.unreadCount) }}</span>
          </RouterLink>
        </div>

        <button class="navbar-toggler hide-mobile" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav" aria-controls="mainNav" aria-expanded="false" aria-label="Toggle navigation">
          <i class="bi bi-list fs-4 text-body"></i>
        </button>

        <div id="mainNav" class="collapse navbar-collapse">
          <ul class="navbar-nav me-auto gap-lg-1 my-2 my-lg-0">
            <li class="nav-item"><RouterLink class="nav-link" active-class="active" to="/dashboard">Dashboard</RouterLink></li>
            <li class="nav-item"><RouterLink class="nav-link" active-class="active" to="/items">Browse</RouterLink></li>
            <li class="nav-item dropdown">
              <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">Report</a>
              <ul class="dropdown-menu" style="min-width: 260px">
                <li>
                  <RouterLink class="dropdown-item d-flex align-items-center gap-3" to="/report/lost">
                    <span class="stat-icon tone-lost rounded-3 d-inline-flex align-items-center justify-content-center" style="width: 2rem; height: 2rem"><i class="bi bi-question-circle"></i></span>
                    <span><span class="d-block fw-medium text-body">I lost something</span><span class="d-block small text-secondary">Get alerted when it turns up</span></span>
                  </RouterLink>
                </li>
                <li>
                  <RouterLink class="dropdown-item d-flex align-items-center gap-3" to="/report/found">
                    <span class="stat-icon tone-found rounded-3 d-inline-flex align-items-center justify-content-center" style="width: 2rem; height: 2rem"><i class="bi bi-box2-heart"></i></span>
                    <span><span class="d-block fw-medium text-body">I found something</span><span class="d-block small text-secondary">Help it get back home</span></span>
                  </RouterLink>
                </li>
              </ul>
            </li>
            <li class="nav-item"><RouterLink class="nav-link" active-class="active" to="/assets">Asset tags</RouterLink></li>
            <li v-if="canCommand" class="nav-item">
              <RouterLink class="nav-link" active-class="active" :to="`/orgs/${org.currentOrgId}/command`">
                <i class="bi bi-broadcast me-1"></i>Command center
              </RouterLink>
            </li>
          </ul>

          <div class="d-flex flex-column flex-lg-row align-items-lg-center gap-2 pb-2 pb-lg-0">
            <!-- Scope switcher -->
            <div class="dropdown">
              <button class="scope-btn" data-bs-toggle="dropdown" aria-expanded="false">
                <span class="scope-icon" :class="org.currentOrg ? 'tone-violet' : 'tone-primary'">
                  <i class="bi" :class="org.currentOrg ? 'bi-building' : 'bi-globe2'"></i>
                </span>
                <span class="text-truncate">{{ scopeLabel }}</span>
                <i class="bi bi-chevron-expand text-secondary ms-auto"></i>
              </button>
              <ul class="dropdown-menu dropdown-menu-end" style="min-width: 260px">
                <li><h6 class="dropdown-header">Workspace</h6></li>
                <li>
                  <button class="dropdown-item d-flex justify-content-between align-items-center" :class="{ active: !org.currentOrgId }" @click="switchScope(null)">
                    <span><i class="bi bi-globe2 me-2"></i>Public network</span>
                    <i v-if="!org.currentOrgId" class="bi bi-check2"></i>
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

            <div class="vr d-none d-lg-block mx-1 my-2 opacity-25"></div>

            <!-- Notifications (desktop) -->
            <div class="dropdown d-none d-lg-block">
              <button class="icon-btn" data-bs-toggle="dropdown" aria-expanded="false" aria-label="Notifications">
                <i class="bi bi-bell"></i>
                <span v-if="notifications.unreadCount" class="dot">{{ badge(notifications.unreadCount) }}</span>
              </button>
              <div class="dropdown-menu dropdown-menu-end p-0 overflow-hidden" style="width: 360px">
                <div class="d-flex justify-content-between align-items-center px-3 py-2 border-bottom">
                  <strong class="small text-body">Notifications</strong>
                  <button v-if="notifications.unreadCount" class="btn btn-link btn-sm p-0" @click.stop="notifications.markAllRead()">Mark all read</button>
                </div>
                <div v-if="!notifications.latest.length" class="text-center text-secondary small py-5">
                  <i class="bi bi-bell-slash d-block fs-4 mb-1 opacity-50"></i>You're all caught up.
                </div>
                <div class="p-1" style="max-height: 380px; overflow-y: auto">
                  <button
                    v-for="n in notifications.latest"
                    :key="n.id"
                    class="dropdown-item d-flex gap-3 py-2 text-wrap"
                    :class="{ 'bg-primary-subtle': !n.read }"
                    @click="openNotification(n)"
                  >
                    <span class="stat-icon tone-primary rounded-3 d-inline-flex align-items-center justify-content-center flex-shrink-0" style="width: 2rem; height: 2rem">
                      <i class="bi" :class="NOTIFICATION_ICONS[n.type] || NOTIFICATION_ICONS.default"></i>
                    </span>
                    <span class="min-w-0 flex-grow-1">
                      <span class="d-block small fw-semibold text-body">{{ n.title }}</span>
                      <span class="d-block small text-secondary">{{ n.body }}</span>
                      <span class="d-block text-secondary mt-1" style="font-size: 0.7rem">{{ timeAgo(n.createdAt) }}</span>
                    </span>
                    <span v-if="!n.read" class="rounded-circle bg-primary flex-shrink-0 mt-2" style="width: 7px; height: 7px"></span>
                  </button>
                </div>
                <RouterLink to="/notifications" class="d-block text-center small fw-medium border-top py-2 text-decoration-none">View all notifications</RouterLink>
              </div>
            </div>

            <RouterLink to="/chats" class="icon-btn d-none d-lg-inline-flex" aria-label="Messages">
              <i class="bi bi-chat"></i>
              <span v-if="chat.unreadCount" class="dot">{{ badge(chat.unreadCount) }}</span>
            </RouterLink>

            <!-- Account -->
            <div class="dropdown">
              <button class="btn btn-link text-body text-decoration-none d-flex align-items-center gap-2 px-1 ms-lg-1" data-bs-toggle="dropdown" aria-expanded="false">
                <UserAvatar :name="auth.displayName" :photo="auth.photoURL" />
                <span class="d-lg-none">{{ auth.displayName }}</span>
              </button>
              <ul class="dropdown-menu dropdown-menu-end" style="min-width: 240px">
                <li class="px-2 py-2 d-flex align-items-center gap-2">
                  <UserAvatar :name="auth.displayName" :photo="auth.photoURL" size="2.25rem" />
                  <div class="min-w-0 small">
                    <div class="fw-semibold text-body text-truncate">{{ auth.displayName }}</div>
                    <div class="text-secondary text-truncate">{{ auth.email }}</div>
                  </div>
                </li>
                <li><hr class="dropdown-divider" /></li>
                <li><RouterLink class="dropdown-item" to="/profile"><i class="bi bi-sliders me-2"></i>Profile & alerts</RouterLink></li>
                <li><RouterLink class="dropdown-item" to="/help"><i class="bi bi-question-circle me-2"></i>Help</RouterLink></li>
                <li><RouterLink class="dropdown-item" to="/orgs"><i class="bi bi-diagram-3 me-2"></i>Organizations</RouterLink></li>
                <li><hr class="dropdown-divider" /></li>
                <li><button class="dropdown-item text-danger" @click="logout"><i class="bi bi-box-arrow-right me-2"></i>Sign out</button></li>
              </ul>
            </div>
          </div>
        </div>
      </template>

      <div v-else class="d-flex align-items-center gap-2 ms-auto">
        <RouterLink to="/login" class="btn btn-sm btn-link text-body">Sign in</RouterLink>
        <RouterLink to="/register" class="btn btn-sm btn-dark px-3">Get started <i class="bi bi-arrow-right ms-1"></i></RouterLink>
      </div>
    </div>
  </nav>

  <template v-if="auth.isAuthenticated">
    <BottomSheet :open="scopeSheet" title="Workspace" @close="scopeSheet = false">
      <button class="sheet-row" :class="{ active: !org.currentOrgId }" @click="pickScope(null)">
        <span class="scope-icon tone-primary"><i class="bi bi-globe2"></i></span>
        <span class="flex-grow-1 text-start">Public network</span>
        <i v-if="!org.currentOrgId" class="bi bi-check2 text-primary fs-5"></i>
      </button>
      <button v-for="o in org.myOrgs" :key="o.id" class="sheet-row" :class="{ active: org.currentOrgId === o.id }" @click="pickScope(o.id)">
        <span class="scope-icon tone-violet"><i class="bi bi-building"></i></span>
        <span class="flex-grow-1 text-start text-truncate">{{ o.name }}</span>
        <RoleBadge :role="o.role" />
        <i v-if="org.currentOrgId === o.id" class="bi bi-check2 text-primary fs-5"></i>
      </button>
      <hr class="my-2" />
      <RouterLink class="sheet-row" to="/orgs"><span class="scope-icon tone-secondary"><i class="bi bi-diagram-3"></i></span><span class="flex-grow-1">Manage organizations</span></RouterLink>
      <RouterLink class="sheet-row" to="/orgs/new"><span class="scope-icon tone-secondary"><i class="bi bi-plus-lg"></i></span><span class="flex-grow-1">Create organization</span></RouterLink>
    </BottomSheet>

    <BottomSheet :open="accountSheet" @close="accountSheet = false">
      <div class="d-flex align-items-center gap-3 px-2 pb-3">
        <UserAvatar :name="auth.displayName" :photo="auth.photoURL" size="3rem" />
        <div class="min-w-0">
          <div class="fw-semibold text-body text-truncate">{{ auth.displayName }}</div>
          <div class="small text-secondary text-truncate">{{ auth.email }}</div>
        </div>
      </div>
      <RouterLink class="sheet-row" to="/assets"><span class="scope-icon tone-warning"><i class="bi bi-qr-code"></i></span><span class="flex-grow-1">Asset tags</span><i class="bi bi-chevron-right text-secondary"></i></RouterLink>
      <RouterLink v-if="canCommand" class="sheet-row" :to="`/orgs/${org.currentOrgId}/command`"><span class="scope-icon tone-info"><i class="bi bi-broadcast"></i></span><span class="flex-grow-1">Command center</span><i class="bi bi-chevron-right text-secondary"></i></RouterLink>
      <RouterLink class="sheet-row" to="/orgs"><span class="scope-icon tone-violet"><i class="bi bi-diagram-3"></i></span><span class="flex-grow-1">Organizations</span><i class="bi bi-chevron-right text-secondary"></i></RouterLink>
      <RouterLink class="sheet-row" to="/profile"><span class="scope-icon tone-secondary"><i class="bi bi-sliders"></i></span><span class="flex-grow-1">Profile & alerts</span><i class="bi bi-chevron-right text-secondary"></i></RouterLink>
      <RouterLink class="sheet-row" to="/help"><span class="scope-icon tone-primary"><i class="bi bi-question-circle"></i></span><span class="flex-grow-1">Help</span><i class="bi bi-chevron-right text-secondary"></i></RouterLink>
      <hr class="my-2" />
      <button class="sheet-row text-danger" @click="logout"><span class="scope-icon tone-lost"><i class="bi bi-box-arrow-right"></i></span><span class="flex-grow-1 text-start">Sign out</span></button>
    </BottomSheet>
  </template>
</template>
