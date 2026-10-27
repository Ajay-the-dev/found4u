<script setup>
import { computed } from 'vue'
import { CATEGORY_MAP } from '@/utils/constants'
import { imageUrl } from '@/services/media'
import { formatDate, timeAgo } from '@/utils/format'
import { formatDistance } from '@/utils/geo'
import StatusBadge from '@/components/common/StatusBadge.vue'

const props = defineProps({
  item: { type: Object, required: true },
  distance: { type: Number, default: null },
  compact: { type: Boolean, default: false },
})

const category = computed(() => CATEGORY_MAP[props.item.category] || CATEGORY_MAP.other)
const cover = computed(() => props.item.photos?.[0])
const when = computed(() =>
  props.item.type === 'lost'
    ? props.item.dateTo && props.item.dateTo !== props.item.dateFrom
      ? `${formatDate(props.item.dateFrom)} – ${formatDate(props.item.dateTo)}`
      : formatDate(props.item.dateFrom)
    : formatDate(props.item.dateFound),
)
</script>

<template>
  <RouterLink :to="`/items/${item.id}`" class="card card-hover item-card h-100 text-decoration-none text-body overflow-hidden" :class="{ 'has-media': !compact }">
    <div v-if="!compact" class="item-media position-relative overflow-hidden">
      <img v-if="cover" :src="imageUrl(cover, { width: 480, height: 360, crop: 'fill' })" class="thumb" :alt="item.title" loading="lazy" />
      <div v-else class="thumb-placeholder"><i class="bi" :class="category.icon"></i></div>
      <span class="type-chip position-absolute top-0 start-0 m-2" :class="item.type">
        <span class="type-dot"></span>{{ item.type === 'lost' ? 'Lost' : 'Found' }}
      </span>
    </div>
    <div class="card-body d-flex flex-column gap-1" :class="{ 'py-2': compact }">
      <div class="d-flex align-items-start gap-2">
        <span v-if="compact" class="badge mt-1" :class="item.type === 'lost' ? 'bg-lost' : 'bg-found'">{{ item.type === 'lost' ? 'LOST' : 'FOUND' }}</span>
        <h3 class="h6 mb-0 flex-grow-1 text-truncate text-body fw-semibold">{{ item.title }}</h3>
        <StatusBadge :status="item.status" />
      </div>
      <div class="small text-secondary d-flex flex-wrap column-gap-3 row-gap-1 mt-1">
        <span><i class="bi me-1" :class="category.icon"></i>{{ category.label }}</span>
        <span><i class="bi bi-calendar3 me-1"></i>{{ when }}</span>
        <span v-if="distance != null" class="text-primary"><i class="bi bi-signpost-2 me-1"></i>{{ formatDistance(distance) }} away</span>
      </div>
      <div v-if="!compact" class="small text-secondary text-truncate">
        <i class="bi me-1" :class="item.location ? 'bi-geo-alt' : 'bi-question-diamond'"></i>
        {{ item.location?.address || (item.location ? 'Pinned on map' : 'Location unknown') }}
      </div>
      <div class="small text-secondary mt-auto" :class="compact ? 'pt-1' : 'pt-2 mt-2 border-top'">Reported {{ timeAgo(item.createdAt) }}</div>
    </div>
  </RouterLink>
</template>

<style scoped>
.type-chip {
  display: inline-flex; align-items: center; gap: 0.35rem;
  padding: 0.25rem 0.6rem; border-radius: 999px; font-size: 0.72rem; font-weight: 650;
  background: rgba(255, 255, 255, 0.92); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  box-shadow: 0 2px 8px rgba(16, 34, 44, 0.12);
}
.type-chip .type-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.type-chip.lost { color: var(--fi-lost); }
.type-chip.found { color: var(--fi-found); }

/* Phones: compact horizontal list rows instead of tall grid cards. */
@media (max-width: 767.98px) {
  .item-card.has-media { flex-direction: row; }
  .item-media { width: 108px; flex-shrink: 0; }
  .item-media :deep(.thumb), .item-media :deep(.thumb-placeholder) { height: 100%; aspect-ratio: auto; min-height: 108px; font-size: 1.75rem; }
  .item-card .type-chip { font-size: 0.62rem; padding: 0.15rem 0.45rem; margin: 0.35rem !important; }
  .item-card :deep(.card-body) { padding: 0.75rem 0.85rem; min-width: 0; }
  .item-card:hover { transform: none; }
}
</style>
