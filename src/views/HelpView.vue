<script setup>
import { computed, ref, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { HELP_GROUPS, HELP_TOPICS, HELP_FAQ } from '@/utils/help'
import { STATUS_META, MATCH_STATUS_META } from '@/utils/constants'
import HelpTopic from '@/components/help/HelpTopic.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import EmptyState from '@/components/common/EmptyState.vue'

const route = useRoute()
const search = ref('')

const STATUS_HELP = {
  open: 'Newly reported and looking for a match.',
  under_review: 'Staff are checking it. It still takes part in matching.',
  matched: 'A match was confirmed and the handover is pending.',
  claimed: 'Set by hand when the item has been claimed.',
  resolved: 'Case closed. The item is back with its owner.',
}
const MATCH_HELP = {
  pending: 'Suggested by Found4 or linked by staff. Nobody has decided yet.',
  confirmed: 'Agreed to be the same item. Arrange the handover.',
  completed: 'Returned. Both reports are now Resolved.',
  dismissed: 'Reviewed and found not to be the same item.',
}

const topicText = (t) =>
  [t.title, t.summary, ...t.steps.flatMap((s) => [s.title, s.text]), t.example.title, ...t.example.scenes.map((s) => s.text), ...(t.tips || [])]
    .join(' ')
    .toLowerCase()

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return q ? HELP_TOPICS.filter((t) => topicText(t).includes(q)) : HELP_TOPICS
})
const groups = computed(() =>
  HELP_GROUPS.map((g) => ({ ...g, topics: filtered.value.filter((t) => t.group === g.key) })).filter((g) => g.topics.length),
)

// The router's scrollBehavior always resets to the top, so in-page jumps scroll by hand.
function jump(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  history.replaceState(history.state, '', `#${id}`)
}

onMounted(async () => {
  if (!route.hash) return
  await nextTick()
  document.getElementById(route.hash.slice(1))?.scrollIntoView({ block: 'start' })
})
</script>

<template>
  <div class="container py-4">
    <header v-reveal class="page-header">
      <div class="eyebrow mb-1">Help centre</div>
      <h1>How Found4 works</h1>
      <p class="text-secondary mb-3" style="max-width: 640px">
        Every workflow, step by step, with a real-world example. Pick a topic or search for what you need.
      </p>
      <div class="position-relative" style="max-width: 420px">
        <i class="bi bi-search position-absolute top-50 translate-middle-y ms-3 text-secondary"></i>
        <input v-model="search" type="search" class="form-control ps-5" placeholder="Search help, e.g. “radius” or “invite”" aria-label="Search help" />
      </div>
    </header>

    <!-- Phone / tablet: horizontal topic chips -->
    <nav class="help-chips d-lg-none mb-3" aria-label="Help topics">
      <button v-for="t in filtered" :key="t.id" type="button" class="btn btn-sm btn-light" @click="jump(t.id)">
        <i class="bi me-1" :class="t.icon"></i>{{ t.title }}
      </button>
    </nav>

    <div class="row g-4">
      <aside class="col-lg-3 d-none d-lg-block">
        <nav class="help-nav" aria-label="Help topics">
          <div v-for="g in groups" :key="g.key" class="mb-3">
            <div class="eyebrow mb-1">{{ g.label }}</div>
            <button v-for="t in g.topics" :key="t.id" type="button" class="help-nav-link" @click="jump(t.id)">
              <i class="bi" :class="t.icon"></i>{{ t.title }}
            </button>
          </div>
          <div class="eyebrow mb-1">Reference</div>
          <button type="button" class="help-nav-link" @click="jump('statuses')"><i class="bi bi-tags"></i>Status glossary</button>
          <button type="button" class="help-nav-link" @click="jump('faq')"><i class="bi bi-patch-question"></i>FAQ</button>
        </nav>
      </aside>

      <div class="col-lg-9">
        <EmptyState v-if="!filtered.length" icon="bi-search" title="No help topics match your search" text="Try a different word, or browse the status glossary and FAQ below.">
          <button class="btn btn-sm btn-outline-secondary" @click="search = ''">Clear search</button>
        </EmptyState>

        <div v-for="g in groups" :key="g.key" class="mb-4">
          <h2 class="section-title text-secondary mb-3">{{ g.label }}</h2>
          <div class="d-flex flex-column gap-3">
            <HelpTopic v-for="t in g.topics" :key="t.id" :topic="t" />
          </div>
        </div>

        <section id="statuses" class="help-anchor card mb-4">
          <div class="card-body p-3 p-md-4">
            <h2 class="h5 mb-1">Status glossary</h2>
            <p class="text-secondary small mb-3">What the badges on reports and matches mean.</p>
            <div class="row g-4">
              <div class="col-md-6">
                <h3 class="section-title mb-2">Reports</h3>
                <dl class="mb-0">
                  <div v-for="(meta, key) in STATUS_META" :key="key" class="mb-2">
                    <dt><StatusBadge :status="key" /></dt>
                    <dd class="small text-secondary mb-0 mt-1">{{ STATUS_HELP[key] }}</dd>
                  </div>
                </dl>
              </div>
              <div class="col-md-6">
                <h3 class="section-title mb-2">Matches</h3>
                <dl class="mb-0">
                  <div v-for="(meta, key) in MATCH_STATUS_META" :key="key" class="mb-2">
                    <dt><span class="badge rounded-pill" :class="`text-bg-${meta.color}`">{{ meta.label }}</span></dt>
                    <dd class="small text-secondary mb-0 mt-1">{{ MATCH_HELP[key] }}</dd>
                  </div>
                </dl>
              </div>
            </div>
            <p class="small text-secondary mb-0 mt-3">Only <strong>Open</strong> and <strong>Under Review</strong> reports keep looking for matches.</p>
          </div>
        </section>

        <section id="faq" class="help-anchor card">
          <div class="card-body p-3 p-md-4">
            <h2 class="h5 mb-3">Frequently asked questions</h2>
            <details v-for="f in HELP_FAQ" :key="f.q" class="faq-item">
              <summary class="fw-semibold text-body">{{ f.q }}</summary>
              <p class="small text-secondary mb-0 mt-2">{{ f.a }}</p>
            </details>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.help-anchor { scroll-margin-top: 5.5rem; }

.help-chips { display: flex; gap: 0.5rem; overflow-x: auto; padding-bottom: 0.25rem; scrollbar-width: none; }
.help-chips::-webkit-scrollbar { display: none; }
.help-chips .btn { white-space: nowrap; flex-shrink: 0; }

.help-nav { position: sticky; top: 5.5rem; }
.help-nav-link {
  display: flex; align-items: center; gap: 0.6rem; width: 100%;
  padding: 0.4rem 0.6rem; border: 0; border-radius: var(--fi-radius-sm);
  background: none; color: var(--fi-ink-2); font-size: 0.875rem; text-align: start;
}
.help-nav-link i { color: var(--fi-muted); }
.help-nav-link:hover { background: var(--fi-sunken); color: var(--fi-ink); }

.faq-item { padding: 0.75rem 0; border-top: 1px solid var(--fi-line); }
.faq-item:first-of-type { border-top: 0; padding-top: 0; }
.faq-item summary { cursor: pointer; }
</style>
