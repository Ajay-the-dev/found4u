<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { gsap, prefersReducedMotion } from '@/utils/motion'
import MistScene from '@/components/common/MistScene.vue'
import BrandLogo from '@/components/common/BrandLogo.vue'

const features = [
  { icon: 'bi-building', tone: 'primary', title: 'Organization workspaces', text: 'Campuses, offices and transit hubs get their own isolated lost-and-found, members and roles.', span: 'col-lg-7' },
  { icon: 'bi-radar', tone: 'violet', title: 'Radius alerts', text: 'When a found item lands inside your alert radius, you hear about it instantly — in-app and by email.', span: 'col-lg-5' },
  { icon: 'bi-qr-code', tone: 'warning', title: 'QR asset tags', text: 'Print stickers for laptops, keys and IDs. Finders scan, message you anonymously and share a location ping.', span: 'col-lg-4' },
  { icon: 'bi-geo-alt', tone: 'lost', title: 'Map-based reports', text: "Drop a pin where you lost it — or describe it when you've no idea where it went.", span: 'col-lg-4' },
  { icon: 'bi-chat-dots', tone: 'found', title: 'Private real-time chat', text: 'Owners, finders and staff arrange the handover without swapping phone numbers.', span: 'col-lg-4' },
  { icon: 'bi-broadcast', tone: 'info', title: 'Command center', text: 'Staff review incidents, link matches, check proximity flags and track every item through to resolution.', span: 'col-lg-12' },
]

const steps = [
  { n: '01', title: 'Report or tag', text: 'Log what you lost or found in under a minute, or stick a QR tag on things you care about.' },
  { n: '02', title: 'Get matched', text: 'Found4 compares category, time and distance and pings both sides the moment there’s a likely match.' },
  { n: '03', title: 'Hand it over', text: 'Chat privately, agree a pickup point and close the loop — staff see the full audit trail.' },
]

// Hero "rail" on the right: each phase drives the gauge card in the centre.
const phases = [
  { label: 'Report', title: 'Item Logged', icon: 'bi-pencil-square', value: '<1m', caption: 'Time to report', fill: 0.36 },
  { label: 'Match', title: 'Match Alert', icon: 'bi-bell', value: '94%', caption: 'Match confidence', fill: 0.94 },
  { label: 'Return', title: 'Handover', icon: 'bi-bag-check', value: '4:30', caption: 'Pickup · Front desk', fill: 0.7 },
]
const active = ref(1)

const navLinks = [
  { label: 'Explore', target: null },
  { label: 'Features', target: 'features' },
  { label: 'How it works', target: 'how' },
]
function scrollToSection(id) {
  const top = id ? document.getElementById(id).getBoundingClientRect().top + window.scrollY - 16 : 0
  window.scrollTo({ top, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
}
const phase = computed(() => phases[active.value])

const DOTS = 56
const gaugeDots = Array.from({ length: DOTS }, (_, i) => {
  const a = (i / DOTS) * Math.PI * 2 - Math.PI / 2
  return { x: 80 + Math.cos(a) * 66, y: 80 + Math.sin(a) * 66 }
})
const litDots = computed(() => Math.round(phase.value.fill * DOTS))

const root = ref(null)
let ctx
let cycle

function pick(i) {
  active.value = i
  clearInterval(cycle)
}

onMounted(() => {
  cycle = setInterval(() => {
    if (!document.hidden) active.value = (active.value + 1) % phases.length
  }, 4200)
  if (prefersReducedMotion()) return
  ctx = gsap.context(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
    tl.from('.scene', { scale: 1.08, duration: 2.4, ease: 'expo.out' }, 0)
      .from('.hero-nav > *', { y: -10, opacity: 0, duration: 0.6, stagger: 0.08 }, 0.1)
      .from('.hero-badge', { y: 12, opacity: 0, duration: 0.5 }, 0.2)
      .from('.hero-title .line', { yPercent: 110, opacity: 0, duration: 0.9, stagger: 0.09 }, '-=0.25')
      .from('.hero-sub, .hero-cta', { y: 14, opacity: 0, duration: 0.6, stagger: 0.08 }, '-=0.5')
      .from('.glass-stack > *', { y: 40, opacity: 0, duration: 0.9, stagger: 0.12, ease: 'expo.out' }, 0.35)
      .from('.rail li', { x: 16, opacity: 0, duration: 0.5, stagger: 0.08 }, '-=0.7')
      .from('.edge-arc', { opacity: 0, duration: 1.2 }, '-=0.6')
      .from('.hero-corner', { y: 12, opacity: 0, duration: 0.6, stagger: 0.1 }, '-=0.9')

    gsap.to('.pin-pulse', { scale: 2.6, opacity: 0, duration: 2, ease: 'power1.out', repeat: -1, transformOrigin: '50% 50%' })
    gsap.to('.tip-art', { y: -6, rotate: -4, duration: 3, ease: 'sine.inOut', yoyo: true, repeat: -1 })
  }, root.value)
})

onBeforeUnmount(() => {
  clearInterval(cycle)
  ctx?.revert()
})
</script>

<template>
  <div ref="root" class="landing">
    <!-- ── Hero ── -->
    <section class="hero-frame">
      <div class="hero-panel">
        <MistScene fog class="scene" />
        <div class="scene-shade" aria-hidden="true"></div>

        <header class="hero-nav">
          <RouterLink to="/" class="hero-brand">
            <span class="brand-mark"><BrandLogo /></span>
            Found4
          </RouterLink>
          <nav class="hero-links d-none d-md-flex" aria-label="Primary">
            <a
              v-for="(l, i) in navLinks" :key="l.label" :href="l.target ? `#${l.target}` : '#'"
              :class="{ active: i === 0 }" @click.prevent="scrollToSection(l.target)"
            >{{ l.label }}</a>
            <RouterLink to="/login">Sign in</RouterLink>
          </nav>
          <RouterLink to="/register" class="nav-cta">
            <span>Get started</span><span class="nav-cta-sep"></span><span>Free</span>
          </RouterLink>
        </header>

        <!-- Edge arcs -->
        <div class="edge-arc left d-none d-xl-block" aria-hidden="true"><span class="arc-node"></span></div>
        <div class="edge-arc right d-none d-xl-block" aria-hidden="true"><span class="arc-node"></span></div>

        <div class="hero-grid">
          <!-- Copy -->
          <div class="hero-copy">
            <RouterLink to="/register" class="hero-badge glass-chip mb-3">
              <i class="bi bi-grid-fill"></i>
              Lost &amp; found intelligence
            </RouterLink>
            <h1 class="hero-title mb-3">
              <span class="line-mask"><span class="line d-block">Lose it.</span></span>
              <span class="line-mask"><span class="line d-block">Report it.</span></span>
              <span class="line-mask"><span class="line d-block">Get it back.</span></span>
            </h1>
            <p class="hero-sub mb-4">
              Map pins, radius alerts, QR asset tags and private chat for campuses, offices and transit hubs.
            </p>
            <div class="hero-cta d-flex flex-wrap gap-2">
              <RouterLink to="/register" class="btn btn-lg btn-glass-solid px-4">Get started — free</RouterLink>
              <RouterLink to="/login" class="btn btn-lg btn-glass px-4">Sign in</RouterLink>
            </div>
          </div>

          <!-- Glass cards -->
          <div class="glass-stack">
            <div class="glass-card gauge-card">
              <div class="d-flex justify-content-between align-items-start">
                <Transition name="swap" mode="out-in">
                  <span :key="phase.title" class="glass-title">{{ phase.title }}</span>
                </Transition>
                <span class="ring-btn">
                  <svg viewBox="0 0 44 44" aria-hidden="true">
                    <circle cx="22" cy="22" r="20" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="1.5" />
                    <circle
                      cx="22" cy="22" r="20" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round"
                      :stroke-dasharray="`${phase.fill * 125.7} 125.7`" transform="rotate(-90 22 22)" class="ring-progress"
                    />
                  </svg>
                  <i class="bi" :class="phase.icon"></i>
                </span>
              </div>

              <div class="gauge">
                <svg viewBox="0 0 160 160" aria-hidden="true">
                  <circle
                    v-for="(d, i) in gaugeDots" :key="i" :cx="d.x" :cy="d.y"
                    :r="i < litDots ? 1.9 : 1.2" class="gauge-dot" :class="{ lit: i < litDots }"
                  />
                </svg>
                <Transition name="swap" mode="out-in">
                  <span :key="phase.value" class="gauge-value">{{ phase.value }}</span>
                </Transition>
              </div>

              <div class="d-flex justify-content-between align-items-center">
                <span class="glass-muted">{{ phase.caption }}</span>
                <span class="glass-toggle">Live <span class="toggle-knob"><i class="bi bi-broadcast"></i></span></span>
              </div>
            </div>

            <div class="glass-card radius-card">
              <div class="d-flex justify-content-between align-items-center">
                <span class="glass-title">Radius Intel</span>
                <i class="bi bi-grid-3x3-gap-fill glass-muted"></i>
              </div>
              <div class="contour">
                <svg viewBox="0 0 220 120" aria-hidden="true">
                  <g fill="none" stroke="rgba(255,255,255,0.32)" stroke-width="0.9">
                    <path d="M30 70 C40 30 110 20 150 40 S200 90 160 100 S60 110 30 70 Z" />
                    <path d="M55 70 C62 44 110 36 140 50 S175 85 148 92 S75 98 55 70 Z" />
                    <path d="M80 68 C86 54 112 50 128 58 S148 80 132 84 S88 86 80 68 Z" />
                    <path d="M10 40 C60 10 160 0 215 30" />
                    <path d="M0 105 C60 120 170 118 220 95" />
                  </g>
                  <path d="M112 68 Q150 60 176 92" fill="none" stroke="#fff" stroke-width="1" stroke-dasharray="2 3" opacity="0.7" />
                  <circle class="pin-pulse" cx="176" cy="92" r="4" fill="#fff" opacity="0.6" />
                  <circle cx="176" cy="92" r="4" fill="#fff" />
                </svg>
                <span class="glass-chip contour-chip">NEARBY: <strong>3 ITEMS</strong></span>
                <span class="contour-you"><i class="bi bi-person-fill"></i></span>
              </div>
              <span class="glass-muted">Distance: <span class="text-white">180 m</span></span>
            </div>

            <div class="tip-card">
              <div class="tip-chip"><i class="bi bi-stars"></i> SMART MATCH</div>
              <div class="tip-text">Black backpack found.<br />180 m from you</div>
              <span class="tip-art" aria-hidden="true"><i class="bi bi-backpack2-fill"></i></span>
              <RouterLink to="/register" class="tip-cta">
                <span>Get started</span><span class="tip-cta-sep"></span><span>Free</span>
              </RouterLink>
            </div>
          </div>

          <!-- Phase rail -->
          <ul class="rail list-unstyled mb-0 d-none d-lg-flex">
            <li v-for="(p, i) in phases" :key="p.label">
              <button type="button" :class="{ active: i === active }" @click="pick(i)">{{ p.label }}</button>
            </li>
          </ul>
        </div>

        <div class="hero-corner corner-left">
          <div class="avatar-stack" aria-hidden="true">
            <span style="background: var(--fi-primary)">AK</span><span style="background: #059669">MJ</span><span style="background: #e11d48">SR</span>
          </div>
          <div class="corner-big">Free</div>
          <div class="corner-small">for individuals</div>
        </div>
        <div class="hero-corner corner-right d-none d-md-block">
          <span class="corner-pin"><i class="bi bi-shield-check"></i></span>
          <div class="corner-small">Hand over at staff-verified<br />pickup desks</div>
        </div>
      </div>
    </section>

    <!-- ── Trust strip ── -->
    <section class="band-glass py-4">
      <div v-reveal.stagger class="container d-flex flex-wrap justify-content-center justify-content-md-between align-items-center gap-4 text-secondary">
        <span class="small fw-medium">Built for teams that handle lost property every day</span>
        <span class="trust"><i class="bi bi-mortarboard-fill me-2"></i>Universities</span>
        <span class="trust"><i class="bi bi-buildings-fill me-2"></i>Offices</span>
        <span class="trust"><i class="bi bi-train-front-fill me-2"></i>Transit hubs</span>
        <span class="trust"><i class="bi bi-airplane-fill me-2"></i>Airports</span>
        <span class="trust"><i class="bi bi-hospital-fill me-2"></i>Hospitals</span>
      </div>
    </section>

    <!-- ── Features (bento) ── -->
    <section id="features" class="container py-5 my-lg-5">
      <div v-reveal class="text-center mx-auto mb-5" style="max-width: 640px">
        <div class="eyebrow mb-2">Everything in one place</div>
        <h2 class="section-h2 mb-3">From "where did I leave it?" to "got it back" — faster.</h2>
        <p class="text-secondary mb-0">Every tool a lost-and-found desk needs, and a simple flow for everyone else.</p>
      </div>
      <div v-reveal.stagger class="row g-3">
        <div v-for="f in features" :key="f.title" class="col-md-6" :class="f.span">
          <div class="bento card h-100 p-4">
            <span class="stat-icon mb-4" :class="`tone-${f.tone}`"><i class="bi" :class="f.icon"></i></span>
            <h3 class="h5 mb-2">{{ f.title }}</h3>
            <p class="text-secondary mb-0">{{ f.text }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ── How it works ── -->
    <section id="how" class="band-glass py-5">
      <div class="container py-lg-5">
        <div class="row g-5 align-items-start">
          <div v-reveal class="col-lg-4">
            <div class="eyebrow mb-2">How it works</div>
            <h2 class="section-h2 mb-3">Three steps. No phone tag.</h2>
            <p class="text-secondary">Found4 handles matching and messaging so people can focus on getting their things back.</p>
          </div>
          <div class="col-lg-8">
            <div v-reveal.stagger="{ stagger: 0.12 }" class="row g-3">
              <div v-for="s in steps" :key="s.n" class="col-md-4">
                <div class="step h-100">
                  <div class="step-n mb-3">{{ s.n }}</div>
                  <h3 class="h6 mb-2">{{ s.title }}</h3>
                  <p class="small text-secondary mb-0">{{ s.text }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── CTA ── -->
    <section class="container py-5 my-lg-4">
      <div v-reveal="{ y: 40 }" class="cta-band text-center text-white position-relative overflow-hidden">
        <MistScene class="cta-scene" />
        <div class="cta-shade" aria-hidden="true"></div>
        <div class="position-relative">
          <h2 class="section-h2 text-white mb-3">Start reuniting people with their things.</h2>
          <p class="mb-4 opacity-75 mx-auto" style="max-width: 520px">Free for individuals. Set up your organization workspace in minutes.</p>
          <div class="d-flex flex-wrap justify-content-center gap-2">
            <RouterLink to="/register" class="btn btn-light btn-lg px-4">Create free account</RouterLink>
            <RouterLink to="/login" class="btn btn-lg px-4 text-white border-0" style="background: rgba(255, 255, 255, 0.12)">Sign in</RouterLink>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* ── Hero: framed misty-lake panel with glass UI ── */
.hero-frame { padding: 0.75rem; }
.hero-panel {
  --glass: rgba(255, 255, 255, 0.14);
  --glass-line: rgba(255, 255, 255, 0.28);
  position: relative; overflow: hidden; isolation: isolate;
  min-height: max(720px, calc(100svh - 1.5rem));
  border-radius: 1.75rem; background: #5f727d; color: #fff;
  display: flex; flex-direction: column; justify-content: center;
}
.scene { z-index: -2; transform-origin: 50% 60%; }
.scene-shade { position: absolute; inset: 0; z-index: -1; background: linear-gradient(90deg, rgba(14, 26, 34, 0.42), transparent 38%, transparent 62%, rgba(14, 26, 34, 0.32)); }

.hero-nav {
  position: absolute; top: 0; left: 0; right: 0; z-index: 2;
  display: grid; grid-template-columns: 1fr auto 1fr; align-items: center;
  padding: 1.5rem clamp(1.25rem, 4vw, 3.5rem);
}
.hero-brand { display: inline-flex; align-items: center; gap: 0.55rem; justify-self: start; color: #fff; font-weight: 650; font-size: 1.1rem; letter-spacing: -0.03em; text-decoration: none !important; }
.hero-links { gap: 0.25rem; }
.hero-links a { padding: 0.45rem 0.9rem; border-radius: 999px; color: rgba(255, 255, 255, 0.88); font-size: 0.8125rem; font-weight: 500; text-decoration: none !important; transition: background-color 0.2s ease, color 0.2s ease; }
.hero-links a:hover { color: #fff; background: rgba(255, 255, 255, 0.12); }
.hero-links a.active { color: #fff; background: rgba(255, 255, 255, 0.2); border: 1px solid var(--glass-line); backdrop-filter: blur(10px); }
.nav-cta {
  justify-self: end; display: inline-flex; align-items: center; gap: 0.7rem; padding: 0.5rem 1rem; border-radius: 999px;
  background: #fff; color: var(--fi-ink); font-size: 0.8125rem; font-weight: 550; white-space: nowrap; text-decoration: none !important;
  box-shadow: 0 8px 20px -10px rgba(10, 20, 28, 0.45); transition: box-shadow 0.2s ease, transform 0.2s var(--fi-ease);
}
.nav-cta:hover { transform: translateY(-1px); box-shadow: 0 12px 24px -10px rgba(10, 20, 28, 0.55); }
.nav-cta-sep { width: 1px; height: 0.95rem; background: var(--fi-line-strong); }

.edge-arc { position: absolute; top: 50%; width: 1100px; height: 1100px; margin-top: -550px; border-radius: 50%; border: 1px solid rgba(255, 255, 255, 0.22); pointer-events: none; }
.edge-arc.left { right: calc(100% - 3.5rem); }
.edge-arc.right { left: calc(100% - 3.5rem); }
.arc-node { position: absolute; top: 50%; width: 1.5rem; height: 1.5rem; margin-top: -0.75rem; border-radius: 50%; background: rgba(255, 255, 255, 0.22); backdrop-filter: blur(6px); border: 1px solid rgba(255, 255, 255, 0.35); }
.arc-node::after { content: ''; position: absolute; inset: 0.5rem; border-radius: 50%; background: #fff; }
.edge-arc.left .arc-node { right: -0.75rem; }
.edge-arc.right .arc-node { left: -0.75rem; }

.hero-grid {
  display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 2rem;
  padding: 6.5rem clamp(4.5rem, 7vw, 7rem) 7rem;
}

.glass-chip {
  display: inline-flex; align-items: center; gap: 0.45rem;
  padding: 0.3rem 0.65rem; border-radius: 0.5rem;
  background: var(--glass); border: 1px solid var(--glass-line); backdrop-filter: blur(10px);
  color: #fff; font-size: 0.72rem; font-weight: 550; letter-spacing: 0.04em; text-transform: uppercase; text-decoration: none !important;
}
.hero-title { font-size: clamp(2.4rem, 4.2vw, 3.6rem); font-weight: 450; letter-spacing: -0.035em; line-height: 1.06; color: #fff; text-shadow: 0 2px 24px rgba(10, 20, 28, 0.25); }
.line-mask { display: block; overflow: hidden; padding-bottom: 0.06em; }
.hero-sub { max-width: 23rem; color: rgba(255, 255, 255, 0.8); font-size: 1rem; }
.btn-glass-solid { --bs-btn-bg: #fff; --bs-btn-color: var(--fi-ink); --bs-btn-hover-bg: #eef2f4; --bs-btn-hover-color: var(--fi-ink); --bs-btn-border-color: #fff; --bs-btn-hover-border-color: #eef2f4; --bs-btn-active-bg: #e2e8eb; --bs-btn-border-radius: 999px; box-shadow: 0 8px 24px -8px rgba(10, 20, 28, 0.4); }
.btn-glass { --bs-btn-bg: var(--glass); --bs-btn-color: #fff; --bs-btn-hover-bg: rgba(255, 255, 255, 0.24); --bs-btn-hover-color: #fff; --bs-btn-border-color: var(--glass-line); --bs-btn-hover-border-color: rgba(255, 255, 255, 0.45); --bs-btn-active-bg: rgba(255, 255, 255, 0.3); --bs-btn-active-color: #fff; --bs-btn-border-radius: 999px; backdrop-filter: blur(10px); }

/* Glass cards */
.glass-stack { display: flex; flex-direction: column; gap: 0.75rem; width: 17rem; text-align: left; }
.glass-card {
  padding: 1.1rem 1.25rem; border-radius: 1.6rem;
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.2), rgba(42, 60, 72, 0.22));
  border: 1px solid var(--glass-line); backdrop-filter: blur(18px) saturate(1.15); -webkit-backdrop-filter: blur(18px) saturate(1.15);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25), 0 20px 40px -24px rgba(10, 20, 28, 0.5);
}
.glass-title { font-size: 0.95rem; font-weight: 500; text-shadow: 0 1px 8px rgba(10, 20, 28, 0.25); }
.glass-muted { font-size: 0.75rem; color: rgba(255, 255, 255, 0.82); text-shadow: 0 1px 6px rgba(10, 20, 28, 0.3); }

.ring-btn { position: relative; width: 2.6rem; height: 2.6rem; display: inline-flex; align-items: center; justify-content: center; font-size: 0.95rem; }
.ring-btn svg { position: absolute; inset: 0; }
.ring-progress { transition: stroke-dasharray 0.9s var(--fi-ease); }

.gauge { position: relative; width: 10rem; height: 10rem; margin: 0.25rem auto 0.75rem; display: flex; align-items: center; justify-content: center; }
.gauge svg { position: absolute; inset: 0; }
.gauge-dot { fill: rgba(255, 255, 255, 0.35); transition: r 0.4s var(--fi-ease), fill 0.4s ease; }
.gauge-dot.lit { fill: #fff; }
.gauge-value { width: 3.6rem; height: 3.6rem; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; background: rgba(255, 255, 255, 0.2); border: 1px solid var(--glass-line); font-size: 1.05rem; font-weight: 550; letter-spacing: -0.02em; }

.glass-toggle { display: inline-flex; align-items: center; gap: 0.45rem; padding: 0.2rem 0.2rem 0.2rem 0.7rem; border-radius: 999px; background: rgba(255, 255, 255, 0.18); font-size: 0.72rem; }
.toggle-knob { width: 1.5rem; height: 1.5rem; border-radius: 50%; background: #fff; color: var(--fi-ink); display: inline-flex; align-items: center; justify-content: center; font-size: 0.7rem; }

.contour { position: relative; margin: 0.4rem -0.4rem 0.4rem; }
.contour svg { display: block; width: 100%; height: auto; }
.contour-chip { position: absolute; top: 28%; left: 12%; font-size: 0.62rem; border-radius: 999px; }
.contour-chip strong { font-weight: 650; }
.contour-you { position: absolute; left: 48%; top: 52%; width: 1.4rem; height: 1.4rem; border-radius: 50%; background: rgba(255, 255, 255, 0.9); color: #3b4f5b; display: inline-flex; align-items: center; justify-content: center; font-size: 0.7rem; }

.tip-card { position: relative; margin-top: 0.25rem; padding: 1rem 1.25rem 2rem; border-radius: 1.6rem; background: rgba(255, 255, 255, 0.95); color: var(--fi-ink); box-shadow: 0 24px 48px -20px rgba(10, 20, 28, 0.55); }
.tip-chip { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.2rem 0.55rem; border-radius: 999px; background: var(--fi-sunken); font-size: 0.66rem; font-weight: 600; letter-spacing: 0.04em; color: var(--fi-ink-2); }
.tip-text { margin-top: 0.75rem; font-size: 0.85rem; font-weight: 500; line-height: 1.35; max-width: 10.5rem; }
.tip-art { position: absolute; right: 1rem; top: 0.6rem; width: 4.5rem; height: 4.5rem; border-radius: 1.2rem; display: flex; align-items: center; justify-content: center; font-size: 2.2rem; color: #fff; background: linear-gradient(145deg, #4a5862, #1c262d); box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25), 0 12px 24px -10px rgba(10, 20, 28, 0.6); }
.tip-cta {
  position: absolute; left: 50%; bottom: -1rem; transform: translateX(-50%);
  display: inline-flex; align-items: center; gap: 0.75rem; padding: 0.55rem 1.1rem; border-radius: 999px;
  background: #fff; color: var(--fi-ink); font-size: 0.8rem; font-weight: 550; white-space: nowrap; text-decoration: none !important;
  box-shadow: 0 0 0 1px var(--fi-line), 0 8px 20px -8px rgba(10, 20, 28, 0.4); transition: box-shadow 0.2s ease;
}
.tip-cta:hover { box-shadow: 0 0 0 1px var(--fi-line-strong), 0 12px 24px -8px rgba(10, 20, 28, 0.5); }
.tip-cta-sep { width: 1px; height: 1rem; background: var(--fi-line-strong); }

/* Right rail */
.rail { flex-direction: column; align-items: flex-end; gap: 0.5rem; }
.rail button { background: none; border: 0; padding: 0.1rem 0; font-size: 1.15rem; color: rgba(255, 255, 255, 0.55); transition: color 0.3s ease, transform 0.3s var(--fi-ease); }
.rail button:hover { color: rgba(255, 255, 255, 0.85); }
.rail button.active { color: #fff; transform: translateX(-4px); }

/* Corners */
.hero-corner { position: absolute; bottom: 2rem; text-align: center; }
.corner-left { left: clamp(1.5rem, 4vw, 3.5rem); }
.corner-right { right: clamp(1.5rem, 4vw, 3.5rem); }
.avatar-stack { display: flex; justify-content: center; margin-bottom: 0.5rem; }
.avatar-stack span { width: 2.1rem; height: 2.1rem; border-radius: 50%; border: 2px solid rgba(255, 255, 255, 0.9); margin-left: -0.55rem; display: inline-flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: 650; }
.avatar-stack span:first-child { margin-left: 0; }
.corner-big { font-size: 1.6rem; font-weight: 450; letter-spacing: -0.03em; line-height: 1; }
.corner-small { font-size: 0.75rem; color: rgba(255, 255, 255, 0.85); margin-top: 0.2rem; }
.corner-pin { display: inline-flex; width: 2rem; height: 2rem; border-radius: 50%; align-items: center; justify-content: center; background: var(--glass); border: 1px solid var(--glass-line); backdrop-filter: blur(8px); margin-bottom: 0.4rem; }

.swap-enter-active, .swap-leave-active { transition: opacity 0.25s ease, transform 0.25s var(--fi-ease); }
.swap-enter-from { opacity: 0; transform: translateY(6px); }
.swap-leave-to { opacity: 0; transform: translateY(-6px); }

@media (max-width: 991.98px) {
  .hero-panel { min-height: 0; }
  .hero-grid { grid-template-columns: 1fr; justify-items: center; text-align: center; gap: 2.5rem; padding: 6.5rem 1.25rem 11rem; }
  .hero-sub { margin-inline: auto; }
  .hero-cta { justify-content: center; }
}
@media (max-width: 767.98px) {
  .hero-nav { grid-template-columns: 1fr auto; padding-top: calc(1.25rem + env(safe-area-inset-top)); }
}
@media (max-width: 575.98px) {
  .hero-frame { padding: 0.5rem; }
  .hero-panel { border-radius: 1.25rem; }
  .glass-stack { width: min(17rem, 100%); }
  .corner-left { left: 50%; transform: translateX(-50%); }
}

/* ── Below the fold ── */
.band-glass { background: rgba(255, 255, 255, 0.55); border-block: 1px solid rgba(255, 255, 255, 0.7); }
.trust { font-weight: 600; font-size: 0.95rem; color: var(--fi-subtle); }

.section-h2 { font-size: clamp(1.75rem, 3.2vw, 2.5rem); font-weight: 720; letter-spacing: -0.035em; line-height: 1.12; }

.bento { border-radius: var(--fi-radius-xl); transition: transform 0.3s var(--fi-ease), box-shadow 0.3s var(--fi-ease); position: relative; overflow: hidden; }
.bento::after {
  content: ''; position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity 0.3s ease;
  background: radial-gradient(400px 200px at 0% 0%, rgba(var(--fi-primary-rgb), 0.08), transparent 70%);
}
.bento:hover { transform: translateY(-3px); box-shadow: var(--fi-shadow-md); }
.bento:hover::after { opacity: 1; }
.bento .stat-icon { width: 2.75rem; height: 2.75rem; border-radius: 0.8rem; display: inline-flex; align-items: center; justify-content: center; font-size: 1.2rem; }

.step { padding: 1.5rem; border-radius: var(--fi-radius-lg); border: 1px solid var(--fi-line); background: var(--fi-surface); }
.step-n { font-size: 0.8rem; font-weight: 700; font-variant-numeric: tabular-nums; width: 2.25rem; height: 2.25rem; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; background: var(--fi-gradient); color: #fff; }

.cta-band { border-radius: 1.75rem; padding: clamp(2.5rem, 6vw, 4.5rem) 1.5rem; isolation: isolate; box-shadow: var(--fi-shadow-lg); }
.cta-scene { z-index: -2; }
.cta-shade { position: absolute; inset: 0; z-index: -1; background: linear-gradient(180deg, rgba(14, 26, 34, 0.15), rgba(14, 26, 34, 0.5)); }
</style>
