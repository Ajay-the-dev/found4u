<script setup>
import { computed } from 'vue'
import { STATUS_META } from '@/utils/constants'

const props = defineProps({ status: { type: String, required: true } })
const meta = computed(() => STATUS_META[props.status] || { label: props.status, color: 'secondary', icon: 'bi-circle' })
</script>

<template>
  <span class="badge rounded-pill" :class="`text-bg-${meta.color}`">
    <i class="bi me-1" :class="meta.icon"></i>{{ meta.label }}
  </span>
</template>
