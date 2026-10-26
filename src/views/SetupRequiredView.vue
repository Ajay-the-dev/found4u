<template>
  <div class="container py-5" style="max-width: 720px">
    <div class="card p-4">
      <h1 class="h4"><i class="bi bi-plug text-primary me-2"></i>FoundIt needs a Firebase project</h1>
      <p class="text-secondary">
        No Firebase configuration was found. Copy <code>.env.example</code> to <code>.env</code>, fill in your web-app
        config from the Firebase console, then restart <code>npm run dev</code>.
      </p>
      <pre class="bg-light p-3 rounded small mb-3">cp .env.example .env
# edit .env → VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID, …
npm run dev</pre>
      <p class="small text-secondary mb-0">The full walkthrough (Auth providers, rules, indexes, Cloud Functions, Cloudinary) is in <code>README.md</code>.</p>
    </div>
  </div>
</template>
