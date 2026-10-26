<script setup>
import { computed } from 'vue'
import { useUiStore } from '@/stores/ui'
import BaseModal from './BaseModal.vue'

const ui = useUiStore()
const state = computed(() => ui.confirmState)
</script>

<template>
  <BaseModal :show="!!state" :title="state?.title" size="sm" @close="ui.settleConfirm(false)">
    <p class="mb-0">{{ state?.message }}</p>
    <template #footer>
      <button class="btn btn-light" @click="ui.settleConfirm(false)">{{ state?.cancelText }}</button>
      <button class="btn" :class="`btn-${state?.variant}`" @click="ui.settleConfirm(true)">{{ state?.confirmText }}</button>
    </template>
  </BaseModal>
</template>
