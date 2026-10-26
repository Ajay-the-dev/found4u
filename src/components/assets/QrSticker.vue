<script setup>
import { ref, computed, watch } from 'vue'
import QRCode from 'qrcode'

const props = defineProps({
  assetId: { type: String, required: true },
  name: { type: String, default: '' },
  orgName: { type: String, default: '' },
  size: { type: String, default: 'md' }, // 'sm' | 'md' | 'lg'
  showName: { type: Boolean, default: true },
})

const PX = { sm: 120, md: 180, lg: 260 }
const dataUrl = ref('')
const scanUrl = computed(() => `${window.location.origin}/scan/${props.assetId}`)

watch(
  () => [props.assetId, props.size],
  async () => {
    // Render at 3× for crisp printing.
    dataUrl.value = await QRCode.toDataURL(scanUrl.value, {
      errorCorrectionLevel: 'Q',
      margin: 1,
      width: PX[props.size] * 3,
      color: { dark: '#111827', light: '#ffffff' },
    })
  },
  { immediate: true },
)

defineExpose({ dataUrl, scanUrl })
</script>

<template>
  <div class="qr-sticker" :style="{ width: `${PX[size] + 24}px` }">
    <div class="qr-title small text-uppercase">If found, scan me</div>
    <img v-if="dataUrl" :src="dataUrl" :width="PX[size]" :height="PX[size]" :alt="`QR code for ${assetId}`" class="d-block mx-auto my-1" />
    <div v-if="showName && name" class="small fw-semibold text-truncate">{{ name }}</div>
    <div class="qr-id small">{{ assetId }}</div>
    <div class="text-secondary" style="font-size: 0.65rem">
      <i class="bi bi-search-heart"></i> FoundIt<span v-if="orgName"> · {{ orgName }}</span> · reward-friendly, owner stays private
    </div>
  </div>
</template>
