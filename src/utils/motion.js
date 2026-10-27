import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/*
 * v-reveal — fade/slide an element (or its children) in when it scrolls into view.
 *   v-reveal                 → the element itself
 *   v-reveal.stagger         → its direct children, staggered
 *   v-reveal="{ y: 32, delay: 0.1, stagger: 0.08 }"
 */
const reveal = {
  mounted(el, { value = {}, modifiers }) {
    if (prefersReducedMotion()) return
    const targets = modifiers.stagger ? Array.from(el.children) : el
    if (!targets.length && targets !== el) return
    el._reveal = gsap.from(targets, {
      opacity: 0,
      y: value.y ?? 24,
      duration: value.duration ?? 0.7,
      delay: value.delay ?? 0,
      stagger: value.stagger ?? (modifiers.stagger ? 0.07 : 0),
      ease: 'power3.out',
      clearProps: 'opacity,transform',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    })
  },
  unmounted(el) {
    el._reveal?.scrollTrigger?.kill()
    el._reveal?.kill()
  },
}

/* v-count-up — tween a number from 0 to the bound value whenever it changes. */
const countUp = {
  mounted(el, { value }) {
    el._count = { n: 0 }
    tweenCount(el, Number(value) || 0)
  },
  updated(el, { value, oldValue }) {
    if (value !== oldValue) tweenCount(el, Number(value) || 0)
  },
  unmounted(el) {
    gsap.killTweensOf(el._count)
  },
}

function tweenCount(el, to) {
  if (prefersReducedMotion()) {
    el._count.n = to
    el.textContent = to.toLocaleString()
    return
  }
  gsap.to(el._count, {
    n: to,
    duration: 1.1,
    ease: 'power2.out',
    onUpdate: () => (el.textContent = Math.round(el._count.n).toLocaleString()),
  })
}

/* Route transition hooks for <Transition :css="false">. */
export const pageTransition = {
  onEnter(el, done) {
    if (prefersReducedMotion()) return done()
    gsap.fromTo(el, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out', clearProps: 'all', onComplete: done })
  },
  onLeave(el, done) {
    if (prefersReducedMotion()) return done()
    gsap.to(el, { opacity: 0, duration: 0.15, ease: 'power1.in', onComplete: done })
  },
  onAfterEnter() {
    ScrollTrigger.refresh()
  },
}

export const motion = {
  install(app) {
    app.directive('reveal', reveal)
    app.directive('count-up', countUp)
  },
}

export { gsap, ScrollTrigger }
