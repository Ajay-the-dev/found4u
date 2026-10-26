<script setup>
import { useRouter } from 'vue-router'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
const router = useRouter()

const iconFor = (t) =>
  t.icon || { success: 'bi-check-circle-fill', danger: 'bi-x-octagon-fill', warning: 'bi-exclamation-triangle-fill' }[t.variant] || 'bi-info-circle-fill'

function open(t) {
  if (t.link) router.push(t.link)
  ui.dismiss(t.id)
}
</script>

<template>
  <div class="toast-stack d-flex flex-column gap-2" aria-live="polite">
    <TransitionGroup name="toast">
      <div
        v-for="t in ui.toasts"
        :key="t.id"
        class="toast show border-0 shadow"
        role="alert"
        :class="{ 'cursor-pointer': t.link }"
        @click="open(t)"
      >
        <div class="toast-body d-flex gap-2 align-items-start">
          <i class="bi fs-5" :class="[iconFor(t), `text-${t.variant}`]"></i>
          <div class="flex-grow-1 min-w-0">
            <div class="fw-semibold">{{ t.title }}</div>
            <div v-if="t.body" class="small text-secondary">{{ t.body }}</div>
          </div>
          <button type="button" class="btn-close btn-sm" aria-label="Close" @click.stop="ui.dismiss(t.id)"></button>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active, .toast-leave-active { transition: all 0.2s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(8px); }
</style>
