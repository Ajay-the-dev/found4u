import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/services/firebase'
import { COL } from '@/utils/collections'
import { generateToken } from '@/utils/ids'
import { withId } from '@/utils/firestore'
import { atLeast, rankOf } from '@/utils/permissions'
import { DEFAULT_ALERT_RADIUS, INVITE_TTL_DAYS } from '@/utils/constants'
import { useAuthStore } from './auth'

const CURRENT_ORG_KEY = 'foundit.currentOrgId'

export const useOrgStore = defineStore('org', () => {
  const memberships = ref([]) // this user's member records, one per organization
  const orgs = ref({}) // orgId → organization document
  const loaded = ref(false)
  const currentOrgId = ref(localStorage.getItem(CURRENT_ORG_KEY) || null)

  let boundUid
  let unsubMemberships = null
  const orgUnsubs = new Map()
  const orgRetries = new Map()
  let resolveLoaded
  let loadedPromise = new Promise((resolve) => (resolveLoaded = resolve))

  // ───────────── getters ─────────────
  const myOrgs = computed(() =>
    memberships.value
      .map((m) => ({ ...(orgs.value[m.orgId] || { name: 'Loading…' }), id: m.orgId, role: m.role }))
      .sort((a, b) => rankOf(b.role) - rankOf(a.role) || a.name.localeCompare(b.name)),
  )
  const currentOrg = computed(() => myOrgs.value.find((o) => o.id === currentOrgId.value) || null)
  const currentRole = computed(() => currentOrg.value?.role || null)
  const staffOrgs = computed(() => myOrgs.value.filter((o) => atLeast(o.role, 'staff')))

  const roleIn = (orgId) => memberships.value.find((m) => m.orgId === orgId)?.role || null
  const hasRole = (orgId, minRole) => atLeast(roleIn(orgId), minRole)
  const orgName = (orgId) => orgs.value[orgId]?.name || ''

  // ───────────── session binding ─────────────
  function bind(uid) {
    if (uid === boundUid) return
    teardown()
    boundUid = uid
    if (!uid) {
      loaded.value = true
      resolveLoaded()
      return
    }
    loaded.value = false
    unsubMemberships = onSnapshot(
      query(collectionGroup(db, COL.members), where('uid', '==', uid)),
      (snap) => {
        memberships.value = snap.docs.map((d) => ({ ...d.data(), orgId: d.data().orgId || d.ref.parent.parent.id }))
        syncOrgListeners()
        if (currentOrgId.value && !memberships.value.some((m) => m.orgId === currentOrgId.value)) {
          setCurrentOrg(null)
        }
        loaded.value = true
        resolveLoaded()
      },
      (err) => {
        console.error('[org] memberships listener', err)
        loaded.value = true
        resolveLoaded()
      },
    )
  }

  function syncOrgListeners() {
    const wanted = new Set(memberships.value.map((m) => m.orgId))
    for (const [orgId, unsub] of orgUnsubs) {
      if (!wanted.has(orgId)) {
        unsub()
        orgUnsubs.delete(orgId)
        const { [orgId]: _removed, ...rest } = orgs.value
        orgs.value = rest
      }
    }
    for (const orgId of wanted) {
      if (orgUnsubs.has(orgId)) continue
      orgUnsubs.set(
        orgId,
        onSnapshot(
          doc(db, COL.organizations, orgId),
          (snap) => {
            if (snap.exists()) orgs.value = { ...orgs.value, [orgId]: withId(snap) }
          },
          (err) => {
            // A listener attached from a latency-compensated membership (e.g. right after
            // creating or joining an org) can be rejected before the member doc reaches the
            // server. Errored listeners are dead, so drop it and retry a few times.
            orgUnsubs.delete(orgId)
            const attempt = (orgRetries.get(orgId) || 0) + 1
            orgRetries.set(orgId, attempt)
            if (err.code === 'permission-denied' && attempt <= 3) setTimeout(syncOrgListeners, 1000 * attempt)
            else console.warn('[org] org listener', orgId, err.code)
          },
        ),
      )
    }
  }

  function teardown() {
    unsubMemberships?.()
    unsubMemberships = null
    orgUnsubs.forEach((unsub) => unsub())
    orgUnsubs.clear()
    orgRetries.clear()
    memberships.value = []
    orgs.value = {}
    // Keep the original promise if nobody has resolved it yet, so early waiters aren't orphaned.
    if (loaded.value) loadedPromise = new Promise((resolve) => (resolveLoaded = resolve))
  }

  const waitUntilLoaded = () => loadedPromise

  function setCurrentOrg(orgId) {
    currentOrgId.value = orgId || null
    if (orgId) localStorage.setItem(CURRENT_ORG_KEY, orgId)
    else localStorage.removeItem(CURRENT_ORG_KEY)
  }

  // ───────────── organization CRUD ─────────────
  async function createOrg({ name, type, description, alertRadiusMeters, center }) {
    const auth = useAuthStore()
    const orgRef = doc(collection(db, COL.organizations))
    const batch = writeBatch(db)
    batch.set(orgRef, {
      name: name.trim(),
      type,
      description: description?.trim() || '',
      ownerId: auth.uid,
      settings: {
        alertRadiusMeters: alertRadiusMeters || DEFAULT_ALERT_RADIUS,
        center: center ? { lat: center.lat, lng: center.lng, address: center.address || '' } : null,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    batch.set(doc(db, COL.organizations, orgRef.id, COL.members, auth.uid), {
      uid: auth.uid,
      orgId: orgRef.id,
      role: 'owner',
      email: auth.email,
      displayName: auth.displayName,
      joinedAt: serverTimestamp(),
    })
    await batch.commit()
    setCurrentOrg(orgRef.id)
    return orgRef.id
  }

  function updateOrg(orgId, data) {
    return updateDoc(doc(db, COL.organizations, orgId), { ...data, updatedAt: serverTimestamp() })
  }

  // ───────────── members ─────────────
  function watchMembers(orgId, onData, onError) {
    return onSnapshot(
      collection(db, COL.organizations, orgId, COL.members),
      (snap) =>
        onData(
          snap.docs
            .map(withId)
            .sort((a, b) => rankOf(b.role) - rankOf(a.role) || (a.displayName || '').localeCompare(b.displayName || '')),
        ),
      onError,
    )
  }

  function changeRole(orgId, memberUid, role) {
    const auth = useAuthStore()
    return updateDoc(doc(db, COL.organizations, orgId, COL.members, memberUid), {
      role,
      updatedAt: serverTimestamp(),
      updatedBy: auth.uid,
    })
  }

  function removeMember(orgId, memberUid) {
    return deleteDoc(doc(db, COL.organizations, orgId, COL.members, memberUid))
  }

  async function leaveOrg(orgId) {
    const auth = useAuthStore()
    await deleteDoc(doc(db, COL.organizations, orgId, COL.members, auth.uid))
    if (currentOrgId.value === orgId) setCurrentOrg(null)
  }

  // ───────────── invitations ─────────────
  const inviteLink = (token) => `${window.location.origin}/invite/${token}`

  async function inviteMember(orgId, rawEmail, role) {
    const auth = useAuthStore()
    const email = rawEmail.trim().toLowerCase()

    const existing = await getDocs(
      query(collection(db, COL.organizations, orgId, COL.members), where('email', '==', email)),
    )
    if (!existing.empty) throw new Error(`${email} is already a member of this organization.`)

    const token = generateToken()
    await setDoc(doc(db, COL.invitations, token), {
      orgId,
      orgName: orgName(orgId),
      email,
      role,
      status: 'pending',
      invitedBy: auth.uid,
      invitedByName: auth.displayName,
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + INVITE_TTL_DAYS * 86400000),
    })
    return { token, link: inviteLink(token) }
  }

  function watchPendingInvitations(orgId, onData, onError) {
    return onSnapshot(
      query(collection(db, COL.invitations), where('orgId', '==', orgId), where('status', '==', 'pending')),
      (snap) => onData(snap.docs.map(withId)),
      onError,
    )
  }

  async function fetchMyInvitations() {
    const auth = useAuthStore()
    if (!auth.email) return []
    const snap = await getDocs(
      query(collection(db, COL.invitations), where('email', '==', auth.email), where('status', '==', 'pending')),
    )
    return snap.docs.map(withId).filter((inv) => inv.expiresAt?.toMillis() > Date.now())
  }

  function revokeInvitation(token) {
    return updateDoc(doc(db, COL.invitations, token), { status: 'revoked', updatedAt: serverTimestamp() })
  }

  async function getInvitation(token) {
    const snap = await getDoc(doc(db, COL.invitations, token))
    return snap.exists() ? withId(snap) : null
  }

  async function acceptInvitation(invitation) {
    const auth = useAuthStore()
    if (roleIn(invitation.orgId)) return invitation.orgId
    // Security rules check `email_verified` on the ID token, which can be stale after the user
    // clicked the verification link elsewhere — always mint a fresh token first.
    const verified = await auth.refreshVerification()
    if (!verified) throw new Error('Please verify your email address before joining an organization.')
    const batch = writeBatch(db)
    batch.set(doc(db, COL.organizations, invitation.orgId, COL.members, auth.uid), {
      uid: auth.uid,
      orgId: invitation.orgId,
      role: invitation.role,
      email: auth.email,
      displayName: auth.displayName,
      invitedBy: invitation.invitedBy,
      inviteToken: invitation.id,
      joinedAt: serverTimestamp(),
    })
    batch.update(doc(db, COL.invitations, invitation.id), {
      status: 'accepted',
      acceptedBy: auth.uid,
      acceptedAt: serverTimestamp(),
    })
    await batch.commit()
    setCurrentOrg(invitation.orgId)
    return invitation.orgId
  }

  return {
    memberships,
    orgs,
    loaded,
    currentOrgId,
    myOrgs,
    currentOrg,
    currentRole,
    staffOrgs,
    roleIn,
    hasRole,
    orgName,
    bind,
    waitUntilLoaded,
    setCurrentOrg,
    createOrg,
    updateOrg,
    watchMembers,
    changeRole,
    removeMember,
    leaveOrg,
    inviteLink,
    inviteMember,
    watchPendingInvitations,
    fetchMyInvitations,
    revokeInvitation,
    getInvitation,
    acceptInvitation,
  }
})
