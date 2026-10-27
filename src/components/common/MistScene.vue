<script>
// Ridge geometry is identical for every instance, so it's built once per page load
// rather than on each mount.
function rng(seed) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
}
// Overlapping triangles along a ground line read as a pine forest at this scale.
function forest({ seed, base, minH, maxH, minW, maxW, step, bottom = 620 }) {
  const r = rng(seed)
  let d = `M0 ${bottom} L0 ${base(0)}`
  for (let x = 0; x <= 1440; x += step * (0.6 + r() * 0.8)) {
    const y = base(x)
    const h = minH + r() * (maxH - minH)
    const w = minW + r() * (maxW - minW)
    d += ` L${(x - w / 2).toFixed(1)} ${y.toFixed(1)} L${x.toFixed(1)} ${(y - h).toFixed(1)} L${(x + w / 2).toFixed(1)} ${y.toFixed(1)}`
  }
  return `${d} L1440 ${base(1440)} L1440 ${bottom} Z`
}
// Valley profile: high on both edges, dipping toward the centre like a lake inlet.
const valley = (y0, lift, power = 1.6) => (x) => y0 - lift * Math.abs((x - 720) / 720) ** power

const RIDGES = [
  { d: forest({ seed: 11, base: valley(520, 70), minH: 14, maxH: 30, minW: 8, maxW: 14, step: 7 }), fill: '#7d909b' },
  { d: forest({ seed: 23, base: valley(548, 150, 1.4), minH: 26, maxH: 58, minW: 12, maxW: 22, step: 10 }), fill: '#5f7480' },
  { d: forest({ seed: 37, base: valley(575, 260, 1.9), minH: 50, maxH: 110, minW: 20, maxW: 36, step: 15 }), fill: '#435865' },
  { d: forest({ seed: 51, base: valley(600, 380, 2.6), minH: 80, maxH: 170, minW: 28, maxW: 50, step: 22 }), fill: '#2d3f4a' },
]
</script>

<script setup>
import { useId } from 'vue'

// Several scenes can share a page (app backdrop + landing hero), so gradient ids are per-instance.
const uid = useId()
const paint = (name) => `url(#${uid}-${name})`

defineProps({
  // Drifting fog. Off for static backdrops behind app pages.
  fog: { type: Boolean, default: false },
  // SVG alignment when the box isn't 16:10 — 'xMidYMax' keeps the forest low on tall screens.
  align: { type: String, default: 'xMidYMid' },
})
</script>

<template>
  <div class="mist" :class="{ 'mist-fog': fog }" aria-hidden="true">
    <svg class="mist-svg" viewBox="0 0 1440 900" :preserveAspectRatio="`${align} slice`">
      <defs>
        <linearGradient :id="`${uid}-sky`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#8a9daa" />
          <stop offset="0.55" stop-color="#b4c1c8" />
          <stop offset="1" stop-color="#d4dcdf" />
        </linearGradient>
        <linearGradient :id="`${uid}-water`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#9aabb4" />
          <stop offset="0.45" stop-color="#6b808c" />
          <stop offset="1" stop-color="#2b3c47" />
        </linearGradient>
        <linearGradient :id="`${uid}-haze`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#dfe6e8" stop-opacity="0" />
          <stop offset="1" stop-color="#dfe6e8" stop-opacity="0.85" />
        </linearGradient>
        <radialGradient :id="`${uid}-vignette`" cx="0.5" cy="0.45" r="0.75">
          <stop offset="0.55" stop-color="#0d1a22" stop-opacity="0" />
          <stop offset="1" stop-color="#0d1a22" stop-opacity="0.55" />
        </radialGradient>
      </defs>

      <rect width="1440" height="900" :fill="paint('sky')" />
      <path d="M0 470 L180 380 L320 430 L470 340 L620 420 L760 360 L900 425 L1050 330 L1220 410 L1440 350 L1440 560 L0 560 Z" fill="#a9b8c0" />
      <rect y="330" width="1440" height="240" :fill="paint('haze')" />

      <g v-for="(r, i) in RIDGES" :key="i">
        <path :d="r.d" :fill="r.fill" />
        <rect v-if="i < 3" y="380" width="1440" height="230" :fill="paint('haze')" :opacity="0.55 - i * 0.12" />
      </g>

      <!-- Lake + reflection -->
      <rect y="598" width="1440" height="302" :fill="paint('water')" />
      <path :d="RIDGES[3].d" fill="#22323c" opacity="0.2" transform="translate(0 1196) scale(1 -1)" />
      <g stroke="#e8eef0" stroke-linecap="round" stroke-opacity="0.6">
        <line x1="420" y1="660" x2="640" y2="660" stroke-width="1.5" opacity="0.25" />
        <line x1="820" y1="690" x2="1100" y2="690" stroke-width="1.5" opacity="0.2" />
        <line x1="260" y1="735" x2="520" y2="735" stroke-width="2" opacity="0.16" />
        <line x1="900" y1="770" x2="1180" y2="770" stroke-width="2" opacity="0.14" />
      </g>

      <!-- Foreground rocks -->
      <g fill="#1d2a32">
        <path d="M-20 900 L-20 790 Q40 760 120 778 Q210 770 260 812 Q300 850 290 900 Z" />
        <path d="M150 900 Q180 850 260 846 Q330 846 360 880 L370 900 Z" opacity="0.9" />
        <path d="M1110 900 Q1140 830 1240 818 Q1330 812 1380 850 Q1440 860 1460 900 Z" />
        <path d="M980 900 Q1000 868 1060 862 Q1110 862 1120 900 Z" opacity="0.85" />
        <path d="M560 860 Q600 846 650 852 Q680 862 670 874 Q610 884 560 876 Z" opacity="0.7" />
      </g>

      <rect width="1440" height="900" :fill="paint('vignette')" />
    </svg>

    <!-- Fog banks are soft gradients on their own layers: the GPU slides them without re-blurring. -->
    <span class="fog fog-a"></span>
    <span class="fog fog-b"></span>
    <span class="fog fog-c"></span>
  </div>
</template>

<style scoped>
.mist { position: absolute; inset: 0; overflow: hidden; contain: strict; background: #8a9daa; }
.mist-svg { position: absolute; inset: 0; width: 100%; height: 100%; }

.fog { position: absolute; left: -20%; width: 140%; border-radius: 50%; pointer-events: none; background: radial-gradient(closest-side, rgba(238, 242, 243, 0.6), rgba(238, 242, 243, 0)); }
.fog-a { top: 46%; height: 22%; }
.fog-b { top: 54%; height: 18%; opacity: 0.85; }
.fog-c { top: 36%; height: 26%; opacity: 0.6; }

.mist-fog .fog { will-change: transform; animation: drift 20s ease-in-out infinite alternate; }
.mist-fog .fog-b { animation-duration: 25s; animation-direction: alternate-reverse; }
.mist-fog .fog-c { animation-duration: 16s; }
@keyframes drift { to { transform: translate3d(8%, 0, 0); } }
@media (prefers-reduced-motion: reduce) { .mist-fog .fog { animation: none; } }
</style>
