import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { httpsCallable } from 'firebase/functions'
import { auth, functions, storage } from './firebase'

const env = import.meta.env
const CLOUD_NAME = env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = env.VITE_CLOUDINARY_UPLOAD_PRESET
const SIGNED = env.VITE_CLOUDINARY_SIGNED === 'true'

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
export const cloudinaryEnabled = Boolean(CLOUD_NAME && (SIGNED || UPLOAD_PRESET))
export const mediaProvider = cloudinaryEnabled ? 'cloudinary' : storage ? 'firebase' : null

/**
 * Uploads an image and resolves to a photo descriptor stored on Firestore documents:
 * `{ url, provider, publicId?, path?, width?, height? }`.
 */
export async function uploadImage(file, { folder = 'items', onProgress } = {}) {
  if (!file?.type?.startsWith('image/')) throw new Error('Only image files can be uploaded.')
  if (file.size > MAX_IMAGE_BYTES) throw new Error('Images must be smaller than 10 MB.')
  if (cloudinaryEnabled) return uploadToCloudinary(file, `foundit/${folder}`, onProgress)
  if (storage) return uploadToFirebase(file, folder, onProgress)
  throw new Error('No image storage is configured. Set up Cloudinary or Firebase Storage.')
}

async function uploadToCloudinary(file, folder, onProgress) {
  const form = new FormData()
  form.append('file', file)

  if (SIGNED) {
    const sign = httpsCallable(functions, 'lofu-cloudinarySignature')
    const { data } = await sign({ folder })
    form.append('api_key', data.apiKey)
    form.append('timestamp', String(data.timestamp))
    form.append('signature', data.signature)
    form.append('folder', data.folder)
  } else {
    form.append('upload_preset', UPLOAD_PRESET)
    form.append('folder', folder)
  }

  const cloudName = CLOUD_NAME
  const res = await xhrUpload(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, form, onProgress)
  return {
    url: res.secure_url,
    publicId: res.public_id,
    width: res.width,
    height: res.height,
    provider: 'cloudinary',
  }
}

function xhrUpload(url, form, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      let body = null
      try {
        body = JSON.parse(xhr.responseText)
      } catch {
        /* non-JSON response */
      }
      if (xhr.status >= 200 && xhr.status < 300 && body) resolve(body)
      else reject(new Error(body?.error?.message || `Upload failed (HTTP ${xhr.status}).`))
    }
    xhr.onerror = () => reject(new Error('Network error while uploading the image.'))
    xhr.send(form)
  })
}

function uploadToFirebase(file, folder, onProgress) {
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error('You must be signed in to upload images.')
  const safeName = file.name.replace(/[^\w.-]+/g, '_').slice(-80)
  const path = `lofu/uploads/${uid}/${folder}/${Date.now()}-${safeName}`
  const task = uploadBytesResumable(storageRef(storage, path), file, { contentType: file.type })

  return new Promise((resolve, reject) => {
    task.on(
      'state_changed',
      (snap) => onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      async () => resolve({ url: await getDownloadURL(task.snapshot.ref), path, provider: 'firebase' }),
    )
  })
}

/**
 * Returns an optimized delivery URL. Cloudinary URLs get on-the-fly transformations;
 * other providers are returned unchanged.
 */
export function imageUrl(photo, { width = 800, height, crop = 'limit' } = {}) {
  const url = typeof photo === 'string' ? photo : photo?.url
  if (!url) return ''
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url
  const parts = ['f_auto', 'q_auto', `c_${crop}`, `w_${width}`]
  if (height) parts.push(`h_${height}`, 'g_auto')
  return url.replace('/upload/', `/upload/${parts.join(',')}/`)
}
