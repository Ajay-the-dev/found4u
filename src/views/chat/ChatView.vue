<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'
import { isPermissionError } from '@/utils/errors'
import ChatThread from '@/components/chat/ChatThread.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorAlert from '@/components/common/ErrorAlert.vue'

const route = useRoute()
const auth = useAuthStore()
const chatStore = useChatStore()

const chat = ref(null)
const loading = ref(true)
const error = ref(null)
let unsub = null

watch(
  () => route.params.id,
  (id) => {
    unsub?.()
    loading.value = true
    error.value = null
    unsub = chatStore.watchChat(
      id,
      (c) => {
        chat.value = c
        loading.value = false
      },
      (err) => {
        error.value = err
        loading.value = false
      },
    )
  },
  { immediate: true },
)
onBeforeUnmount(() => unsub?.())

const other = computed(() => {
  if (!chat.value) return null
  const uid = chat.value.participants.find((p) => p !== auth.uid)
  return chat.value.participantInfo?.[uid] || { name: 'Participant' }
})
const contextLink = computed(() => {
  const c = chat.value
  if (!c) return null
  if (c.kind === 'item') return { to: `/items/${c.refId}`, label: 'View item' }
  if (c.kind === 'asset' && c.participantInfo?.[auth.uid]?.role === 'owner') return { to: `/assets/${c.refId}`, label: 'View asset' }
  return null
})
const participantInfo = computed(() => ({ ...(chat.value?.participantInfo || {}), [auth.uid]: { name: 'You' } }))
</script>

<template>
  <div class="container py-4 chat-view" style="max-width: 820px">
    <LoadingSpinner v-if="loading" />
    <div v-else-if="error" class="card">
      <EmptyState v-if="isPermissionError(error)" icon="bi-lock" title="You're not part of this conversation" />
      <div v-else class="card-body"><ErrorAlert :error="error" /></div>
    </div>
    <div v-else-if="!chat" class="card"><EmptyState icon="bi-chat-square" title="Conversation not found" /></div>
    <template v-else>
      <div class="d-flex align-items-center gap-2 mb-3">
        <RouterLink to="/chats" class="btn btn-light btn-sm"><i class="bi bi-arrow-left"></i></RouterLink>
        <div class="flex-grow-1 min-w-0">
          <h1 class="h5 mb-0 text-truncate">{{ chat.title }}</h1>
          <div class="small text-secondary">with {{ other.name }}<span v-if="chat.kind === 'asset'"> · <i class="bi bi-incognito"></i> identities kept private</span></div>
        </div>
        <RouterLink v-if="contextLink" :to="contextLink.to" class="btn btn-sm btn-outline-primary">{{ contextLink.label }}</RouterLink>
      </div>
      <ChatThread :chat-id="chat.id" :participant-info="participantInfo" :cleared-at="chatStore.clearedAt(chat)" height="calc(100vh - 260px)" />
      <p class="small text-secondary mt-2 d-none d-md-block"><i class="bi bi-shield-check me-1"></i>Meet in a public place or at an official lost-and-found desk for handovers.</p>
    </template>
  </div>
</template>
