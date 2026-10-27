<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { gsap, prefersReducedMotion } from '@/utils/motion'
import MistScene from '@/components/common/MistScene.vue'
import BrandLogo from '@/components/common/BrandLogo.vue'

defineProps({ title: { type: String, required: true }, subtitle: { type: String, default: '' } })

const root = ref(null)
let ctx

onMounted(() => {
  if (prefersReducedMotion()) return
  ctx = gsap.context(() => {
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .from('.auth-form > *', { y: 16, opacity: 0, duration: 0.6, stagger: 0.06 })
      .from('.auth-aside .quote', { y: 24, opacity: 0, duration: 0.8 }, 0.15)
      .from('.auth-aside .aside-chip', { y: 16, opacity: 0, scale: 0.96, duration: 0.6, stagger: 0.12 }, 0.35)
    gsap.to('.auth-aside .aside-chip', { y: -6, duration: 2.8, ease: 'sine.inOut', yoyo: true, repeat: -1, stagger: 0.6 })
  }, root.value)
})
onBeforeUnmount(() => ctx?.revert())
</script>

<template>
  <div ref="root" class="auth-layout min-vh-100 d-flex">
    <div class="flex-grow-1 d-flex flex-column px-3 px-sm-5 py-4" style="flex-basis: 50%">
      <RouterLink to="/" class="d-inline-flex align-items-center gap-2 fw-bold fs-5 text-decoration-none text-body" style="letter-spacing: -0.03em">
        <span class="brand-mark"><BrandLogo /></span>
        Found4
      </RouterLink>
      <div class="flex-grow-1 d-flex align-items-center justify-content-center py-5">
        <div class="auth-form w-100" style="max-width: 400px">
          <h1 class="auth-title mb-2">{{ title }}</h1>
          <p v-if="subtitle" class="text-secondary mb-4">{{ subtitle }}</p>
          <div><slot /></div>
          <div class="small text-secondary mt-4 text-center"><slot name="footer" /></div>
        </div>
      </div>
      <div class="small text-secondary">© Found4</div>
    </div>

    <aside class="auth-aside d-none d-lg-flex flex-column justify-content-between p-5 m-3 position-relative overflow-hidden" style="flex-basis: 50%">
      <MistScene fog class="aside-scene" />
      <div class="aside-shade" aria-hidden="true"></div>
      <div class="position-relative d-flex flex-column gap-3 align-items-start mt-4">
        <div class="aside-chip">
          <span class="chip-icon" style="background: rgba(255, 255, 255, 0.9); color: var(--fi-found)"><i class="bi bi-geo-alt-fill"></i></span>
          <div><div class="fw-semibold">Possible match nearby</div><div class="opacity-75 small">Black backpack · 180 m away</div></div>
        </div>
        <div class="aside-chip ms-5">
          <span class="chip-icon" style="background: rgba(255, 255, 255, 0.9); color: #b45309"><i class="bi bi-qr-code-scan"></i></span>
          <div><div class="fw-semibold">Laptop tag scanned</div><div class="opacity-75 small">Lecture Hall C · 2 min ago</div></div>
        </div>
      </div>
      <div class="quote position-relative">
        <h2 class="fw-bold text-white mb-3" style="font-size: 2.25rem; font-weight: 450 !important; letter-spacing: -0.035em; line-height: 1.12">Lost property, finally organized.</h2>
        <ul class="list-unstyled d-flex flex-column gap-2 mb-0" style="color: rgba(255, 255, 255, 0.85)">
          <li><i class="bi bi-check2-circle me-2"></i>Radius alerts the moment a match turns up</li>
          <li><i class="bi bi-check2-circle me-2"></i>QR tags that let finders reach you anonymously</li>
          <li><i class="bi bi-check2-circle me-2"></i>Private chat — no phone numbers exchanged</li>
        </ul>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.auth-layout { background: rgba(var(--fi-wash), 0.9); }
.auth-title { font-size: 1.75rem; font-weight: 700; letter-spacing: -0.035em; }
.auth-aside { border-radius: 1.75rem; color: #fff; isolation: isolate; }
.aside-scene { z-index: -2; }
.aside-shade { position: absolute; inset: 0; z-index: -1; background: linear-gradient(180deg, rgba(14, 26, 34, 0.05) 30%, rgba(14, 26, 34, 0.55)); }
.aside-chip {
  display: flex; align-items: center; gap: 0.85rem; padding: 0.85rem 1.1rem 0.85rem 0.85rem;
  border-radius: 1.5rem; background: linear-gradient(160deg, rgba(255, 255, 255, 0.22), rgba(42, 60, 72, 0.22)); border: 1px solid rgba(255, 255, 255, 0.28);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); font-size: 0.9rem;
}
.chip-icon { width: 2.25rem; height: 2.25rem; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; }
</style>
