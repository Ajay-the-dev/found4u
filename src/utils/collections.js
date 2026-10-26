// Every Firestore collection is namespaced with `lofu_` so FoundIt can share a database
// with other apps. Keep in sync with functions/src/collections.js and firestore.rules.
export const COLLECTION_PREFIX = 'lofu_'

export const COL = {
  users: 'lofu_users',
  organizations: 'lofu_organizations',
  members: 'lofu_members', // subcollection of organizations; also collection-group queried
  invitations: 'lofu_invitations',
  items: 'lofu_items',
  matches: 'lofu_matches',
  notifications: 'lofu_notifications',
  assets: 'lofu_assets',
  publicAssets: 'lofu_publicAssets',
  scanReports: 'lofu_scanReports',
  chats: 'lofu_chats',
  messages: 'lofu_messages', // subcollection of chats
}
