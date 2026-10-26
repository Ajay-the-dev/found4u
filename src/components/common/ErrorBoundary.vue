<script setup>
import { ref, watch, onErrorCaptured } from 'vue'
import { useRoute } from 'vue-router'
import { friendlyError } from '@/utils/errors'
import { useUiStore } from '@/stores/ui'

const route = useRoute()
const ui = useUiStore()
const error = ref(null)

// Vue reports event-handler errors as "… event handler" in dev and as runtime-5/6 codes in production.
const isHandlerError = (info) => /event handler|runtime-[56]$/.test(String(info))

onErrorCaptured((err, _instance, info) => {
  console.error('[ErrorBoundary]', info, err)
  if (isHandlerError(info)) {
    // A failed button click shouldn't wipe out the page — report it and keep going.
    ui.error(err)
  } else {
    error.value = err
  }
  return false
})

watch(
  () => route.fullPath,
  () => (error.value = null),
)
</script>

<template>
  <div v-if="error" class="container py-5" style="max-width: 640px">
    <div class="card p-4 text-center">
      <div class="display-6 text-danger mb-2"><i class="bi bi-exclamation-octagon"></i></div>
      <h1 class="h4">This page hit a problem</h1>
      <p class="text-secondary mb-4">{{ friendlyError(error) }}</p>
      <div class="d-flex gap-2 justify-content-center">
        <button class="btn btn-primary" @click="error = null"><i class="bi bi-arrow-clockwise me-1"></i>Try again</button>
        <RouterLink to="/dashboard" class="btn btn-outline-secondary">Go to dashboard</RouterLink>
      </div>
    </div>
  </div>
  <slot v-else />
</template>
