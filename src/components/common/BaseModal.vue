<script setup>
import { watch, onBeforeUnmount } from 'vue'

const props = defineProps({
  show: { type: Boolean, default: false },
  title: { type: String, default: '' },
  size: { type: String, default: '' }, // '', 'sm', 'lg', 'xl'
})
const emit = defineEmits(['close'])

function onKey(e) {
  if (e.key === 'Escape') emit('close')
}
watch(
  () => props.show,
  (open) => {
    document.body.classList.toggle('modal-open', open)
    if (open) window.addEventListener('keydown', onKey)
    else window.removeEventListener('keydown', onKey)
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  document.body.classList.remove('modal-open')
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <Teleport to="body">
    <template v-if="show">
      <div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true" @mousedown.self="emit('close')">
        <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable" :class="size && `modal-${size}`">
          <div class="modal-content border-0 shadow">
            <div class="modal-header">
              <h5 class="modal-title">{{ title }}</h5>
              <button type="button" class="btn-close" aria-label="Close" @click="emit('close')"></button>
            </div>
            <div class="modal-body"><slot /></div>
            <div v-if="$slots.footer" class="modal-footer"><slot name="footer" /></div>
          </div>
        </div>
      </div>
      <div class="modal-backdrop show"></div>
    </template>
  </Teleport>
</template>
