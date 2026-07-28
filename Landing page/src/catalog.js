import { API_URL, CABINETS } from './config.js'

const PAYMENT_TERM_LABEL = {
  prepay_100: '100% oldindan to‘lov',
  deferred: 'Muddatli to‘lov',
  pod_zakaz_50_50: '50/50 buyurtma asosida',
}

function formatMoney(value) {
  return new Intl.NumberFormat('uz-UZ').format(Number(value) || 0) + ' so‘m'
}

function productCardHTML(product) {
  const image = Array.isArray(product.images) ? product.images[0] : null
  const term = PAYMENT_TERM_LABEL[product.payment_term] || ''
  const href = `${CABINETS.user}/catalog/${product.id}`

  return `
    <a class="catalog-card reveal is-visible" href="${href}" target="_blank" rel="noreferrer">
      <div class="catalog-card-image">
        ${
          image
            ? `<img src="${image}" alt="${escapeHtml(product.name)}" loading="lazy" />`
            : `<div class="catalog-card-placeholder">📦</div>`
        }
        ${product.city ? `<span class="catalog-card-city">${escapeHtml(product.city)}</span>` : ''}
      </div>
      <div class="catalog-card-body">
        <p class="catalog-card-name">${escapeHtml(product.name)}</p>
        <p class="catalog-card-price">${formatMoney(product.price)}</p>
        ${term ? `<p class="catalog-card-term">${term}</p>` : ''}
      </div>
    </a>
  `
}

function escapeHtml(value) {
  const div = document.createElement('div')
  div.textContent = String(value ?? '')
  return div.innerHTML
}

export async function initCatalogPreview() {
  const grid = document.getElementById('catalogGrid')
  if (!grid) return

  try {
    const response = await fetch(`${API_URL}/catalog/products?limit=8`)
    if (!response.ok) throw new Error('request-failed')
    const data = await response.json()
    const products = Array.isArray(data) ? data : data.items || data.products || []

    if (!products.length) {
      grid.innerHTML = `<div class="catalog-empty">Hozircha tasdiqlangan mahsulotlar yo‘q</div>`
      return
    }

    grid.innerHTML = products.map(productCardHTML).join('')
  } catch {
    grid.innerHTML = `<div class="catalog-error">Katalogni yuklab bo‘lmadi. Iltimos, keyinroq urinib ko‘ring.</div>`
  }
}
