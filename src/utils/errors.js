const MESSAGES = {
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/invalid-login-credentials': 'Incorrect email or password.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/user-not-found': 'No account exists for that email.',
  'auth/email-already-in-use': 'An account with this email already exists. Try signing in instead.',
  'auth/weak-password': 'Please choose a stronger password (at least 8 characters).',
  'auth/invalid-email': 'That email address looks invalid.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/popup-closed-by-user': 'The sign-in popup was closed before finishing.',
  'auth/cancelled-popup-request': 'Sign-in was cancelled.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/account-exists-with-different-credential':
    'This email is already registered with a different sign-in method.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled for the project.',
  'auth/admin-restricted-operation': 'Anonymous sign-in is disabled for this project.',
  'permission-denied': "You don't have permission to do that.",
  'firestore/permission-denied': "You don't have permission to do that.",
  unavailable: 'The service is temporarily unavailable. You may be offline.',
  'not-found': 'That record no longer exists.',
  'failed-precondition': 'The database needs an index for this query. Deploy firestore.indexes.json.',
  'functions/unauthenticated': 'Please sign in first.',
  'functions/not-found': 'The required Cloud Function is not deployed.',
}

export function friendlyError(err) {
  if (!err) return 'Something went wrong.'
  if (typeof err === 'string') return err
  const code = err.code || ''
  return MESSAGES[code] || MESSAGES[code.replace(/^firestore\//, '')] || err.message || 'Something went wrong.'
}

export const isPermissionError = (err) => /permission-denied/.test(err?.code || '')
