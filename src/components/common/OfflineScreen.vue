<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { checkConnection } from '@/utils/network'

/* Full-page state for routes that can't work without a connection (sign-in, report forms, invites). */
const auth = useAuthStore()
const checking = ref(false)
const stillOffline = ref(false)

async function retry() {
  checking.value = true
  stillOffline.value = false
  const ok = await checkConnection()
  checking.value = false
  stillOffline.value = !ok
}
</script>

<template>
  <div class="offline-screen container" role="alert" aria-live="assertive">
    <div class="offline-card">
      <div class="offline-art" aria-hidden="true">
        <span class="ring ring-1"></span>
        <span class="ring ring-2"></span>
        <span class="offline-icon"><i class="bi bi-wifi-off"></i></span>
      </div>

      <h1 class="h3 mb-2">You're offline</h1>
      <p class="text-secondary mb-4">This page needs an internet connection. It will come back on its own as soon as you reconnect.</p>

      <div class="d-grid gap-2 d-sm-flex justify-content-sm-center mb-2">
        <button type="button" class="btn btn-primary px-4" :disabled="checking" @click="retry">
          <span v-if="checking" class="spinner-border spinner-border-sm me-2"></span>
          <i v-else class="bi bi-arrow-clockwise me-1"></i>Try again
        </button>
        <RouterLink v-if="auth.isAuthenticated" to="/dashboard" class="btn btn-light px-4">View saved data</RouterLink>
      </div>
      <div class="small text-danger retry-msg">{{ stillOffline ? 'Still no connection. Check Wi-Fi or mobile data.' : '' }}</div>

      <ul class="offline-tips list-unstyled text-start small">
        <li><i class="bi bi-check2-circle"></i>Items, alerts and messages you've opened before are still available.</li>
        <li><i class="bi bi-check2-circle"></i>Anything you change while offline syncs automatically.</li>
        <li><i class="bi bi-wifi"></i>Try turning airplane mode off, or moving closer to your router.</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.offline-screen { min-height: calc(100dvh - 9rem); display: flex; align-items: center; justify-content: center; padding-top: 2rem; padding-bottom: 2rem; }
.offline-card { width: 100%; max-width: 30rem; text-align: center; }

.offline-art { position: relative; width: 7.5rem; height: 7.5rem; margin: 0 auto 1.75rem; display: flex; align-items: center; justify-content: center; }
.offline-icon {
  position: relative; z-index: 1; width: 4.5rem; height: 4.5rem; border-radius: 1.35rem;
  display: inline-flex; align-items: center; justify-content: center; font-size: 2rem; color: #fff;
  background: var(--fi-gradient); box-shadow: 0 14px 32px -10px rgba(var(--fi-primary-rgb), 0.6);
}
.ring { position: absolute; inset: 0; border-radius: 50%; border: 1px solid rgba(var(--fi-primary-rgb), 0.25); animation: offline-pulse 2.6s var(--fi-ease) infinite; }
.ring-2 { animation-delay: 1.3s; }
@keyframes offline-pulse { from { transform: scale(0.55); opacity: 1; } to { transform: scale(1.15); opacity: 0; } }

.retry-msg { min-height: 1.25rem; }
.offline-tips { margin: 1.5rem 0 0; padding: 1rem 1.15rem; display: grid; gap: 0.65rem; border: 1px solid var(--fi-line); border-radius: var(--fi-radius-lg); background: var(--fi-surface); box-shadow: var(--fi-shadow-xs); color: var(--fi-ink-2); }
.offline-tips li { display: flex; gap: 0.6rem; align-items: flex-start; }
.offline-tips .bi { color: var(--fi-primary); flex-shrink: 0; margin-top: 0.05rem; }

@media (prefers-reduced-motion: reduce) { .ring { animation: none; opacity: 0.4; } }
@media (max-width: 767.98px) { .offline-screen { min-height: calc(100dvh - 6rem); } }
</style>
