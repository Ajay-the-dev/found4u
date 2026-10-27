<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppNavbar from '@/components/layout/AppNavbar.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import MobileTabBar from '@/components/layout/MobileTabBar.vue'
import VerifyEmailBanner from '@/components/layout/VerifyEmailBanner.vue'
import UpdatePrompt from '@/components/layout/UpdatePrompt.vue'
import OfflineBanner from '@/components/layout/OfflineBanner.vue'
import OfflineScreen from '@/components/common/OfflineScreen.vue'
import ErrorBoundary from '@/components/common/ErrorBoundary.vue'
import ToastContainer from '@/components/common/ToastContainer.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import MistScene from '@/components/common/MistScene.vue'
import { pageTransition } from '@/utils/motion'
import { useOnline } from '@/utils/network'

// Bottom-nav tabs stay mounted between visits: no refetch, spinners or lost scroll/filters.
const CACHED_VIEWS = ['DashboardView', 'ItemsView', 'ChatListView', 'NotificationsView']

const route = useRoute()
const layout = computed(() => route.meta.layout || 'default')

// Offline on a page that can't work without the network → full-screen notice.
// The router view stays mounted underneath so cached tabs aren't thrown away.
const online = useOnline()
const blocked = computed(() => !online.value && !!route.meta.requiresNetwork)
</script>

<template>
  <!-- Misty gradient behind every page; only the landing page adds the lake scene. Auth screens draw their own. -->
  <div v-if="layout !== 'auth'" class="app-backdrop d-print-none" aria-hidden="true">
    <MistScene v-if="route.name === 'home'" align="xMidYMax" />
  </div>

  <div class="d-flex flex-column min-vh-100">
    <template v-if="layout === 'default'">
      <!-- The landing page draws its own nav inside the hero. -->
      <AppNavbar v-if="!route.meta.heroNav" />
      <VerifyEmailBanner />
    </template>

    <OfflineBanner v-if="!blocked" />

    <main class="flex-grow-1">
      <OfflineScreen v-if="blocked" />
      <div v-show="!blocked">
        <ErrorBoundary>
          <RouterView v-slot="{ Component, route: r }">
            <Transition mode="out-in" :css="false" @enter="pageTransition.onEnter" @leave="pageTransition.onLeave" @after-enter="pageTransition.onAfterEnter">
              <KeepAlive :include="CACHED_VIEWS">
                <component :is="Component" :key="r.name" />
              </KeepAlive>
            </Transition>
          </RouterView>
        </ErrorBoundary>
      </div>
    </main>

    <AppFooter v-if="layout === 'default'" />
    <MobileTabBar v-if="layout === 'default'" />
    <UpdatePrompt />
    <ToastContainer />
    <ConfirmDialog />
  </div>
</template>
