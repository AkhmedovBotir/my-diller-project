import { initCatalogPreview } from './catalog.js'

const yearEl = document.getElementById('year')
if (yearEl) yearEl.textContent = String(new Date().getFullYear())

void initCatalogPreview()

const revealTargets = document.querySelectorAll('.reveal')
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target)
        }
      }
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
  )
  revealTargets.forEach((el) => observer.observe(el))
} else {
  revealTargets.forEach((el) => el.classList.add('is-visible'))
}
