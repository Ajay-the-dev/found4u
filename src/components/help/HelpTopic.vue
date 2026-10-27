<script setup>
import { AUDIENCES } from '@/utils/help'

defineProps({ topic: { type: Object, required: true } })
</script>

<template>
  <section :id="topic.id" class="help-topic card">
    <div class="card-body p-3 p-md-4">
      <header class="d-flex align-items-start gap-3 mb-3">
        <span class="topic-icon rounded-3 flex-shrink-0" :class="topic.tone"><i class="bi" :class="topic.icon"></i></span>
        <div class="min-w-0 flex-grow-1">
          <h2 class="h5 mb-1">{{ topic.title }}</h2>
          <p class="text-secondary mb-2">{{ topic.summary }}</p>
          <div class="d-flex flex-wrap gap-1">
            <span v-for="a in topic.audience" :key="a" class="badge rounded-pill fw-medium" :class="AUDIENCES[a].tone">
              {{ AUDIENCES[a].label }}
            </span>
          </div>
        </div>
      </header>

      <div class="row g-3 g-lg-4">
        <div class="col-lg-6">
          <h3 class="section-title mb-2">How it works</h3>
          <ol class="help-steps list-unstyled mb-0">
            <li v-for="(s, i) in topic.steps" :key="s.title" class="d-flex gap-3">
              <span class="step-num flex-shrink-0">{{ i + 1 }}</span>
              <div>
                <div class="fw-semibold text-body">{{ s.title }}</div>
                <div class="small text-secondary">{{ s.text }}</div>
              </div>
            </li>
          </ol>
        </div>

        <div class="col-lg-6">
          <div class="help-example h-100">
            <div class="eyebrow mb-1"><i class="bi bi-lightbulb me-1"></i>Example</div>
            <h3 class="section-title mb-3">{{ topic.example.title }}</h3>
            <ul class="list-unstyled mb-3">
              <li v-for="(scene, i) in topic.example.scenes" :key="i" class="scene d-flex gap-2">
                <span class="badge rounded-pill fw-semibold flex-shrink-0 align-self-start" :class="scene.tone">{{ scene.who }}</span>
                <span class="small">{{ scene.text }}</span>
              </li>
            </ul>
            <div class="outcome small"><i class="bi bi-check2-circle me-1"></i>{{ topic.example.outcome }}</div>
          </div>
        </div>
      </div>

      <div v-if="topic.tips?.length || topic.cta" class="d-flex flex-column flex-md-row gap-3 justify-content-between align-items-md-end mt-3 pt-3 border-top">
        <ul v-if="topic.tips?.length" class="help-tips list-unstyled small text-secondary mb-0">
          <li v-for="tip in topic.tips" :key="tip"><i class="bi bi-info-circle me-2 text-primary"></i>{{ tip }}</li>
        </ul>
        <RouterLink v-if="topic.cta" :to="topic.cta.to" class="btn btn-outline-primary btn-sm flex-shrink-0">
          {{ topic.cta.label }}<i class="bi bi-arrow-right ms-1"></i>
        </RouterLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
.help-topic { scroll-margin-top: 5.5rem; }
.topic-icon { width: 2.75rem; height: 2.75rem; display: inline-flex; align-items: center; justify-content: center; font-size: 1.25rem; }

.help-steps li + li { margin-top: 0.85rem; }
.step-num {
  width: 1.6rem; height: 1.6rem; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 0.75rem; font-weight: 700;
  color: var(--fi-primary); background: var(--bs-primary-bg-subtle); border: 1px solid var(--bs-primary-border-subtle);
}

.help-example { background: var(--fi-sunken); border: 1px solid var(--fi-line); border-radius: var(--fi-radius); padding: 1rem 1.1rem; }
.scene + .scene { margin-top: 0.6rem; }
.outcome { color: var(--fi-found); font-weight: 550; }

.help-tips li + li { margin-top: 0.35rem; }
</style>
