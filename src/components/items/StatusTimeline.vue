<script setup>
import { computed } from 'vue'
import { STATUS_META, ITEM_STATUSES } from '@/utils/constants'
import { formatDateTime } from '@/utils/format'

const props = defineProps({
  status: { type: String, required: true },
  history: { type: Array, default: () => [] },
})

const currentIndex = computed(() => ITEM_STATUSES.indexOf(props.status))
const events = computed(() => [...props.history].sort((a, b) => (b.at?.toMillis?.() ?? 0) - (a.at?.toMillis?.() ?? 0)))
</script>

<template>
  <div>
    <!-- Lifecycle progress -->
    <div class="d-flex justify-content-between position-relative mb-4 px-1">
      <div class="position-absolute top-50 start-0 end-0 border-top border-2" style="z-index: 0"></div>
      <div v-for="(s, i) in ITEM_STATUSES" :key="s" class="text-center position-relative" style="z-index: 1; width: 20%">
        <span
          class="d-inline-flex align-items-center justify-content-center rounded-circle border border-2"
          :class="i <= currentIndex ? `bg-${STATUS_META[s].color} border-${STATUS_META[s].color} text-white` : 'bg-white text-secondary'"
          style="width: 2rem; height: 2rem"
        >
          <i class="bi" :class="STATUS_META[s].icon"></i>
        </span>
        <div class="small mt-1" :class="i === currentIndex ? 'fw-semibold' : 'text-secondary'" style="font-size: 0.72rem">{{ STATUS_META[s].label }}</div>
      </div>
    </div>

    <ul class="list-unstyled small mb-0">
      <li v-for="(e, i) in events" :key="i" class="d-flex gap-2 mb-2">
        <i class="bi mt-1" :class="[STATUS_META[e.status]?.icon, `text-${STATUS_META[e.status]?.color}`]"></i>
        <div>
          <span class="fw-semibold">{{ STATUS_META[e.status]?.label || e.status }}</span>
          <span class="text-secondary"> · {{ e.byName || 'System' }} · {{ formatDateTime(e.at) }}</span>
          <div v-if="e.note" class="text-secondary">{{ e.note }}</div>
        </div>
      </li>
    </ul>
  </div>
</template>
