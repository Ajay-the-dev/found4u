<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppNavbar from '@/components/layout/AppNavbar.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import VerifyEmailBanner from '@/components/layout/VerifyEmailBanner.vue'
import ErrorBoundary from '@/components/common/ErrorBoundary.vue'
import ToastContainer from '@/components/common/ToastContainer.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'

const route = useRoute()
const layout = computed(() => route.meta.layout || 'default')
</script>

<template>
  <div class="d-flex flex-column min-vh-100">
    <template v-if="layout === 'default'">
      <AppNavbar />
      <VerifyEmailBanner />
    </template>

    <main class="flex-grow-1">
      <ErrorBoundary>
        <RouterView />
      </ErrorBoundary>
    </main>

    <AppFooter v-if="layout === 'default'" />
    <ToastContainer />
    <ConfirmDialog />
  </div>
</template>
