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
  <RouterLink :to="`/items/${item.id}`" class="card card-hover h-100 text-decoration-none text-body overflow-hidden">
    <div v-if="!compact" class="position-relative">
      <img v-if="cover" :src="imageUrl(cover, { width: 480, height: 360, crop: 'fill' })" class="thumb" :alt="item.title" loading="lazy" />
      <div v-else class="thumb-placeholder"><i class="bi" :class="category.icon"></i></div>
      <span class="badge position-absolute top-0 start-0 m-2" :class="item.type === 'lost' ? 'bg-lost' : 'bg-found'">
        {{ item.type === 'lost' ? 'LOST' : 'FOUND' }}
      </span>
    </div>
    <div class="card-body d-flex flex-column gap-1" :class="{ 'py-2': compact }">
      <div class="d-flex align-items-start gap-2">
        <span v-if="compact" class="badge mt-1" :class="item.type === 'lost' ? 'bg-lost' : 'bg-found'">{{ item.type === 'lost' ? 'LOST' : 'FOUND' }}</span>
        <h3 class="h6 mb-0 flex-grow-1 text-truncate">{{ item.title }}</h3>
        <StatusBadge :status="item.status" />
      </div>
      <div class="small text-secondary d-flex flex-wrap gap-x-3 column-gap-3">
        <span><i class="bi me-1" :class="category.icon"></i>{{ category.label }}</span>
        <span><i class="bi bi-calendar3 me-1"></i>{{ when }}</span>
        <span v-if="distance != null" class="text-primary"><i class="bi bi-signpost-2 me-1"></i>{{ formatDistance(distance) }} away</span>
      </div>
      <div v-if="!compact" class="small text-secondary text-truncate">
        <i class="bi me-1" :class="item.location ? 'bi-geo-alt' : 'bi-question-diamond'"></i>
        {{ item.location?.address || (item.location ? 'Pinned on map' : 'Location unknown') }}
      </div>
      <div class="small text-secondary mt-auto pt-1">Reported {{ timeAgo(item.createdAt) }}</div>
    </div>
  </RouterLink>
</template>
