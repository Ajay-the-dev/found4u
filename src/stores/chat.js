import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  limitToLast,
  writeBatch,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/services/firebase'
import { COL } from '@/utils/collections'
import { withId } from '@/utils/firestore'
import { useAuthStore } from './auth'

export const useChatStore = defineStore('chat', () => {
  const chats = ref([])
  const loading = ref(false)
  let boundUid
  let unsub = null

  const isUnread = (chat) => {
    const auth = useAuthStore()
    if (!chat.lastMessageAt || chat.lastSenderId === auth.uid) return false
    const seen = chat.lastRead?.[auth.uid]?.toMillis?.() ?? 0
    return chat.lastMessageAt.toMillis() > seen
  }
  /** When the current user deleted this chat for themselves, or null. */
  const clearedAt = (chat) => {
    const auth = useAuthStore()
    return chat.hiddenFor?.[auth.uid] ?? null
  }
  // A chat deleted by the user stays hidden until a newer message arrives.
  const isHidden = (chat) => {
    const cleared = clearedAt(chat)?.toMillis?.()
    if (cleared == null) return false
    return (chat.lastMessageAt?.toMillis?.() ?? 0) <= cleared
  }
  const visibleChats = computed(() => chats.value.filter((c) => !isHidden(c)))
  const unreadCount = computed(() => visibleChats.value.filter(isUnread).length)

  function bind(uid) {
    if (uid === boundUid) return
    unsub?.()
    unsub = null
    chats.value = []
    boundUid = uid
    if (!uid) return
    loading.value = true
    unsub = onSnapshot(
      query(collection(db, COL.chats), where('participants', 'array-contains', uid), orderBy('updatedAt', 'desc'), limit(100)),
      (snap) => {
        chats.value = snap.docs.map(withId)
        loading.value = false
      },
      (err) => {
        console.error('[chat] list listener', err)
        loading.value = false
      },
    )
  }

  /** Creates the chat document if it does not exist yet; ids are deterministic per context. */
  async function ensureChat({ id, kind, refId, title, participants, participantInfo, orgId = null }) {
    const ref = doc(db, COL.chats, id)
    const snap = await getDoc(ref)
    if (snap.exists()) return id
    const batch = writeBatch(db)
    batch.set(ref, {
      kind,
      refId,
      title,
      orgId,
      participants,
      participantInfo,
      lastMessage: '',
      lastMessageAt: null,
      lastSenderId: null,
      lastRead: {},
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    await batch.commit()
    return id
  }

  /** Opens a chat between the current user and the reporter of an item. */
  function openItemChat(item, { asStaffOf = null } = {}) {
    const auth = useAuthStore()
    const relation = item.type === 'found' ? 'Finder' : 'Owner'
    return ensureChat({
      id: `item_${item.id}_${auth.uid}`,
      kind: 'item',
      refId: item.id,
      orgId: item.orgId || null,
      title: `${item.type === 'lost' ? 'Lost' : 'Found'}: ${item.title}`,
      participants: [auth.uid, item.reporterId],
      participantInfo: {
        [auth.uid]: { name: auth.displayName, role: asStaffOf ? 'staff' : 'contact' },
        [item.reporterId]: { name: item.reporterName || relation, role: item.type === 'found' ? 'finder' : 'owner' },
      },
    })
  }

  /** Opens the shared chat between the lost-item owner and the finder of a match. */
  function openMatchChat(match) {
    return ensureChat({
      id: `match_${match.id}`,
      kind: 'match',
      refId: match.id,
      orgId: match.orgId || null,
      title: `Match: ${match.lostTitle}`,
      participants: [match.lostOwnerId, match.foundReporterId],
      participantInfo: {
        [match.lostOwnerId]: { name: 'Owner', role: 'owner' },
        [match.foundReporterId]: { name: 'Finder', role: 'finder' },
      },
    })
  }

  function watchChat(chatId, onData, onError) {
    return onSnapshot(doc(db, COL.chats, chatId), (snap) => onData(snap.exists() ? withId(snap) : null), onError)
  }

  function watchMessages(chatId, onData, onError, max = 300) {
    return onSnapshot(
      query(collection(db, COL.chats, chatId, COL.messages), orderBy('createdAt', 'asc'), limitToLast(max)),
      (snap) => onData(snap.docs.map(withId)),
      onError,
    )
  }

  async function sendMessage(chatId, { text = '', location = null }) {
    const auth = useAuthStore()
    const senderId = auth.uid
    const msgRef = doc(collection(db, COL.chats, chatId, COL.messages))
    const preview = location ? '📍 Shared a location' : text.slice(0, 140)
    const batch = writeBatch(db)
    batch.set(msgRef, {
      senderId,
      text: text.slice(0, 2000),
      location: location ? { lat: location.lat, lng: location.lng } : null,
      createdAt: serverTimestamp(),
    })
    batch.update(doc(db, COL.chats, chatId), {
      lastMessage: preview,
      lastMessageAt: serverTimestamp(),
      lastSenderId: senderId,
      [`lastRead.${senderId}`]: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    await batch.commit()
  }

  /** Deletes the conversation for the current user only; the other participant keeps it. */
  function deleteChat(chatId) {
    const auth = useAuthStore()
    return updateDoc(doc(db, COL.chats, chatId), {
      [`hiddenFor.${auth.uid}`]: serverTimestamp(),
      [`lastRead.${auth.uid}`]: serverTimestamp(),
    })
  }

  function markRead(chatId) {
    const auth = useAuthStore()
    if (!auth.uid) return Promise.resolve()
    return updateDoc(doc(db, COL.chats, chatId), { [`lastRead.${auth.uid}`]: serverTimestamp() }).catch(() => {})
  }

  return {
    chats,
    visibleChats,
    loading,
    unreadCount,
    isUnread,
    clearedAt,
    bind,
    ensureChat,
    openItemChat,
    openMatchChat,
    watchChat,
    watchMessages,
    sendMessage,
    deleteChat,
    markRead,
  }
})
