<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useItemStore } from '@/stores/item'
import { useUiStore } from '@/stores/ui'
import { CATEGORY_MAP } from '@/utils/constants'
import ItemForm from '@/components/items/ItemForm.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import LostItemPicker from '@/components/items/LostItemPicker.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const items = useItemStore()
const ui = useUiStore()
const submitting = ref(false)

// "I found this" from a lost report: /report/found?lost=<itemId>
const lostId = computed(() => (typeof route.query.lost === 'string' ? route.query.lost : null))
const lostItem = ref(null)
const loadingLost = ref(!!lostId.value)
let unsub = null

watch(
  lostId,
  (id) => {
    unsub?.()
    lostItem.value = null
    if (!id) return (loadingLost.value = false)
    loadingLost.value = true
    unsub = items.watchItem(
      id,
      (data) => {
        // Only link to someone else's still-open lost report.
        lostItem.value = data?.type === 'lost' && data.reporterId !== auth.uid ? data : null
        loadingLost.value = false
      },
      () => (loadingLost.value = false),
    )
  },
  { immediate: true },
)
onBeforeUnmount(() => unsub?.())

// Step 1 lets the finder pick a nearby lost report; skipped when arriving with ?lost=.
const step = ref(lostId.value ? 'form' : 'pick')
const finderPosition = ref(null)

function pickLost(item, position) {
  finderPosition.value = position
  step.value = 'form'
  router.replace({ query: { ...route.query, lost: item.id } })
}
function skipPicker(position) {
  finderPosition.value = position
  step.value = 'form'
}
function backToPicker() {
  step.value = 'pick'
  if (lostId.value) router.replace({ query: { ...route.query, lost: undefined } })
}

const initial = computed(() => ({
  ...(finderPosition.value ? { location: { ...finderPosition.value, address: '' } } : {}),
  ...(lostItem.value
    ? { title: lostItem.value.title, category: lostItem.value.category, orgId: lostItem.value.orgId || null, forLostItemId: lostItem.value.id }
    : {}),
}))

async function submit(form) {
  submitting.value = true
  try {
    const id = await items.createItem(form)
    ui.toast('Thank you for logging it!', 'success', {
      body: lostItem.value ? `We've let the owner of “${lostItem.value.title}” know.` : 'Anyone who reported a similar item nearby will be alerted.',
    })
    router.push(`/items/${id}`)
  } catch (err) {
    ui.error(err, 'Could not save your report')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="container py-4" style="max-width: 880px">
    <h1 class="h3 mb-1"><i class="bi bi-box2-heart text-found me-2"></i>Log a found item</h1>
    <p class="text-secondary mb-3">Pin where you found it. Nearby owners who reported a similar item get alerted right away.</p>

    <ol class="steps list-unstyled d-flex gap-2 mb-4 small">
      <li :class="{ active: step === 'pick', done: step === 'form' }"><span>1</span>Check lost reports</li>
      <li :class="{ active: step === 'form' }"><span>2</span>Describe what you found</li>
    </ol>

    <LostItemPicker v-if="step === 'pick'" @pick="pickLost" @skip="skipPicker" />

    <LoadingSpinner v-else-if="loadingLost" label="Loading the lost report…" />
    <template v-else>
      <button type="button" class="btn btn-sm btn-link px-0 mb-2" @click="backToPicker"><i class="bi bi-arrow-left me-1"></i>Back to nearby lost reports</button>
      <div v-if="lostItem" class="alert alert-success d-flex align-items-center gap-3 mb-3">
        <span class="stat-icon tone-found rounded-3 d-inline-flex align-items-center justify-content-center flex-shrink-0" style="width: 2.25rem; height: 2.25rem">
          <i class="bi" :class="(CATEGORY_MAP[lostItem.category] || CATEGORY_MAP.other).icon"></i>
        </span>
        <div class="min-w-0">
          <div class="fw-semibold">You're reporting that you found “{{ lostItem.title }}”</div>
          <div class="small">The owner ({{ lostItem.reporterName }}) is notified as soon as you submit. Add a photo and where you found it.</div>
        </div>
        <RouterLink :to="`/items/${lostItem.id}`" class="btn btn-sm btn-outline-success ms-auto text-nowrap">View report</RouterLink>
      </div>
      <div v-else-if="lostId" class="alert alert-warning small mb-3">That lost report is no longer available, but you can still log what you found.</div>

      <ItemForm :key="`${lostItem?.id || 'new'}-${finderPosition ? 'pos' : 'nopos'}`" type="found" :initial="initial" :submitting="submitting" @submit="submit" />
    </template>
  </div>
</template>

<style scoped>
.steps li { display: inline-flex; align-items: center; gap: 0.45rem; padding: 0.35rem 0.75rem 0.35rem 0.4rem; border-radius: 999px; background: var(--fi-sunken); color: var(--fi-muted); font-weight: 550; }
.steps li span { width: 1.35rem; height: 1.35rem; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; background: var(--fi-surface); font-size: 0.72rem; box-shadow: var(--fi-shadow-xs); }
.steps li.active { background: rgba(var(--fi-primary-rgb), 0.1); color: var(--fi-primary-700); }
.steps li.active span { background: var(--fi-primary); color: #fff; }
.steps li.done span { background: var(--fi-found); color: #fff; }
@media (max-width: 767.98px) {
  .steps li { flex: 1; font-size: 0.75rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .steps li span { flex-shrink: 0; }
}
</style>
