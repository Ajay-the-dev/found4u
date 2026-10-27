<script setup>
import { watch } from 'vue'
import { useUiStore } from '@/stores/ui'
import { useOnline } from '@/utils/network'

/* Slim notice while offline on pages that can still show saved data; toast when the connection returns. */
const online = useOnline()
const ui = useUiStore()

watch(online, (now, before) => {
  if (now && before === false) ui.toast('Back online', 'success', { body: 'Your changes are syncing.', timeout: 3000 })
})
</script>

<template>
  <Transition name="offline">
    <div v-if="!online" class="offline-banner d-print-none" role="status">
      <div class="container d-flex align-items-center gap-2">
        <span class="dot"></span>
        <span class="fw-semibold">You're offline</span>
        <span class="text-secondary text-truncate">· Showing saved data. Changes sync when you reconnect.</span>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.offline-banner { padding: 0.5rem 0; font-size: 0.8125rem; background: #fff8e6; border-bottom: 1px solid #f5e1a4; color: var(--fi-ink); }
.dot { width: 0.5rem; height: 0.5rem; border-radius: 50%; background: #d97706; flex-shrink: 0; box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.18); }
.offline-enter-active, .offline-leave-active { transition: opacity 0.2s ease, transform 0.25s var(--fi-ease); }
.offline-enter-from, .offline-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
