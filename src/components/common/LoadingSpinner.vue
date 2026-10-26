<script setup>
defineProps({
  label: { type: String, default: 'Loading…' },
  small: { type: Boolean, default: false },
})
</script>

<template>
  <div class="d-flex align-items-center justify-content-center gap-2 text-secondary" :class="small ? 'py-2' : 'py-5'">
    <div class="spinner-border" :class="{ 'spinner-border-sm': small }" role="status" aria-hidden="true"></div>
    <span :class="{ small }">{{ label }}</span>
  </div>
</template>
