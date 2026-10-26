<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAssetStore } from '@/stores/asset'
import { CATEGORY_MAP } from '@/utils/constants'
import { imageUrl } from '@/services/media'
import { getCurrentPosition } from '@/utils/geo'
import { friendlyError } from '@/utils/errors'
import ChatThread from '@/components/chat/ChatThread.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

const route = useRoute()
const auth = useAuthStore()
const assetStore = useAssetStore()

const asset = ref(null)
const loading = ref(true)
const loadError = ref('')
const chatId = ref(null)

const message = ref('')
const contact = ref('')
const shareLocation = ref(true)
const sending = ref(false)
const pinging = ref(false)
const sendError = ref('')

const assetId = computed(() => String(route.params.assetId || '').toUpperCase())
const isOwner = computed(() => auth.isAuthenticated && asset.value?.ownerId === auth.uid)
const category = computed(() => CATEGORY_MAP[asset.value?.category] || CATEGORY_MAP.other)
const participantInfo = computed(() =>
  auth.uid && asset.value
    ? { [auth.uid]: { name: 'You' }, [asset.value.ownerId]: { name: 'Asset owner' } }
    : {},
)

onMounted(async () => {
  try {
    asset.value = await assetStore.getPublicAsset(assetId.value)
    if (asset.value?.active) chatId.value = await assetStore.findExistingScanChat(assetId.value).catch(() => null)
  } catch (err) {
    loadError.value = friendlyError(err)
  } finally {
    loading.value = false
  }
})

async function locate() {
  try {
    return await getCurrentPosition()
  } catch {
    return null // a declined permission shouldn't block the message
  }
}

async function send() {
  if (!message.value.trim()) return (sendError.value = 'Please write a short message for the owner.')
  sending.value = true
  sendError.value = ''
  try {
    const location = shareLocation.value ? await locate() : null
    chatId.value = await assetStore.submitScanReport(asset.value, { message: message.value, contact: contact.value, location })
    message.value = ''
  } catch (err) {
    sendError.value = friendlyError(err)
  } finally {
    sending.value = false
  }
}

async function ping() {
  pinging.value = true
  sendError.value = ''
  try {
    const location = await getCurrentPosition()
    chatId.value = await assetStore.submitScanReport(asset.value, { message: '📍 I found your item here.', location })
  } catch (err) {
    sendError.value = friendlyError(err)
  } finally {
    pinging.value = false
  }
}
</script>

<template>
  <div class="hero min-vh-100 py-4">
    <div class="container" style="max-width: 560px">
      <div class="text-center mb-3">
        <RouterLink to="/" class="fw-bold text-decoration-none text-body"><i class="bi bi-search-heart text-primary me-1"></i>FoundIt</RouterLink>
      </div>

      <LoadingSpinner v-if="loading" label="Looking up this tag…" />

      <div v-else-if="loadError" class="alert alert-danger">{{ loadError }}</div>

      <div v-else-if="!asset" class="card p-4 text-center">
        <i class="bi bi-qr-code display-5 text-secondary"></i>
        <h1 class="h5 mt-2">Unknown tag</h1>
        <p class="text-secondary small mb-0">The tag <code>{{ assetId }}</code> isn't registered, or has been removed by its owner. If you've found something, you can still log it as a found item.</p>
        <RouterLink to="/report/found" class="btn btn-success mt-3">Log a found item</RouterLink>
      </div>

      <div v-else-if="!asset.active" class="card p-4 text-center">
        <i class="bi bi-slash-circle display-5 text-secondary"></i>
        <h1 class="h5 mt-2">This tag is disabled</h1>
        <p class="text-secondary small mb-0">The owner has paused this tag. Please hand the item to the nearest lost-and-found desk.</p>
      </div>

      <template v-else>
        <div class="card shadow-sm border-0 mb-3">
          <div class="card-body text-center">
            <div v-if="asset.reportedLost" class="alert alert-danger py-2 small"><i class="bi bi-megaphone-fill me-1"></i>The owner is actively looking for this item!</div>
            <img v-if="asset.photo" :src="imageUrl(asset.photo, { width: 400, height: 300, crop: 'fill' })" class="rounded mb-3" style="max-width: 220px; width: 100%" alt="" />
            <div v-else class="display-5 text-primary mb-2"><i class="bi" :class="category.icon"></i></div>
            <h1 class="h4 mb-1">You found: {{ asset.name }}</h1>
            <div class="small text-secondary mb-3">Tag <code>{{ asset.id }}</code> · {{ category.label }}</div>
            <blockquote v-if="asset.publicMessage" class="bg-primary-subtle rounded p-3 small mb-0 text-start">
              <i class="bi bi-quote text-primary"></i> {{ asset.publicMessage }}
            </blockquote>
          </div>
        </div>

        <div v-if="isOwner" class="alert alert-info">
          <i class="bi bi-person-check me-1"></i>This is your tag. <RouterLink :to="`/assets/${asset.id}`">Open it in your dashboard</RouterLink> to see finder reports.
        </div>

        <template v-else>
          <div v-if="!chatId" class="card shadow-sm border-0 mb-3">
            <div class="card-body">
              <h2 class="h6"><i class="bi bi-incognito me-1 text-primary"></i>Message the owner anonymously</h2>
              <p class="small text-secondary">No account needed. The owner's details stay private, and so do yours unless you choose to share them.</p>
              <div v-if="sendError" class="alert alert-danger small py-2">{{ sendError }}</div>
              <form @submit.prevent="send">
                <textarea v-model="message" rows="3" maxlength="1000" class="form-control mb-2" placeholder="e.g. Found this in the library, 2nd floor. I've left it at the front desk."></textarea>
                <input v-model="contact" maxlength="200" class="form-control form-control-sm mb-2" placeholder="Optional: your email or phone, if you want to share it" />
                <div class="form-check mb-3">
                  <input id="loc" v-model="shareLocation" class="form-check-input" type="checkbox" />
                  <label class="form-check-label small" for="loc">Share my current location with the owner</label>
                </div>
                <div class="d-grid gap-2">
                  <button class="btn btn-primary" :disabled="sending">
                    <span v-if="sending" class="spinner-border spinner-border-sm me-2"></span><i v-else class="bi bi-send me-1"></i>Send to owner
                  </button>
                  <button type="button" class="btn btn-outline-warning" :disabled="pinging" @click="ping">
                    <span v-if="pinging" class="spinner-border spinner-border-sm me-2"></span><i v-else class="bi bi-geo-alt me-1"></i>Just send a location ping
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div v-else class="card shadow-sm border-0">
            <div class="card-body">
              <div class="alert alert-success small py-2"><i class="bi bi-check-circle me-1"></i>The owner has been notified. Keep this page open, or come back later, to continue the conversation.</div>
              <ChatThread :chat-id="chatId" :participant-info="participantInfo" height="50vh" />
            </div>
          </div>
        </template>
      </template>

      <p class="text-center small text-secondary mt-4">Powered by FoundIt · <RouterLink to="/register">Protect your own things</RouterLink></p>
    </div>
  </div>
</template>
