import { createApp } from 'vue'
import { createPinia } from 'pinia'

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import 'leaflet/dist/leaflet.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import './assets/main.css'

import { isFirebaseConfigured } from './services/firebase'
import { friendlyError } from './utils/errors'
import App from './App.vue'
import SetupRequiredView from './views/SetupRequiredView.vue'

if (!isFirebaseConfigured) {
  createApp(SetupRequiredView).mount('#app')
} else {
  bootstrap()
}

async function bootstrap() {
  const app = createApp(App)
  const pinia = createPinia()
  app.use(pinia)

  // Stores are imported after Pinia is installed.
  const [{ useAuthStore }, { useUiStore }, { default: router }] = await Promise.all([
    import('./stores/auth'),
    import('./stores/ui'),
    import('./router'),
  ])

  useAuthStore().init()
  const ui = useUiStore()

  // Last line of defence: anything not caught by an ErrorBoundary or a handler.
  app.config.errorHandler = (err, _instance, info) => {
    console.error('[app]', info, err)
    ui.error(err)
  }
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[unhandled]', event.reason)
    ui.toast('Unexpected error', 'danger', { body: friendlyError(event.reason) })
  })

  app.use(router)
  await router.isReady()
  app.mount('#app')
}
