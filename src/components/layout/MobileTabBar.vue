<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'
import { useNotificationStore } from '@/stores/notification'
import { gsap, prefersReducedMotion } from '@/utils/motion'
import BottomSheet from '@/components/common/BottomSheet.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const chat = useChatStore()
const notifications = useNotificationStore()

// Full-screen flows (conversations, forms) get the whole viewport; they have their own back/submit.
const HIDDEN_ON = new Set(['chat', 'report-lost', 'report-found', 'asset-new', 'asset-edit', 'org-new'])
const show = computed(() => auth.isAuthenticated && !HIDDEN_ON.has(route.name))

const tabs = computed(() => [
  { to: '/dashboard', icon: 'bi-house', label: 'Home', match: ['dashboard'] },
  { to: '/items', icon: 'bi-grid', label: 'Browse', match: ['items', 'item'] },
  { report: true },
  { to: '/chats', icon: 'bi-chat', label: 'Messages', match: ['chats'], badge: chat.unreadCount },
  { to: '/notifications', icon: 'bi-bell', label: 'Alerts', match: ['notifications'], badge: notifications.unreadCount },
])
const isActive = (t) => t.match?.includes(route.name)

const reportOpen = ref(false)
const actions = [
  { to: '/report/found', icon: 'bi-box2-heart', tone: 'found', title: 'I found something', text: 'Check nearby lost reports, then log it' },
  { to: '/report/lost', icon: 'bi-question-circle', tone: 'lost', title: 'I lost something', text: 'Get alerted when it turns up nearby' },
  { to: '/assets/new', icon: 'bi-qr-code', tone: 'primary', title: 'Tag an asset', text: 'Print a QR sticker for your belongings' },
]

// Reserve space under the page for the bar.
watch(show, (v) => document.body.classList.toggle('has-tabbar', v), { immediate: true })
onBeforeUnmount(() => document.body.classList.remove('has-tabbar'))

let fab = null // set via function ref: refs inside v-for would be arrays
function openReport() {
  reportOpen.value = true
  if (!prefersReducedMotion()) gsap.fromTo(fab, { rotate: 0 }, { rotate: 135, duration: 0.35, ease: 'back.out(2)' })
}
function closeReport() {
  reportOpen.value = false
  if (!prefersReducedMotion()) gsap.to(fab, { rotate: 0, duration: 0.3, ease: 'power2.out' })
}

const bar = ref(null)
onMounted(() => {
  if (bar.value && !prefersReducedMotion()) gsap.from(bar.value, { yPercent: 100, duration: 0.5, ease: 'expo.out', delay: 0.2 })
})

// Warm the lazy tab chunks while idle so the first tap doesn't wait on the network.
const TAB_ROUTES = ['dashboard', 'items', 'chats', 'notifications', 'report-lost', 'report-found']
const prefetchTabs = () => router.getRoutes().filter((r) => TAB_ROUTES.includes(r.name)).forEach((r) => typeof r.components?.default === 'function' && r.components.default())
watch(show, (v) => v && (window.requestIdleCallback || setTimeout)(prefetchTabs), { immediate: true })
</script>

<template>
  <nav v-if="show" ref="bar" class="tabbar d-md-none d-print-none" aria-label="Primary">
    <template v-for="(t, i) in tabs" :key="i">
      <button v-if="t.report" type="button" class="tab tab-fab" aria-label="Report an item" @click="openReport">
        <span :ref="(el) => (fab = el)" class="fab"><i class="bi bi-plus-lg"></i></span>
      </button>
      <RouterLink v-else :to="t.to" class="tab" :class="{ active: isActive(t) }">
        <span class="tab-icon">
          <i class="bi" :class="isActive(t) ? `${t.icon}-fill` : t.icon"></i>
          <span v-if="t.badge" class="tab-badge">{{ t.badge > 99 ? '99+' : t.badge }}</span>
        </span>
        <span class="tab-label">{{ t.label }}</span>
      </RouterLink>
    </template>
  </nav>

  <BottomSheet :open="reportOpen" title="What happened?" @close="closeReport">
    <RouterLink v-for="a in actions" :key="a.to" :to="a.to" class="sheet-action">
      <span class="stat-icon" :class="`tone-${a.tone}`"><i class="bi" :class="a.icon"></i></span>
      <span class="min-w-0 flex-grow-1">
        <span class="d-block fw-semibold text-body">{{ a.title }}</span>
        <span class="d-block small text-secondary">{{ a.text }}</span>
      </span>
      <i class="bi bi-chevron-right text-secondary"></i>
    </RouterLink>
  </BottomSheet>
</template>

<style scoped>
/* Floating bar: lifted 5% of the viewport off the bottom edge */
.tabbar {
  position: fixed; left: 0.75rem; right: 0.75rem; bottom: calc(5% + env(safe-area-inset-bottom)); z-index: 1030;
  display: grid; grid-template-columns: repeat(5, 1fr); align-items: end;
  padding: 0.35rem 0.5rem;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: saturate(180%) blur(18px); -webkit-backdrop-filter: saturate(180%) blur(18px);
  border: 1px solid rgba(255, 255, 255, 0.8); border-radius: 999px;
  box-shadow: 0 12px 32px -8px rgba(16, 34, 44, 0.22);
}
.tab {
  display: flex; flex-direction: column; align-items: center; gap: 0.15rem;
  padding: 0.3rem 0; min-height: 48px; border: 0; background: none;
  color: var(--fi-subtle); text-decoration: none !important; -webkit-tap-highlight-color: transparent;
}
.tab.active { color: var(--fi-primary); }
.tab:active .tab-icon { transform: scale(0.9); }
.tab-icon { position: relative; font-size: 1.3rem; line-height: 1; transition: transform 0.15s var(--fi-ease); }
.tab-label { font-size: 0.66rem; font-weight: 600; letter-spacing: 0.01em; }
.tab-badge {
  position: absolute; top: -0.35rem; right: -0.7rem; min-width: 1.05rem; height: 1.05rem; padding: 0 0.25rem;
  border-radius: 999px; background: var(--fi-lost); color: #fff; font-size: 0.6rem; font-weight: 700;
  display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 0 0 2px #fff;
}
.tab-fab { justify-content: center; }
.fab {
  width: 3.25rem; height: 3.25rem; margin-top: -1.4rem; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center; font-size: 1.4rem; color: #fff;
  background: var(--fi-gradient);
  box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.9), 0 10px 24px -6px rgba(var(--fi-primary-rgb), 0.6);
}
.sheet-action {
  display: flex; align-items: center; gap: 0.9rem; padding: 0.85rem 0.6rem; border-radius: var(--fi-radius);
  text-decoration: none !important; -webkit-tap-highlight-color: transparent;
}
.sheet-action:active { background: var(--fi-sunken); }
.sheet-action .stat-icon { width: 2.75rem; height: 2.75rem; border-radius: 0.8rem; display: inline-flex; align-items: center; justify-content: center; font-size: 1.2rem; flex-shrink: 0; }
</style>
