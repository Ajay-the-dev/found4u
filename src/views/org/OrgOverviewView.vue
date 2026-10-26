<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useOrgStore } from '@/stores/org'
import { useItemStore } from '@/stores/item'
import { useUiStore } from '@/stores/ui'
import { ORG_TYPES, ROLES, ACTIVE_STATUSES } from '@/utils/constants'
import { atLeast } from '@/utils/permissions'
import { formatDistance } from '@/utils/geo'
import RoleBadge from '@/components/org/RoleBadge.vue'
import ItemCard from '@/components/items/ItemCard.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

const route = useRoute()
const router = useRouter()
const org = useOrgStore()
const itemStore = useItemStore()
const ui = useUiStore()

const orgId = computed(() => route.params.orgId)
const info = computed(() => org.myOrgs.find((o) => o.id === orgId.value))
const role = computed(() => org.roleIn(orgId.value))
const typeMeta = computed(() => ORG_TYPES.find((t) => t.value === info.value?.type) || ORG_TYPES.at(-1))

const items = ref([])
const loading = ref(true)
let unsub = null
watch(
  orgId,
  (id) => {
    unsub?.()
    loading.value = true
    unsub = itemStore.watchFeed(id, (list) => {
      items.value = list
      loading.value = false
    }, () => (loading.value = false))
  },
  { immediate: true },
)
onBeforeUnmount(() => unsub?.())

const stats = computed(() => ({
  lost: items.value.filter((i) => i.type === 'lost' && ACTIVE_STATUSES.includes(i.status)).length,
  found: items.value.filter((i) => i.type === 'found' && ACTIVE_STATUSES.includes(i.status)).length,
  resolved: items.value.filter((i) => ['claimed', 'resolved'].includes(i.status)).length,
}))

async function leave() {
  const ok = await ui.confirm({ title: `Leave ${info.value.name}?`, message: "You'll lose access to its items and tags until you're invited again.", confirmText: 'Leave', variant: 'danger' })
  if (!ok) return
  try {
    await org.leaveOrg(orgId.value)
    ui.toast(`You left ${info.value?.name || 'the organization'}`)
    router.replace('/orgs')
  } catch (err) {
    ui.error(err, 'Could not leave organization')
  }
}
</script>

<template>
  <div class="container py-4">
    <LoadingSpinner v-if="!info" />
    <template v-else>
      <div class="card mb-4">
        <div class="card-body d-flex flex-wrap gap-3 align-items-center">
          <span class="stat-icon tone-primary" style="width: 3.5rem; height: 3.5rem; font-size: 1.6rem"><i class="bi" :class="typeMeta.icon"></i></span>
          <div class="flex-grow-1 min-w-0">
            <h1 class="h4 mb-1">{{ info.name }}</h1>
            <div class="small text-secondary">
              {{ typeMeta.label }} · alert radius {{ formatDistance(info.settings?.alertRadiusMeters) }} · you are <RoleBadge :role="role" />
            </div>
            <p v-if="info.description" class="small mb-0 mt-2">{{ info.description }}</p>
          </div>
          <div class="d-flex flex-wrap gap-2">
            <RouterLink v-if="atLeast(role, 'staff')" :to="`/orgs/${orgId}/command`" class="btn btn-primary"><i class="bi bi-broadcast me-1"></i>Command center</RouterLink>
            <RouterLink v-if="atLeast(role, 'admin')" :to="`/orgs/${orgId}/members`" class="btn btn-outline-secondary"><i class="bi bi-people me-1"></i>Members</RouterLink>
            <RouterLink v-if="atLeast(role, 'admin')" :to="`/orgs/${orgId}/settings`" class="btn btn-outline-secondary"><i class="bi bi-gear"></i></RouterLink>
            <button v-if="role !== 'owner'" class="btn btn-outline-danger" @click="leave"><i class="bi bi-box-arrow-left me-1"></i>Leave</button>
          </div>
        </div>
      </div>

      <div class="row g-3 mb-4">
        <div class="col-4"><div class="card text-center p-3"><div class="h3 mb-0 text-lost">{{ stats.lost }}</div><div class="small text-secondary">Open lost</div></div></div>
        <div class="col-4"><div class="card text-center p-3"><div class="h3 mb-0 text-found">{{ stats.found }}</div><div class="small text-secondary">Open found</div></div></div>
        <div class="col-4"><div class="card text-center p-3"><div class="h3 mb-0 text-primary">{{ stats.resolved }}</div><div class="small text-secondary">Returned</div></div></div>
      </div>

      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <h2 class="h5 mb-0">Recent reports</h2>
        <div class="d-flex gap-2">
          <RouterLink to="/report/lost" class="btn btn-sm btn-outline-danger">Report lost</RouterLink>
          <RouterLink to="/report/found" class="btn btn-sm btn-success">Log found</RouterLink>
        </div>
      </div>
      <LoadingSpinner v-if="loading" />
      <div v-else-if="items.length" class="row g-3">
        <div v-for="item in items.slice(0, 12)" :key="item.id" class="col-sm-6 col-lg-4 col-xl-3"><ItemCard :item="item" /></div>
      </div>
      <div v-else class="card"><EmptyState icon="bi-inbox" title="No reports yet" :text="ROLES[role]?.description" /></div>
    </template>
  </div>
</template>
