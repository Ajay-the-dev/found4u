import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

const DAY = 24 * 60 * 60

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'prompt', // ask before swapping versions so a half-filled form is never reloaded away
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'Found4 — Lost & Found',
        short_name: 'Found4',
        description: 'Lost & found for campuses, offices and transit hubs.',
        start_url: '/dashboard',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#e9eef0',
        background_color: '#e9eef0',
        categories: ['utilities', 'productivity'],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'I found something', short_name: 'Found', url: '/report/found', icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] },
          { name: 'I lost something', short_name: 'Lost', url: '/report/lost', icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] },
          { name: 'Messages', url: '/chats', icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: '/index.html',
        // Firebase Auth's redirect/popup handler lives under /__/ and must reach the network.
        navigateFallbackDenylist: [/^\/__\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/[abc]?\.?tile\.openstreetmap\.org\/.*/,
            handler: 'CacheFirst',
            options: { cacheName: 'map-tiles', expiration: { maxEntries: 600, maxAgeSeconds: 30 * DAY }, cacheableResponse: { statuses: [0, 200] } },
          },
          {
            urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/,
            handler: 'CacheFirst',
            options: { cacheName: 'item-photos', expiration: { maxEntries: 300, maxAgeSeconds: 30 * DAY }, cacheableResponse: { statuses: [0, 200] } },
          },
          {
            urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'storage-photos', expiration: { maxEntries: 300, maxAgeSeconds: 30 * DAY }, cacheableResponse: { statuses: [0, 200] } },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // Deps only reached from lazy routes would otherwise be discovered mid-session, forcing a
  // re-optimize that 504s the in-flight import (and a full reload) in dev.
  optimizeDeps: {
    include: ['qrcode', 'leaflet', 'gsap', 'gsap/ScrollTrigger', 'geofire-common'],
  },
  build: {
    chunkSizeWarningLimit: 1500,
  },
})
