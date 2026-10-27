<script setup>
defineProps({
  icon: { type: String, default: 'bi-inbox' },
  title: { type: String, required: true },
  text: { type: String, default: '' },
})
</script>

<template>
  <div class="text-center py-5 px-3">
    <div class="empty-icon mx-auto mb-3"><i class="bi" :class="icon"></i></div>
    <h2 class="h6 mb-1">{{ title }}</h2>
    <p v-if="text" class="text-secondary small mb-3 mx-auto" style="max-width: 360px">{{ text }}</p>
    <slot />
  </div>
</template>

<style scoped>
.empty-icon {
  width: 3.5rem; height: 3.5rem; 
  display: flex; align-items: center; justify-content: center; font-size: 1.5rem;
  color: var(--fi-primary); background: linear-gradient(180deg, var(--bs-primary-bg-subtle), #fff); border-radius: 50%;
  border: 1px solid var(--fi-line); box-shadow: var(--fi-shadow-sm), inset 0 -2px 0 rgba(var(--fi-primary-rgb), 0.06);
}
</style>
