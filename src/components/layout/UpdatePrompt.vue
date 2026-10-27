<script setup>
import { useRegisterSW } from 'virtual:pwa-register/vue'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
const HOUR = 60 * 60 * 1000

const { needRefresh, updateServiceWorker } = useRegisterSW({
  // Long-lived installed sessions still pick up deploys.
  onRegisteredSW(_url, registration) {
    if (registration) setInterval(() => registration.update(), HOUR)
  },
  onOfflineReady() {
    ui.toast('Ready to work offline', 'success', { body: 'Found4 is installed and loads even without a connection.' })
  },
})
</script>

<template>
  <Transition name="update">
    <div v-if="needRefresh" class="update-prompt d-print-none" role="status">
      <span class="update-icon"><i class="bi bi-arrow-repeat"></i></span>
      <div class="flex-grow-1 min-w-0">
        <div class="fw-semibold text-body">A new version is available</div>
        <div class="small text-secondary">Reload to get the latest fixes.</div>
      </div>
      <button type="button" class="btn btn-sm btn-light" @click="needRefresh = false">Later</button>
      <button type="button" class="btn btn-sm btn-primary" @click="updateServiceWorker(true)">Reload</button>
    </div>
  </Transition>
</template>

<style scoped>
.update-prompt {
  position: fixed; z-index: 1090; right: 1.25rem; bottom: 1.25rem; width: min(26rem, calc(100vw - 1.5rem));
  display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem 1rem;
  background: var(--fi-surface); border: 1px solid var(--fi-line); border-radius: var(--fi-radius-lg); box-shadow: var(--fi-shadow-lg);
}
.update-icon { width: 2.25rem; height: 2.25rem; border-radius: 0.65rem; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; background: rgba(var(--fi-primary-rgb), 0.1); color: var(--fi-primary); font-size: 1.1rem; }
.update-enter-active, .update-leave-active { transition: opacity 0.25s ease, transform 0.35s var(--fi-ease); }
.update-enter-from, .update-leave-to { opacity: 0; transform: translateY(12px); }

@media (max-width: 767.98px) {
  /* Sit just above the floating tab bar */
  .update-prompt { left: 0.75rem; right: 0.75rem; width: auto; bottom: calc(5% + 80px + env(safe-area-inset-bottom)); }
}
</style>
