<script setup>
const features = [
  { icon: 'bi-building', title: 'Organization workspaces', text: 'Campuses, offices and transit hubs get their own isolated lost-and-found, members and roles.' },
  { icon: 'bi-geo-alt', title: 'Map-based reports', text: 'Drop a pin where you lost something, or describe it when you have no idea where it went.' },
  { icon: 'bi-radar', title: 'Radius alerts', text: 'When someone logs a found item inside your alert radius, you get notified straight away, in the app and by email.' },
  { icon: 'bi-qr-code', title: 'QR asset tags', text: 'Print stickers for laptops, keys and IDs. Finders scan, message you anonymously and send a location ping.' },
  { icon: 'bi-chat-dots', title: 'Private real-time chat', text: 'Owners, finders and staff arrange the handover without sharing phone numbers.' },
  { icon: 'bi-broadcast', title: 'Command center', text: 'Staff review incidents, link matches, check proximity flags and track every item to resolution.' },
]
</script>

<template>
  <div>
    <section class="hero py-5">
      <div class="container py-lg-5">
        <div class="row align-items-center g-4 g-lg-5">
          <div class="col-lg-6">
            <span class="badge rounded-pill text-bg-light border mb-3"><i class="bi bi-stars text-primary me-1"></i>Lost &amp; Found for organizations</span>
            <h1 class="display-5 fw-bold mb-3">Lose it. Report it. <span class="text-primary">FoundIt.</span></h1>
            <p class="lead text-secondary mb-4">
              Report and match lost and found items using map pins, radius alerts, QR asset tags and private chat. Built for campuses, offices and transit hubs.
            </p>
            <div class="d-flex flex-wrap gap-2">
              <RouterLink to="/register" class="btn btn-primary btn-lg px-4">Get started — it's free</RouterLink>
              <RouterLink to="/login" class="btn btn-outline-secondary btn-lg">Sign in</RouterLink>
            </div>
          </div>
          <div class="col-lg-6">
            <div class="card shadow-lg border-0 p-4">
              <div class="d-flex align-items-center gap-3 mb-3">
                <span class="stat-icon bg-found text-white rounded-3 p-3"><i class="bi bi-geo-alt-fill fs-4"></i></span>
                <div>
                  <div class="fw-semibold">Possible match nearby</div>
                  <div class="small text-secondary">A black backpack was found 180 m from where you lost yours.</div>
                </div>
              </div>
              <div class="d-flex align-items-center gap-3 mb-3">
                <span class="stat-icon bg-warning text-white rounded-3 p-3"><i class="bi bi-qr-code-scan fs-4"></i></span>
                <div>
                  <div class="fw-semibold">Your laptop tag was scanned</div>
                  <div class="small text-secondary">"Found it in Lecture Hall C — I left it with security."</div>
                </div>
              </div>
              <div class="d-flex align-items-center gap-3">
                <span class="stat-icon bg-primary text-white rounded-3 p-3"><i class="bi bi-bag-check fs-4"></i></span>
                <div>
                  <div class="fw-semibold">Handover scheduled</div>
                  <div class="small text-secondary">Front desk, Building B · Today 4:30 PM</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="container py-5">
      <div class="row g-4">
        <div v-for="f in features" :key="f.title" class="col-md-6 col-lg-4">
          <div class="card h-100 p-4">
            <i class="bi fs-3 text-primary mb-2" :class="f.icon"></i>
            <h2 class="h6">{{ f.title }}</h2>
            <p class="small text-secondary mb-0">{{ f.text }}</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
