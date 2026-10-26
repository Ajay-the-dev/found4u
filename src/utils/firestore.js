/** Snapshot → plain object with id; pending server timestamps resolve to local estimates. */
export const withId = (snap) => ({ id: snap.id, ...snap.data({ serverTimestamps: 'estimate' }) })

export const sortByTimeDesc = (field) => (a, b) =>
  (b[field]?.toMillis?.() ?? 0) - (a[field]?.toMillis?.() ?? 0)
