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
    ui.toast('Lost item reported', 'success', {
      body: form.location ? "We'll alert you when something similar turns up nearby." : "We'll alert you when a similar item is logged.",
    })
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
    <h1 class="h3 mb-1"><i class="bi bi-question-circle text-lost me-2"></i>Report a lost item</h1>
    <p class="text-secondary mb-4">The more detail you add, the better our match engine and the staff can help.</p>
    <ItemForm type="lost" :submitting="submitting" @submit="submit" />
  </div>
</template>
