import { defineStore } from 'pinia'
import { ref } from 'vue'
import { friendlyError } from '@/utils/errors'

let nextId = 1

/** App-wide toasts and confirmation dialog. */
export const useUiStore = defineStore('ui', () => {
  const toasts = ref([])
  const confirmState = ref(null)

  function toast(title, variant = 'success', { body = '', link = null, icon = null, timeout = 5000 } = {}) {
    const id = nextId++
    toasts.value.push({ id, title, body, variant, link, icon })
    if (timeout) setTimeout(() => dismiss(id), timeout)
    return id
  }

  const error = (err, fallback) => toast(fallback || 'Something went wrong', 'danger', { body: friendlyError(err), timeout: 8000 })

  function dismiss(id) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  /** Resolves to true/false. `confirm({ title, message, confirmText, variant })` */
  function confirm(options) {
    return new Promise((resolve) => {
      confirmState.value = {
        title: 'Are you sure?',
        message: '',
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        variant: 'primary',
        ...options,
        resolve,
      }
    })
  }

  function settleConfirm(result) {
    confirmState.value?.resolve(result)
    confirmState.value = null
  }

  return { toasts, confirmState, toast, error, dismiss, confirm, settleConfirm }
})
