<script setup>
defineProps({
  label: { type: String, default: 'Loading…' },
  small: { type: Boolean, default: false },
})
</script>

<template>
  <div class="d-flex align-items-center justify-content-center gap-2 text-secondary" :class="small ? 'py-2' : 'py-5'" role="status">
    <span class="loader" :class="{ sm: small }" aria-hidden="true"></span>
    <span class="small">{{ label }}</span>
  </div>
</template>

<style scoped>
.loader {
  width: 1.25rem; height: 1.25rem; border-radius: 50%;
  background: conic-gradient(from 0deg, transparent 0 25%, var(--fi-primary) 100%);
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2px));
  mask: radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2px));
  animation: spin 0.8s linear infinite;
}
.loader.sm { width: 0.9rem; height: 0.9rem; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
