import { ref, readonly } from 'vue'

/* App-wide connectivity flag, kept in sync with the browser's online/offline events. */
const online = ref(typeof navigator === 'undefined' ? true : navigator.onLine)

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => (online.value = true))
  window.addEventListener('offline', () => (online.value = false))
}

export const useOnline = () => readonly(online)

// navigator.onLine can claim "online" on dead Wi-Fi, so really hit the network.
// The ?ping param keeps the request out of the service worker's precache.
export async function checkConnection() {
  try {
    await fetch(`/favicon.svg?ping=${Date.now()}`, { method: 'HEAD', cache: 'no-store' })
    online.value = true
  } catch {
    online.value = false
  }
  return online.value
}
