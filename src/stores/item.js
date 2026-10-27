import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  arrayUnion,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/services/firebase'
import { COL } from '@/utils/collections'
import { geohashForLocation } from '@/utils/geo'
import { withId, sortByTimeDesc } from '@/utils/firestore'
import { ACTIVE_STATUSES, DEFAULT_ALERT_RADIUS } from '@/utils/constants'
import { useAuthStore } from './auth'

export const useItemStore = defineStore('item', () => {
  const myItems = ref([])
  const myMatches = ref([])
  const mineLoading = ref(false)

  let boundUid
  let unsubs = []

  const myActiveLost = computed(() =>
    myItems.value.filter((i) => i.type === 'lost' && ACTIVE_STATUSES.includes(i.status)),
  )
  const myPendingMatches = computed(() => myMatches.value.filter((m) => m.status === 'pending'))

  // ───────────── session binding ─────────────
  function bindMine(uid) {
    if (uid === boundUid) return
    unsubs.forEach((u) => u())
    unsubs = []
    myItems.value = []
    myMatches.value = []
    boundUid = uid
    if (!uid) return

    mineLoading.value = true
    unsubs.push(
      onSnapshot(
        query(collection(db, COL.items), where('reporterId', '==', uid), orderBy('createdAt', 'desc'), limit(100)),
        (snap) => {
          myItems.value = snap.docs.map(withId)
          mineLoading.value = false
        },
        (err) => {
          console.error('[items] my items', err)
          mineLoading.value = false
        },
      ),
      onSnapshot(
        query(collection(db, COL.matches), where('participants', 'array-contains', uid), limit(100)),
        (snap) => (myMatches.value = snap.docs.map(withId).sort(sortByTimeDesc('createdAt'))),
        (err) => console.error('[items] my matches', err),
      ),
    )
  }

  // ───────────── queries ─────────────
  /** Live feed of items in one scope: an organization, or the public pool (`orgId = null`). */
  function watchFeed(orgId, onData, onError, max = 150) {
    return onSnapshot(
      query(collection(db, COL.items), where('orgId', '==', orgId || null), orderBy('createdAt', 'desc'), limit(max)),
      (snap) => onData(snap.docs.map(withId)),
      onError,
    )
  }

  function watchItem(id, onData, onError) {
    return onSnapshot(doc(db, COL.items, id), (snap) => onData(snap.exists() ? withId(snap) : null), onError)
  }

  function watchOrgMatches(orgId, onData, onError) {
    return onSnapshot(
      query(collection(db, COL.matches), where('orgId', '==', orgId), orderBy('createdAt', 'desc'), limit(200)),
      (snap) => onData(snap.docs.map(withId)),
      onError,
    )
  }

  // ───────────── mutations ─────────────
  async function createItem(form) {
    const auth = useAuthStore()
    const location = form.location
      ? { lat: form.location.lat, lng: form.location.lng, address: form.location.address || '' }
      : null

    const data = {
      type: form.type,
      title: form.title.trim(),
      description: form.description?.trim() || '',
      category: form.category,
      photos: form.photos || [],
      orgId: form.orgId || null,
      reporterId: auth.uid,
      reporterName: auth.displayName,
      status: 'open',
      location,
      locationKnown: !!location,
      geohash: location ? geohashForLocation([location.lat, location.lng]) : null,
      statusHistory: [{ status: 'open', by: auth.uid, byName: auth.displayName, at: Timestamp.now(), note: 'Reported' }],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      updatedBy: auth.uid,
    }

    if (form.type === 'lost') {
      Object.assign(data, {
        dateFrom: form.dateFrom,
        dateTo: form.dateTo || form.dateFrom,
        areasVisited: location ? '' : form.areasVisited?.trim() || '',
        alertRadiusMeters: Number(form.alertRadiusMeters) || DEFAULT_ALERT_RADIUS,
      })
    } else {
      Object.assign(data, {
        dateFound: form.dateFound,
        currentLocation: form.currentLocation?.trim() || '',
        // Set when reported via "I found this" on a lost report; the match engine links them.
        forLostItemId: form.forLostItemId || null,
      })
    }

    const ref = await addDoc(collection(db, COL.items), data)
    return ref.id
  }

  function updateItem(id, data) {
    const auth = useAuthStore()
    return updateDoc(doc(db, COL.items, id), { ...data, updatedAt: serverTimestamp(), updatedBy: auth.uid })
  }

  function updateStatus(id, status, note = '') {
    const auth = useAuthStore()
    return updateDoc(doc(db, COL.items, id), {
      status,
      updatedAt: serverTimestamp(),
      updatedBy: auth.uid,
      statusHistory: arrayUnion({ status, by: auth.uid, byName: auth.displayName, at: Timestamp.now(), note }),
    })
  }

  function deleteItem(id) {
    return deleteDoc(doc(db, COL.items, id))
  }

  /** Staff-created match between two items — notifications are sent by the onMatchCreated function. */
  async function createManualMatch(lost, found, distanceMeters = null) {
    const auth = useAuthStore()
    const matchId = `${lost.id}_${found.id}`
    await setDoc(doc(db, COL.matches, matchId), {
      lostItemId: lost.id,
      foundItemId: found.id,
      lostOwnerId: lost.reporterId,
      foundReporterId: found.reporterId,
      participants: [lost.reporterId, found.reporterId],
      orgId: lost.orgId || found.orgId,
      category: lost.category,
      distanceMeters,
      score: null,
      reason: 'manual',
      status: 'pending',
      lostTitle: lost.title,
      foundTitle: found.title,
      lostPhoto: lost.photos?.[0]?.url || null,
      foundPhoto: found.photos?.[0]?.url || null,
      createdBy: auth.uid,
      createdAt: serverTimestamp(),
    })
    return matchId
  }

  function updateMatch(matchId, data) {
    const auth = useAuthStore()
    return updateDoc(doc(db, COL.matches, matchId), { ...data, updatedAt: serverTimestamp(), updatedBy: auth.uid })
  }

  return {
    myItems,
    myMatches,
    mineLoading,
    myActiveLost,
    myPendingMatches,
    bindMine,
    watchFeed,
    watchItem,
    watchOrgMatches,
    createItem,
    updateItem,
    updateStatus,
    deleteItem,
    createManualMatch,
    updateMatch,
  }
})
