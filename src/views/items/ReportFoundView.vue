<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useItemStore } from '@/stores/item'
import { useUiStore } from '@/stores/ui'
import ItemForm from '@/components/items/ItemForm.vue'

const router = useRouter()
const items = useItemStore()
const ui = useUiStore()
const submitting = ref(false)

async function submit(form) {
  submitting.value = true
  try {
    const id = await items.createItem(form)
    ui.toast('Thank you for logging it!', 'success', { body: 'Anyone who reported a similar item nearby will be alerted.' })
    router.push(`/items/${id}`)
  } catch (err) {
    ui.error(err, 'Could not save your report')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="container py-4" style="max-width: 880px">
    <h1 class="h3 mb-1"><i class="bi bi-box2-heart text-found me-2"></i>Log a found item</h1>
    <p class="text-secondary mb-4">Pin where you found it. Nearby owners who reported a similar item get alerted right away.</p>
    <ItemForm type="found" :submitting="submitting" @submit="submit" />
  </div>
</template>
