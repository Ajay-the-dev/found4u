<script setup>
defineProps({
  icon: { type: String, default: 'bi-inbox' },
  title: { type: String, required: true },
  text: { type: String, default: '' },
})
</script>

<template>
  <div class="text-center py-5 px-3">
    <div class="display-6 text-secondary opacity-50 mb-2"><i class="bi" :class="icon"></i></div>
    <h2 class="h6 mb-1">{{ title }}</h2>
    <p v-if="text" class="text-secondary small mb-3">{{ text }}</p>
    <slot />
  </div>
</template>
