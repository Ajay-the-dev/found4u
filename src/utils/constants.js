export const ROLE_RANK = { owner: 4, admin: 3, staff: 2, member: 1 }

export const ROLES = {
  owner: {
    label: 'Owner',
    color: 'danger',
    icon: 'bi-star-fill',
    description: 'Full control, including managing admins and organization settings.',
  },
  admin: {
    label: 'Admin',
    color: 'warning',
    icon: 'bi-shield-lock-fill',
    description: 'Invites people, manages roles below admin, edits settings and runs the command center.',
  },
  staff: {
    label: 'Staff',
    color: 'info',
    icon: 'bi-person-badge-fill',
    description: 'Works the command center: reviews incidents, links matches and coordinates handovers.',
  },
  member: {
    label: 'Member',
    color: 'secondary',
    icon: 'bi-person-fill',
    description: 'Reports lost and found items and sees what has been reported in the organization.',
  },
}

export const ASSIGNABLE_ROLES = ['admin', 'staff', 'member']

export const ITEM_STATUSES = ['open', 'under_review', 'matched', 'claimed', 'resolved']
export const ACTIVE_STATUSES = ['open', 'under_review']

export const STATUS_META = {
  open: { label: 'Open', color: 'primary', icon: 'bi-circle' },
  under_review: { label: 'Under Review', color: 'warning', icon: 'bi-hourglass-split' },
  matched: { label: 'Matched', color: 'info', icon: 'bi-link-45deg' },
  claimed: { label: 'Claimed', color: 'success', icon: 'bi-hand-thumbs-up' },
  resolved: { label: 'Resolved', color: 'secondary', icon: 'bi-check2-circle' },
}

export const MATCH_STATUS_META = {
  pending: { label: 'Pending review', color: 'warning' },
  confirmed: { label: 'Confirmed', color: 'info' },
  completed: { label: 'Handed over', color: 'success' },
  dismissed: { label: 'Dismissed', color: 'secondary' },
}

export const CATEGORIES = [
  { value: 'electronics', label: 'Electronics', icon: 'bi-laptop' },
  { value: 'phone', label: 'Phone', icon: 'bi-phone' },
  { value: 'wallet', label: 'Wallet & Purse', icon: 'bi-wallet2' },
  { value: 'keys', label: 'Keys', icon: 'bi-key' },
  { value: 'id_card', label: 'ID & Cards', icon: 'bi-person-vcard' },
  { value: 'bag', label: 'Bags & Luggage', icon: 'bi-backpack' },
  { value: 'clothing', label: 'Clothing', icon: 'bi-handbag' },
  { value: 'jewelry', label: 'Jewelry & Watches', icon: 'bi-gem' },
  { value: 'eyewear', label: 'Eyewear', icon: 'bi-eyeglasses' },
  { value: 'documents', label: 'Documents & Books', icon: 'bi-journal-text' },
  { value: 'sports', label: 'Sports & Outdoor', icon: 'bi-bicycle' },
  { value: 'other', label: 'Other', icon: 'bi-box-seam' },
]

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.value, c]))

export const ORG_TYPES = [
  { value: 'campus', label: 'University / School campus', icon: 'bi-mortarboard' },
  { value: 'office', label: 'Corporate office', icon: 'bi-building' },
  { value: 'transit', label: 'Transit hub', icon: 'bi-train-front' },
  { value: 'venue', label: 'Venue / Event space', icon: 'bi-ticket-perforated' },
  { value: 'hospitality', label: 'Hotel / Hospitality', icon: 'bi-cup-hot' },
  { value: 'other', label: 'Other', icon: 'bi-diagram-3' },
]

export const RADIUS_OPTIONS = [250, 500, 1000, 2000, 5000]
export const DEFAULT_ALERT_RADIUS = 1000

export const INVITE_TTL_DAYS = 7
export const MAX_PHOTOS = 6
