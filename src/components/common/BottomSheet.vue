<script setup>
import { ref, watch, nextTick, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { gsap, prefersReducedMotion } from '@/utils/motion'

/* Mobile bottom sheet: slides up with GSAP, closes on backdrop tap, Escape, swipe down or navigation. */
const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
})
const emit = defineEmits(['close'])

const visible = ref(false)
const panel = ref(null)
const backdrop = ref(null)
const route = useRoute()

watch(
  () => props.open,
  async (open) => {
    if (open) {
      visible.value = true
      document.body.style.overflow = 'hidden'
      await nextTick()
      if (prefersReducedMotion()) return
      gsap.fromTo(backdrop.value, { opacity: 0 }, { opacity: 1, duration: 0.25 })
      gsap.fromTo(panel.value, { yPercent: 100 }, { yPercent: 0, duration: 0.45, ease: 'expo.out' })
      gsap.from(panel.value.querySelectorAll('.sheet-body > *'), { y: 12, opacity: 0, duration: 0.35, stagger: 0.04, delay: 0.08, ease: 'power2.out' })
    } else if (visible.value) {
      document.body.style.overflow = ''
      if (prefersReducedMotion()) return (visible.value = false)
      gsap.to(backdrop.value, { opacity: 0, duration: 0.2 })
      gsap.to(panel.value, { yPercent: 100, duration: 0.25, ease: 'power2.in', onComplete: () => (visible.value = false) })
    }
  },
)
watch(() => route.fullPath, () => props.open && emit('close'))

const onKey = (e) => e.key === 'Escape' && props.open && emit('close')
watch(() => props.open, (open) => (open ? document.addEventListener('keydown', onKey) : document.removeEventListener('keydown', onKey)))
onBeforeUnmount(() => {
  document.body.style.overflow = ''
  document.removeEventListener('keydown', onKey)
})

// Swipe down on the handle/header to dismiss.
let startY = null
function onPointerDown(e) {
  startY = e.clientY
  panel.value.setPointerCapture?.(e.pointerId)
}
function onPointerMove(e) {
  if (startY == null) return
  gsap.set(panel.value, { y: Math.max(0, e.clientY - startY) })
}
function onPointerUp(e) {
  if (startY == null) return
  const dy = e.clientY - startY
  startY = null
  if (dy > 80) {
    gsap.set(panel.value, { y: 0 })
    emit('close')
  } else gsap.to(panel.value, { y: 0, duration: 0.25, ease: 'power2.out' })
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="sheet-root" role="dialog" aria-modal="true" :aria-label="title">
      <div ref="backdrop" class="sheet-backdrop" @click="emit('close')"></div>
      <div ref="panel" class="sheet-panel">
        <div class="sheet-grab" @pointerdown="onPointerDown" @pointermove="onPointerMove" @pointerup="onPointerUp" @pointercancel="onPointerUp">
          <span class="sheet-handle"></span>
          <div v-if="title" class="sheet-title">{{ title }}</div>
        </div>
        <div class="sheet-body"><slot /></div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.sheet-root { position: fixed; inset: 0; z-index: 1080; }
.sheet-backdrop { position: absolute; inset: 0; background: rgba(11, 13, 23, 0.42); backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px); }
.sheet-panel {
  position: absolute; left: 0; right: 0; bottom: 0; max-height: 88dvh; overflow-y: auto;
  background: var(--fi-surface); border-radius: 1.25rem 1.25rem 0 0;
  box-shadow: 0 -12px 40px -8px rgba(16, 34, 44, 0.25);
  padding-bottom: calc(0.75rem + env(safe-area-inset-bottom));
}
.sheet-grab { touch-action: none; padding: 0.6rem 1.25rem 0.25rem; cursor: grab; }
.sheet-handle { display: block; width: 2.5rem; height: 0.3rem; border-radius: 999px; background: var(--fi-line-strong); margin: 0 auto 0.6rem; }
.sheet-title { font-weight: 650; color: var(--fi-ink); font-size: 1rem; letter-spacing: -0.02em; }
.sheet-body { padding: 0.25rem 0.75rem 0; }
</style>
