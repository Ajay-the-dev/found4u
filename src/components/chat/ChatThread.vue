<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { useChatStore } from '@/stores/chat'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { getCurrentPosition, osmLink } from '@/utils/geo'
import { formatDateTime, timeAgo } from '@/utils/format'
import ErrorAlert from '@/components/common/ErrorAlert.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

const props = defineProps({
  chatId: { type: String, required: true },
  participantInfo: { type: Object, default: () => ({}) },
  height: { type: String, default: '60vh' },
})

const chat = useChatStore()
const auth = useAuthStore()
const ui = useUiStore()

const messages = ref([])
const loading = ref(true)
const error = ref(null)
const draft = ref('')
const sending = ref(false)
const sharing = ref(false)
const scroller = ref(null)
let unsub = null

watch(
  () => props.chatId,
  (id) => {
    unsub?.()
    loading.value = true
    error.value = null
    messages.value = []
    unsub = chat.watchMessages(
      id,
      async (list) => {
        messages.value = list
        loading.value = false
        chat.markRead(id)
        await nextTick()
        scroller.value?.scrollTo({ top: scroller.value.scrollHeight })
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

const nameOf = (uid) => props.participantInfo?.[uid]?.name || 'Participant'
const mine = (m) => m.senderId === auth.uid

// Group consecutive messages from the same sender so names only show once.
const rows = computed(() =>
  messages.value.map((m, i) => ({ ...m, showName: i === 0 || messages.value[i - 1].senderId !== m.senderId })),
)

async function send() {
  const text = draft.value.trim()
  if (!text || sending.value) return
  sending.value = true
  try {
    await chat.sendMessage(props.chatId, { text })
    draft.value = ''
  } catch (err) {
    ui.error(err, 'Message not sent')
  } finally {
    sending.value = false
  }
}

async function shareLocation() {
  sharing.value = true
  try {
    const pos = await getCurrentPosition()
    await chat.sendMessage(props.chatId, { location: pos })
  } catch (err) {
    ui.error(err, 'Could not share location')
  } finally {
    sharing.value = false
  }
}

function onKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    send()
  }
}
</script>

<template>
  <div class="d-flex flex-column border rounded-3 bg-body-tertiary" :style="{ height }">
    <div ref="scroller" class="chat-scroll flex-grow-1 p-3">
      <LoadingSpinner v-if="loading" label="Loading conversation…" />
      <ErrorAlert v-else-if="error" :error="error" />
      <div v-else-if="!messages.length" class="text-center text-secondary small py-5">
        <i class="bi bi-chat-square-text fs-3 d-block mb-2"></i>No messages yet — say hello.
      </div>
      <div v-for="m in rows" :key="m.id" class="d-flex flex-column mb-2" :class="mine(m) ? 'align-items-end' : 'align-items-start'">
        <div v-if="m.showName && !mine(m)" class="small text-secondary ms-1 mb-1">{{ nameOf(m.senderId) }}</div>
        <div class="chat-bubble rounded-4 px-3 py-2" :class="mine(m) ? 'mine' : 'theirs'" :title="formatDateTime(m.createdAt)">
          <template v-if="m.location">
            <a :href="osmLink(m.location)" target="_blank" rel="noopener" :class="mine(m) ? 'text-white' : ''">
              <i class="bi bi-geo-alt-fill me-1"></i>Shared location ({{ m.location.lat.toFixed(4) }}, {{ m.location.lng.toFixed(4) }})
            </a>
          </template>
          <template v-else>{{ m.text }}</template>
        </div>
        <div class="text-secondary mx-1" style="font-size: 0.68rem">{{ timeAgo(m.createdAt) }}</div>
      </div>
    </div>

    <form class="border-top p-2 d-flex gap-2 bg-white rounded-bottom-3" @submit.prevent="send">
      <button type="button" class="btn btn-outline-secondary" :disabled="sharing" title="Share my current location" @click="shareLocation">
        <span v-if="sharing" class="spinner-border spinner-border-sm"></span><i v-else class="bi bi-geo-alt"></i>
      </button>
      <textarea v-model="draft" rows="1" maxlength="2000" class="form-control" placeholder="Write a message…" style="resize: none" @keydown="onKeydown"></textarea>
      <button class="btn btn-primary" :disabled="sending || !draft.trim()" aria-label="Send"><i class="bi bi-send-fill"></i></button>
    </form>
  </div>
</template>
