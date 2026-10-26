<script setup>
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'
import { timeAgo } from '@/utils/format'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import UserAvatar from '@/components/common/UserAvatar.vue'

const auth = useAuthStore()
const chat = useChatStore()

const KIND_ICON = { asset: 'bi-qr-code-scan', item: 'bi-box-seam', match: 'bi-link-45deg' }
const otherName = (c) => {
  const other = c.participants.find((p) => p !== auth.uid)
  return c.participantInfo?.[other]?.name || 'Participant'
}
</script>

<template>
  <div class="container py-4" style="max-width: 820px">
    <h1 class="h3 mb-3">Messages</h1>
    <LoadingSpinner v-if="chat.loading" />
    <div v-else-if="!chat.chats.length" class="card">
      <EmptyState icon="bi-chat-square-dots" title="No conversations yet" text="Chats start when you contact a finder or owner, confirm a match, or when someone scans one of your QR tags." />
    </div>
    <div v-else class="list-group shadow-sm">
      <RouterLink v-for="c in chat.chats" :key="c.id" :to="`/chats/${c.id}`" class="list-group-item list-group-item-action d-flex gap-3 align-items-center py-3">
        <div class="position-relative">
          <UserAvatar :name="otherName(c)" size="2.5rem" />
          <span class="position-absolute bottom-0 end-0 translate-middle-x badge rounded-pill text-bg-light border p-1" style="font-size: 0.6rem"><i class="bi" :class="KIND_ICON[c.kind]"></i></span>
        </div>
        <div class="flex-grow-1 min-w-0">
          <div class="d-flex justify-content-between gap-2">
            <strong class="text-truncate" :class="{ 'text-primary': chat.isUnread(c) }">{{ c.title }}</strong>
            <span class="small text-secondary text-nowrap">{{ timeAgo(c.lastMessageAt || c.createdAt) }}</span>
          </div>
          <div class="small text-secondary text-truncate">
            <span class="fw-semibold">{{ otherName(c) }}:</span>
            <span :class="{ 'fw-semibold text-body': chat.isUnread(c) }"> {{ c.lastMessage || 'No messages yet' }}</span>
          </div>
        </div>
        <span v-if="chat.isUnread(c)" class="badge rounded-pill bg-primary">new</span>
      </RouterLink>
    </div>
  </div>
</template>
