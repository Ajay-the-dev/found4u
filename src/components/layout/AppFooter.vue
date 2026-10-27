<script setup>
import BrandLogo from '@/components/common/BrandLogo.vue'
</script>

<template>
  <footer class="app-footer py-4 mt-5 d-print-none">
    <div class="container d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
      <span class="d-flex align-items-center gap-2">
        <span class="brand-mark" style="width: 1.4rem; height: 1.4rem; font-size: 0.7rem; border-radius: 0.4rem"><BrandLogo /></span>
        <span><strong class="text-body fw-semibold">Found4</strong> — reuniting people with their things.</span>
      </span>
      <span class="d-flex align-items-center gap-3">
        <RouterLink to="/help" class="link-secondary text-decoration-none"><i class="bi bi-question-circle me-1"></i>Help</RouterLink>
        <span>Map data © OpenStreetMap contributors</span>
      </span>
    </div>
  </footer>
</template>
