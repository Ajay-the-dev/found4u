<script setup>
import { computed } from 'vue'
import { friendlyError } from '@/utils/errors'

const props = defineProps({
  error: { type: [Object, String, Error], default: null },
  retryable: { type: Boolean, default: false },
})
defineEmits(['retry'])
const message = computed(() => (props.error ? friendlyError(props.error) : ''))
</script>

<template>
  <div v-if="error" class="alert alert-danger d-flex align-items-center gap-2" role="alert">
    <i class="bi bi-exclamation-triangle-fill"></i>
    <div class="flex-grow-1">{{ message }}</div>
    <button v-if="retryable" class="btn btn-sm btn-outline-danger" @click="$emit('retry')">Retry</button>
  </div>
</template>
