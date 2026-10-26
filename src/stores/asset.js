import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  collection,
  doc,
  getDoc,
  addDoc,
  writeBatch,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/services/firebase'
import { COL } from '@/utils/collections'
import { generateAssetId } from '@/utils/ids'
import { withId } from '@/utils/firestore'
import { useAuthStore } from './auth'
import { useChatStore } from './chat'

/** Fields copied to the world-readable `publicAssets` projection. Nothing personal goes here. */
function publicProjection(asset) {
  return {
    name: asset.name,
    category: asset.category,
    publicMessage: asset.publicMessage || '',
    photo: asset.photo || null,
    reportedLost: asset.status === 'lost',
    active: asset.active !== false,
    orgId: asset.orgId || null,
    updatedAt: serverTimestamp(),
  }
}

export const useAssetStore = defineStore('asset', () => {
  const lastScanChatId = ref(null)

  // ───────────── owner side ─────────────
  function watchMyAssets(uid, onData, onError) {
    return onSnapshot(
      query(collection(db, COL.assets), where('ownerId', '==', uid), orderBy('createdAt', 'desc'), limit(200)),
      (snap) => onData(snap.docs.map(withId)),
      onError,
    )
  }

  function watchOrgAssets(orgId, onData, onError) {
    return onSnapshot(
      query(collection(db, COL.assets), where('orgId', '==', orgId), orderBy('createdAt', 'desc'), limit(300)),
      (snap) => onData(snap.docs.map(withId)),
      onError,
    )
  }

  function watchAsset(id, onData, onError) {
    return onSnapshot(doc(db, COL.assets, id), (snap) => onData(snap.exists() ? withId(snap) : null), onError)
  }

  function watchScanReports(assetId, onData, onError) {
    const auth = useAuthStore()
    return onSnapshot(
      query(
        collection(db, COL.scanReports),
        where('ownerId', '==', auth.uid),
        where('assetId', '==', assetId),
        orderBy('createdAt', 'desc'),
        limit(100),
      ),
      (snap) => onData(snap.docs.map(withId)),
      onError,
    )
  }

  async function createAsset(form) {
    const auth = useAuthStore()
    const id = generateAssetId()
    const asset = {
      name: form.name.trim(),
      category: form.category,
      description: form.description?.trim() || '',
      serialNumber: form.serialNumber?.trim() || '',
      publicMessage: form.publicMessage?.trim() || '',
      photo: form.photo || null,
      orgId: form.orgId || null,
      ownerId: auth.uid,
      ownerName: auth.displayName,
      status: 'active',
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
    const batch = writeBatch(db)
    batch.set(doc(db, COL.assets, id), asset)
    batch.set(doc(db, COL.publicAssets, id), { ...publicProjection(asset), ownerId: auth.uid, createdAt: serverTimestamp() })
    await batch.commit()
    return id
  }

  async function updateAsset(asset, changes) {
    const next = { ...asset, ...changes }
    const batch = writeBatch(db)
    batch.update(doc(db, COL.assets, asset.id), { ...changes, updatedAt: serverTimestamp() })
    batch.update(doc(db, COL.publicAssets, asset.id), publicProjection(next))
    await batch.commit()
  }

  async function deleteAsset(id) {
    const batch = writeBatch(db)
    batch.delete(doc(db, COL.publicAssets, id))
    batch.delete(doc(db, COL.assets, id))
    await batch.commit()
  }

  function markScanSeen(reportId) {
    return updateDoc(doc(db, COL.scanReports, reportId), { seen: true, seenAt: serverTimestamp() })
  }

  // ───────────── finder side (/scan/:assetId) ─────────────
  async function getPublicAsset(id) {
    const snap = await getDoc(doc(db, COL.publicAssets, id))
    return snap.exists() ? withId(snap) : null
  }

  const scanChatId = (assetId, finderUid) => `asset_${assetId}_${finderUid}`

  /**
   * Sends an anonymous finder report: opens (or reuses) a private chat with the owner,
   * records a scan report and posts the message — all without revealing the owner's identity.
   */
  async function submitScanReport(publicAsset, { message, contact, location }) {
    const auth = useAuthStore()
    const chat = useChatStore()
    const finder = await auth.ensureAnonymousSession()

    const chatId = await chat.ensureChat({
      id: scanChatId(publicAsset.id, finder.uid),
      kind: 'asset',
      refId: publicAsset.id,
      title: `Found: ${publicAsset.name}`,
      participants: [finder.uid, publicAsset.ownerId],
      participantInfo: {
        [finder.uid]: { name: auth.isAuthenticated ? auth.displayName : 'Anonymous finder', role: 'finder' },
        [publicAsset.ownerId]: { name: 'Asset owner', role: 'owner' },
      },
    })

    await addDoc(collection(db, COL.scanReports), {
      assetId: publicAsset.id,
      assetName: publicAsset.name,
      ownerId: publicAsset.ownerId,
      finderId: finder.uid,
      message: message?.trim() || '',
      contact: contact?.trim() || null,
      location: location ? { lat: location.lat, lng: location.lng, accuracy: location.accuracy ?? null } : null,
      chatId,
      seen: false,
      createdAt: serverTimestamp(),
    })

    if (message?.trim()) await chat.sendMessage(chatId, { text: message.trim() })
    if (location) await chat.sendMessage(chatId, { location })
    lastScanChatId.value = chatId
    return chatId
  }

  /** Returns the chat id if this browser's finder identity already contacted the owner. */
  async function findExistingScanChat(assetId) {
    const auth = useAuthStore()
    if (!auth.uid) return null
    const id = scanChatId(assetId, auth.uid)
    const snap = await getDoc(doc(db, COL.chats, id))
    return snap.exists() ? id : null
  }

  return {
    lastScanChatId,
    watchMyAssets,
    watchOrgAssets,
    watchAsset,
    watchScanReports,
    createAsset,
    updateAsset,
    deleteAsset,
    markScanSeen,
    getPublicAsset,
    submitScanReport,
    findExistingScanChat,
  }
})
