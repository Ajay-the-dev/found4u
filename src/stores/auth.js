import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signInAnonymously,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  reload,
} from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { auth, db, googleProvider } from '@/services/firebase'
import { COL } from '@/utils/collections'
import { DEFAULT_ALERT_RADIUS } from '@/utils/constants'
import { useOrgStore } from './org'
import { useItemStore } from './item'
import { useChatStore } from './chat'
import { useNotificationStore } from './notification'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const profile = ref(null)
  const ready = ref(false)
  const emailVerified = ref(false)

  let resolveReady
  const readyPromise = new Promise((resolve) => (resolveReady = resolve))
  let unsubProfile = null
  let initialized = false

  const uid = computed(() => user.value?.uid ?? null)
  const isAuthenticated = computed(() => !!user.value && !user.value.isAnonymous)
  const isAnonymous = computed(() => !!user.value?.isAnonymous)
  const email = computed(() => user.value?.email?.toLowerCase() ?? null)
  const displayName = computed(
    () => profile.value?.displayName || user.value?.displayName || email.value?.split('@')[0] || 'User',
  )
  const photoURL = computed(() => profile.value?.photoURL || user.value?.photoURL || null)
  const usesPassword = computed(() => !!user.value?.providerData?.some((p) => p.providerId === 'password'))
  const needsEmailVerification = computed(() => isAuthenticated.value && usesPassword.value && !emailVerified.value)
  const prefs = computed(() => ({
    emailAlerts: true,
    alertRadiusMeters: DEFAULT_ALERT_RADIUS,
    ...(profile.value?.prefs || {}),
  }))

  function init() {
    if (initialized) return
    initialized = true
    onAuthStateChanged(auth, async (firebaseUser) => {
      user.value = firebaseUser
      emailVerified.value = !!firebaseUser?.emailVerified
      unsubProfile?.()
      unsubProfile = null
      profile.value = null

      const sessionUid = firebaseUser && !firebaseUser.isAnonymous ? firebaseUser.uid : null
      if (sessionUid) {
        try {
          await ensureProfile(firebaseUser)
        } catch (err) {
          console.warn('[auth] could not create profile', err)
        }
        unsubProfile = onSnapshot(
          doc(db, COL.users, sessionUid),
          (snap) => (profile.value = snap.data() ?? null),
          (err) => console.warn('[auth] profile listener', err),
        )
      }
      bindSession(sessionUid)

      if (!ready.value) {
        ready.value = true
        resolveReady()
      }
    })
  }

  /** (Re)binds the realtime listeners of every user-scoped store. */
  function bindSession(sessionUid) {
    useOrgStore().bind(sessionUid)
    useItemStore().bindMine(sessionUid)
    useChatStore().bind(sessionUid)
    useNotificationStore().bind(sessionUid)
  }

  const waitUntilReady = () => readyPromise

  async function ensureProfile(firebaseUser, overrides = {}) {
    const ref = doc(db, COL.users, firebaseUser.uid)
    const snap = await getDoc(ref)
    if (snap.exists()) return
    await setDoc(ref, {
      uid: firebaseUser.uid,
      email: firebaseUser.email?.toLowerCase() ?? null,
      displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
      photoURL: firebaseUser.photoURL ?? null,
      prefs: { emailAlerts: true, alertRadiusMeters: DEFAULT_ALERT_RADIUS },
      createdAt: serverTimestamp(),
      ...overrides,
    })
  }

  async function register({ name, email: rawEmail, password }) {
    const cred = await createUserWithEmailAndPassword(auth, rawEmail.trim(), password)
    user.value = cred.user
    await updateProfile(cred.user, { displayName: name.trim() })
    // The auth listener may already be creating the profile; whichever write loses the race is harmless.
    await ensureProfile(cred.user, { displayName: name.trim() }).catch(() => {})
    await setDoc(doc(db, COL.users, cred.user.uid), { uid: cred.user.uid, displayName: name.trim() }, { merge: true })
    await sendEmailVerification(cred.user, { url: `${window.location.origin}/dashboard` }).catch(() => {})
    return cred.user
  }

  async function login(rawEmail, password) {
    const cred = await signInWithEmailAndPassword(auth, rawEmail.trim(), password)
    user.value = cred.user // don't wait for the auth listener before navigating
    return cred.user
  }

  async function loginWithGoogle() {
    try {
      const cred = await signInWithPopup(auth, googleProvider)
      user.value = cred.user
      return cred.user
    } catch (err) {
      // Popups are often blocked on mobile browsers; fall back to a full-page redirect.
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/operation-not-supported-in-this-environment') {
        await signInWithRedirect(auth, googleProvider)
        return null
      }
      throw err
    }
  }

  /** Finders on the public scan page get a throwaway anonymous identity. */
  async function ensureAnonymousSession() {
    await readyPromise
    if (auth.currentUser) return auth.currentUser
    const cred = await signInAnonymously(auth)
    return cred.user
  }

  async function logout() {
    await signOut(auth)
  }

  function resetPassword(rawEmail) {
    return sendPasswordResetEmail(auth, rawEmail.trim(), { url: `${window.location.origin}/login` })
  }

  function resendVerification() {
    return sendEmailVerification(auth.currentUser, { url: `${window.location.origin}/dashboard` })
  }

  /** Re-checks verification and forces a fresh ID token so security rules see `email_verified`. */
  async function refreshVerification() {
    if (!auth.currentUser) return false
    await reload(auth.currentUser)
    await auth.currentUser.getIdToken(true)
    emailVerified.value = auth.currentUser.emailVerified
    return emailVerified.value
  }

  async function updateUserProfile({ displayName: name, prefs: newPrefs }) {
    const data = { updatedAt: serverTimestamp() }
    if (name != null) {
      data.displayName = name.trim()
      await updateProfile(auth.currentUser, { displayName: data.displayName })
    }
    if (newPrefs) data.prefs = { ...prefs.value, ...newPrefs }
    await updateDoc(doc(db, COL.users, uid.value), data)
  }

  return {
    user,
    profile,
    ready,
    uid,
    email,
    displayName,
    photoURL,
    isAuthenticated,
    isAnonymous,
    emailVerified,
    needsEmailVerification,
    prefs,
    init,
    waitUntilReady,
    register,
    login,
    loginWithGoogle,
    ensureAnonymousSession,
    logout,
    resetPassword,
    resendVerification,
    refreshVerification,
    updateUserProfile,
  }
})
