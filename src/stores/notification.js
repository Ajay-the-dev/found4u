import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/services/firebase'
import { COL } from '@/utils/collections'
import { withId } from '@/utils/firestore'
import { useUiStore } from './ui'

export const NOTIFICATION_ICONS = {
  match: 'bi-geo-alt-fill',
  scan: 'bi-qr-code-scan',
  status: 'bi-arrow-repeat',
  invite: 'bi-envelope-paper',
  message: 'bi-chat-dots',
  default: 'bi-bell',
}

export const useNotificationStore = defineStore('notification', () => {
  const items = ref([])
  const loading = ref(false)
  let boundUid
  let unsub = null

  const unreadCount = computed(() => items.value.filter((n) => !n.read).length)
  const latest = computed(() => items.value.slice(0, 6))

  function bind(uid) {
    if (uid === boundUid) return
    unsub?.()
    unsub = null
    items.value = []
    boundUid = uid
    if (!uid) return

    loading.value = true
    let firstSnapshot = true
    unsub = onSnapshot(
      query(collection(db, COL.notifications), where('userId', '==', uid), orderBy('createdAt', 'desc'), limit(100)),
      (snap) => {
        // Surface brand-new alerts as toasts; skip the initial backlog.
        if (!firstSnapshot) {
          snap.docChanges()
            .filter((c) => c.type === 'added' && !c.doc.data().read)
            .forEach((c) => {
              const n = c.doc.data()
              useUiStore().toast(n.title, 'primary', { body: n.body, link: n.link, icon: NOTIFICATION_ICONS[n.type] })
            })
        }
        firstSnapshot = false
        items.value = snap.docs.map(withId)
        loading.value = false
      },
      (err) => {
        console.error('[notifications] listener', err)
        loading.value = false
      },
    )
  }

  function markRead(id) {
    return updateDoc(doc(db, COL.notifications, id), { read: true, readAt: serverTimestamp() })
  }

  async function markAllRead() {
    const unread = items.value.filter((n) => !n.read)
    for (let i = 0; i < unread.length; i += 400) {
      const batch = writeBatch(db)
      unread.slice(i, i + 400).forEach((n) =>
        batch.update(doc(db, COL.notifications, n.id), { read: true, readAt: serverTimestamp() }),
      )
      await batch.commit()
    }
  }

  function remove(id) {
    return deleteDoc(doc(db, COL.notifications, id))
  }

  return { items, loading, unreadCount, latest, bind, markRead, markAllRead, remove }
})
