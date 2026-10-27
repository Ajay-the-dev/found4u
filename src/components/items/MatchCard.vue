<script setup>
import { computed } from 'vue'
import { MATCH_STATUS_META } from '@/utils/constants'
import { imageUrl } from '@/services/media'
import { formatDistance } from '@/utils/geo'
import { timeAgo } from '@/utils/format'

const props = defineProps({
  match: { type: Object, required: true },
  perspective: { type: String, default: 'staff' }, // 'lost' | 'found' | 'staff'
})
defineEmits(['confirm', 'dismiss', 'chat', 'handover', 'complete'])

const meta = computed(() => MATCH_STATUS_META[props.match.status] || MATCH_STATUS_META.pending)
const reasonLabel = computed(
  () =>
    ({
      proximity: `Found ${formatDistance(props.match.distanceMeters)} from the lost location`,
      category: 'Same category & timeframe (lost location unknown)',
      manual: 'Linked manually by staff',
      reported: 'Finder reported it from your listing',
    })[props.match.reason] || 'Potential match',
)
</script>

<template>
  <div class="card">
    <div class="card-body">
      <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
        <span class="badge" :class="`text-bg-${meta.color}`">{{ meta.label }}</span>
        <span class="small text-secondary">{{ timeAgo(match.createdAt) }}</span>
      </div>

      <div class="row g-2 align-items-center">
        <div class="col">
          <RouterLink :to="`/items/${match.lostItemId}`" class="d-flex gap-2 align-items-center text-decoration-none text-body">
            <img v-if="match.lostPhoto" :src="imageUrl(match.lostPhoto, { width: 96, height: 96, crop: 'fill' })" class="rounded object-fit-cover" width="48" height="48" alt="" />
            <span v-else class="avatar bg-lost text-white" style="width: 48px; height: 48px"><i class="bi bi-question-lg"></i></span>
            <span class="min-w-0">
              <span class="d-block small text-lost fw-semibold">LOST</span>
              <span class="d-block text-truncate">{{ match.lostTitle }}</span>
            </span>
          </RouterLink>
        </div>
        <div class="col-auto text-secondary"><i class="bi bi-arrow-left-right"></i></div>
        <div class="col">
          <RouterLink :to="`/items/${match.foundItemId}`" class="d-flex gap-2 align-items-center text-decoration-none text-body">
            <img v-if="match.foundPhoto" :src="imageUrl(match.foundPhoto, { width: 96, height: 96, crop: 'fill' })" class="rounded object-fit-cover" width="48" height="48" alt="" />
            <span v-else class="avatar bg-found text-white" style="width: 48px; height: 48px"><i class="bi bi-check-lg"></i></span>
            <span class="min-w-0">
              <span class="d-block small text-found fw-semibold">FOUND</span>
              <span class="d-block text-truncate">{{ match.foundTitle }}</span>
            </span>
          </RouterLink>
        </div>
      </div>

      <div class="small text-secondary mt-2">
        <i class="bi bi-radar me-1"></i>{{ reasonLabel }}
        <span v-if="match.score != null" class="ms-2 badge text-bg-light border">Score {{ match.score }}</span>
      </div>
      <div v-if="match.handover?.location" class="small mt-2 p-2 rounded bg-primary-subtle">
        <i class="bi bi-calendar-check me-1"></i>Handover: <strong>{{ match.handover.location }}</strong>
        <span v-if="match.handover.when"> · {{ match.handover.when }}</span>
        <div v-if="match.handover.notes" class="text-secondary">{{ match.handover.notes }}</div>
      </div>

      <div class="d-flex flex-wrap gap-2 mt-3">
        <template v-if="match.status === 'pending'">
          <button class="btn btn-sm btn-success" @click="$emit('confirm', match)">
            <i class="bi bi-check2 me-1"></i>{{ perspective === 'lost' ? "That's mine" : 'Confirm match' }}
          </button>
          <button class="btn btn-sm btn-outline-secondary" @click="$emit('dismiss', match)">Not a match</button>
        </template>
        <template v-if="match.status === 'confirmed' && perspective === 'staff'">
          <button class="btn btn-sm btn-outline-primary" @click="$emit('handover', match)"><i class="bi bi-calendar-event me-1"></i>Schedule handover</button>
          <button class="btn btn-sm btn-success" @click="$emit('complete', match)"><i class="bi bi-bag-check me-1"></i>Mark handed over</button>
        </template>
        <button v-if="perspective === 'lost' && ['pending', 'confirmed'].includes(match.status)" class="btn btn-sm btn-success" @click="$emit('complete', match)">
          <i class="bi bi-bag-check me-1"></i>I got it back
        </button>
        <button v-if="perspective === 'found' && match.status === 'confirmed'" class="btn btn-sm btn-outline-success" @click="$emit('complete', match)">
          <i class="bi bi-bag-check me-1"></i>Returned to owner
        </button>
        <button v-if="perspective !== 'staff' && !['dismissed', 'completed'].includes(match.status)" class="btn btn-sm btn-outline-primary" @click="$emit('chat', match)">
          <i class="bi bi-chat-dots me-1"></i>Message {{ perspective === 'lost' ? 'finder' : 'owner' }}
        </button>
      </div>
    </div>
  </div>
</template>
