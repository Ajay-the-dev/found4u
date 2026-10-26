<script setup>
defineProps({ title: { type: String, required: true }, subtitle: { type: String, default: '' } })
</script>

<template>
  <div class="hero min-vh-100 d-flex align-items-center py-5">
    <div class="container" style="max-width: 440px">
      <RouterLink to="/" class="d-flex align-items-center justify-content-center gap-2 fw-bold fs-4 text-decoration-none text-body mb-4">
        <span class="brand-mark d-inline-flex align-items-center justify-content-center rounded-3 bg-primary text-white" style="width: 2.4rem; height: 2.4rem"><i class="bi bi-search-heart"></i></span>
        FoundIt
      </RouterLink>
      <div class="card shadow-sm border-0 p-4">
        <h1 class="h4 mb-1">{{ title }}</h1>
        <p v-if="subtitle" class="text-secondary small mb-4">{{ subtitle }}</p>
        <slot />
      </div>
      <div class="text-center small mt-3"><slot name="footer" /></div>
    </div>
  </div>
</template>
