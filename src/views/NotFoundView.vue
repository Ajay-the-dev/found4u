<template>
  <div class="container py-5 text-center">
    <div v-reveal.stagger class="py-lg-5 mx-auto" style="max-width: 480px">
      <div class="nf-code text-gradient">404</div>
      <h1 class="h3 mb-2">This page seems to be lost too</h1>
      <p class="text-secondary mb-4">Maybe someone will report it found. Until then:</p>
      <div class="d-flex justify-content-center gap-2">
        <RouterLink to="/dashboard" class="btn btn-primary"><i class="bi bi-arrow-left me-1"></i>Back to dashboard</RouterLink>
        <RouterLink to="/items" class="btn btn-outline-secondary">Browse items</RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.nf-code { font-size: clamp(5rem, 14vw, 8rem); font-weight: 800; letter-spacing: -0.06em; line-height: 1; margin-bottom: 1rem; }
</style>
