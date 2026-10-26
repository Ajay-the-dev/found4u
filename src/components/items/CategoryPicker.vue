<script setup>
import { CATEGORIES } from '@/utils/constants'

defineProps({ modelValue: { type: String, default: '' } })
const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <div class="row g-2">
    <div v-for="c in CATEGORIES" :key="c.value" class="col-4 col-sm-3 col-lg-2">
      <button
        type="button"
        class="btn w-100 h-100 py-2 d-flex flex-column align-items-center gap-1 small"
        :class="modelValue === c.value ? 'btn-primary' : 'btn-outline-secondary border-light-subtle bg-white text-body'"
        :aria-pressed="modelValue === c.value"
        @click="emit('update:modelValue', c.value)"
      >
        <i class="bi fs-5" :class="c.icon"></i>
        <span class="lh-sm" style="font-size: 0.75rem">{{ c.label }}</span>
      </button>
    </div>
  </div>
</template>
