<script setup>
import { useRouter } from 'vue-router'
import { useNotificationStore, NOTIFICATION_ICONS } from '@/stores/notification'
import { useUiStore } from '@/stores/ui'
import { timeAgo, formatDateTime } from '@/utils/format'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import EmptyState from '@/components/common/EmptyState.vue'

const router = useRouter()
const notifications = useNotificationStore()
const ui = useUiStore()

function open(n) {
  if (!n.read) notifications.markRead(n.id).catch(() => {})
  if (n.link) router.push(n.link)
}

async function remove(n) {
  try {
    await notifications.remove(n.id)
  } catch (err) {
    ui.error(err)
  }
}

async function markAll() {
  try {
    await notifications.markAllRead()
  } catch (err) {
    ui.error(err)
  }
}
</script>

<template>
  <div class="container py-4" style="max-width: 820px">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h1 class="h3 mb-0">Notifications</h1>
      <button class="btn btn-sm btn-outline-primary" :disabled="!notifications.unreadCount" @click="markAll"><i class="bi bi-check2-all me-1"></i>Mark all read</button>
    </div>
    <LoadingSpinner v-if="notifications.loading" />
    <div v-else-if="!notifications.items.length" class="card">
      <EmptyState icon="bi-bell-slash" title="No notifications" text="Radius alerts, scan reports and status updates will appear here." />
    </div>
    <div v-else class="list-group shadow-sm">
      <div v-for="n in notifications.items" :key="n.id" class="list-group-item d-flex gap-3 align-items-start" :class="{ 'bg-primary-subtle': !n.read }">
        <span class="stat-icon tone-primary" style="width: 2.25rem; height: 2.25rem; font-size: 1rem"><i class="bi" :class="NOTIFICATION_ICONS[n.type] || NOTIFICATION_ICONS.default"></i></span>
        <button class="btn btn-link text-start text-decoration-none text-body p-0 flex-grow-1 min-w-0" @click="open(n)">
          <div class="fw-semibold">{{ n.title }}</div>
          <div class="small text-secondary">{{ n.body }}</div>
          <div class="text-secondary" style="font-size: 0.72rem" :title="formatDateTime(n.createdAt)">{{ timeAgo(n.createdAt) }}</div>
        </button>
        <button class="btn btn-sm btn-link text-secondary" aria-label="Delete notification" @click="remove(n)"><i class="bi bi-x-lg"></i></button>
      </div>
    </div>
  </div>
</template>
