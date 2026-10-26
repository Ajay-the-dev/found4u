<script setup>
import { initials } from '@/utils/format'

defineProps({
  name: { type: String, default: '' },
  photo: { type: String, default: null },
  size: { type: String, default: '2rem' },
})
</script>

<template>
  <span class="avatar" :style="{ width: size, height: size }" :title="name">
    <img v-if="photo" :src="photo" :alt="name" referrerpolicy="no-referrer" />
    <template v-else>{{ initials(name) }}</template>
  </span>
</template>
