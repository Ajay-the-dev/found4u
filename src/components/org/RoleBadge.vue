<script setup>
import { computed } from 'vue'
import { ROLES } from '@/utils/constants'

const props = defineProps({ role: { type: String, required: true } })
const meta = computed(() => ROLES[props.role] || ROLES.member)
</script>

<template>
  <span class="badge rounded-pill" :class="`text-bg-${meta.color}`" :title="meta.description">
    <i class="bi me-1" :class="meta.icon"></i>{{ meta.label }}
  </span>
</template>
