import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useOrgStore } from '@/stores/org'
import { useUiStore } from '@/stores/ui'
import HomeView from '@/views/HomeView.vue'

/*
 * Route meta:
 *   requiresAuth – signed-in, non-anonymous user
 *   guestOnly    – bounce signed-in users to the dashboard
 *   orgRole      – minimum role in `:orgId` (member | staff | admin | owner)
 *   public       – reachable by anyone, including anonymous finders (QR scans)
 *   layout       – 'default' | 'auth' | 'bare'
 *   requiresNetwork – show the offline screen instead of the page when there's no connection
 */
const routes = [
  { path: '/', name: 'home', component: HomeView, meta: { guestOnly: true, heroNav: true, title: 'Lost & Found, organized' } },

  // ── auth ──
  { path: '/login', name: 'login', component: () => import('@/views/auth/LoginView.vue'), meta: { requiresNetwork: true, guestOnly: true, layout: 'auth', title: 'Sign in' } },
  { path: '/register', name: 'register', component: () => import('@/views/auth/RegisterView.vue'), meta: { requiresNetwork: true, guestOnly: true, layout: 'auth', title: 'Create account' } },
  { path: '/forgot-password', name: 'forgot-password', component: () => import('@/views/auth/ForgotPasswordView.vue'), meta: { requiresNetwork: true, layout: 'auth', title: 'Reset password' } },

  // ── core ──
  { path: '/dashboard', name: 'dashboard', component: () => import('@/views/DashboardView.vue'), meta: { requiresAuth: true, title: 'Dashboard' } },
  { path: '/items', name: 'items', component: () => import('@/views/items/ItemsView.vue'), meta: { requiresAuth: true, title: 'Browse items' } },
  { path: '/items/:id', name: 'item', component: () => import('@/views/items/ItemDetailView.vue'), meta: { requiresAuth: true, title: 'Item' } },
  { path: '/report/lost', name: 'report-lost', component: () => import('@/views/items/ReportLostView.vue'), meta: { requiresNetwork: true, requiresAuth: true, title: 'Report a lost item' } },
  { path: '/report/found', name: 'report-found', component: () => import('@/views/items/ReportFoundView.vue'), meta: { requiresNetwork: true, requiresAuth: true, title: 'Log a found item' } },

  // ── asset tags ──
  { path: '/assets', name: 'assets', component: () => import('@/views/assets/AssetsView.vue'), meta: { requiresAuth: true, title: 'Asset tags' } },
  { path: '/assets/new', name: 'asset-new', component: () => import('@/views/assets/AssetFormView.vue'), meta: { requiresNetwork: true, requiresAuth: true, title: 'Register asset' } },
  { path: '/assets/print', name: 'asset-print', component: () => import('@/views/assets/PrintStickersView.vue'), meta: { requiresAuth: true, layout: 'bare', title: 'Print QR stickers' } },
  { path: '/assets/:id', name: 'asset', component: () => import('@/views/assets/AssetDetailView.vue'), meta: { requiresAuth: true, title: 'Asset' } },
  { path: '/assets/:id/edit', name: 'asset-edit', component: () => import('@/views/assets/AssetFormView.vue'), meta: { requiresNetwork: true, requiresAuth: true, title: 'Edit asset' } },
  { path: '/scan/:assetId', name: 'scan', component: () => import('@/views/ScanView.vue'), meta: { requiresNetwork: true, public: true, layout: 'bare', title: 'Found something?' } },

  // ── messaging & alerts ──
  { path: '/chats', name: 'chats', component: () => import('@/views/chat/ChatListView.vue'), meta: { requiresAuth: true, title: 'Messages' } },
  { path: '/chats/:id', name: 'chat', component: () => import('@/views/chat/ChatView.vue'), meta: { requiresAuth: true, title: 'Conversation' } },
  { path: '/notifications', name: 'notifications', component: () => import('@/views/NotificationsView.vue'), meta: { requiresAuth: true, title: 'Notifications' } },
  { path: '/profile', name: 'profile', component: () => import('@/views/ProfileView.vue'), meta: { requiresAuth: true, title: 'Profile & alerts' } },
  { path: '/help', name: 'help', component: () => import('@/views/HelpView.vue'), meta: { title: 'Help' } },

  // ── organizations ──
  { path: '/orgs', name: 'orgs', component: () => import('@/views/org/OrgListView.vue'), meta: { requiresAuth: true, title: 'Organizations' } },
  { path: '/orgs/new', name: 'org-new', component: () => import('@/views/org/OrgCreateView.vue'), meta: { requiresNetwork: true, requiresAuth: true, title: 'New organization' } },
  { path: '/orgs/:orgId', name: 'org', component: () => import('@/views/org/OrgOverviewView.vue'), meta: { requiresAuth: true, orgRole: 'member', title: 'Organization' } },
  { path: '/orgs/:orgId/members', name: 'org-members', component: () => import('@/views/org/OrgMembersView.vue'), meta: { requiresAuth: true, orgRole: 'admin', title: 'Members' } },
  { path: '/orgs/:orgId/settings', name: 'org-settings', component: () => import('@/views/org/OrgSettingsView.vue'), meta: { requiresAuth: true, orgRole: 'admin', title: 'Organization settings' } },
  { path: '/orgs/:orgId/command', name: 'org-command', component: () => import('@/views/org/CommandCenterView.vue'), meta: { requiresAuth: true, orgRole: 'staff', title: 'Command center' } },
  { path: '/invite/:token', name: 'invite', component: () => import('@/views/org/AcceptInviteView.vue'), meta: { requiresNetwork: true, title: 'Join organization' } },

  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFoundView.vue'), meta: { title: 'Not found' } },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: (to, from, saved) => saved || { top: 0 },
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.waitUntilReady()

  if (to.meta.public) return true

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.guestOnly && auth.isAuthenticated) {
    return typeof to.query.redirect === 'string' ? to.query.redirect : { name: 'dashboard' }
  }

  if (to.meta.orgRole) {
    const org = useOrgStore()
    await org.waitUntilLoaded()
    const orgId = to.params.orgId
    if (!org.hasRole(orgId, to.meta.orgRole)) {
      const isMember = !!org.roleIn(orgId)
      useUiStore().toast(
        isMember ? 'You need a higher role for that page' : "You're not a member of that organization",
        'warning',
      )
      return isMember ? { name: 'org', params: { orgId } } : { name: 'orgs' }
    }
    if (org.currentOrgId !== orgId) org.setCurrentOrg(orgId)
  }
  return true
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · Found4` : 'Found4'
  try {
    sessionStorage.removeItem(`chunk-reload:${to.fullPath}`)
  } catch {}
})

// A stale tab can request a lazy chunk that no longer exists after a deploy.
// Reload once per path; if the chunk is still missing, surface the error instead of looping.
router.onError((err, to) => {
  if (!/Failed to fetch dynamically imported module|Importing a module script failed/.test(err?.message)) return
  const key = `chunk-reload:${to.fullPath}`
  try {
    if (sessionStorage.getItem(key)) {
      sessionStorage.removeItem(key)
      console.error(err)
      return
    }
    sessionStorage.setItem(key, '1')
  } catch {
    return
  }
  window.location.assign(to.fullPath)
})

export default router
