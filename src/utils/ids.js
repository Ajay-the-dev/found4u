// Crockford-style alphabet without look-alike characters (0/O, 1/I/L) — easy to read off a sticker.
const TAG_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
const TOKEN_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

export function randomString(length, alphabet = TOKEN_ALPHABET) {
  // Rejection sampling keeps the distribution uniform.
  const max = 256 - (256 % alphabet.length)
  let out = ''
  while (out.length < length) {
    const bytes = crypto.getRandomValues(new Uint8Array(length * 2))
    for (const b of bytes) {
      if (b < max) out += alphabet[b % alphabet.length]
      if (out.length === length) break
    }
  }
  return out
}

/** Human-friendly asset tag id, e.g. `FI-7KQ3-M9XD`. */
export const generateAssetId = () => `FI-${randomString(4, TAG_ALPHABET)}-${randomString(4, TAG_ALPHABET)}`

/** Unguessable invitation token (used as the invitation document id). */
export const generateToken = () => randomString(32)
