import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

let iconsConfigured = false
function ensureDefaultIcon() {
  if (iconsConfigured) return
  iconsConfigured = true
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
  })
}

export interface OrderMapPoint {
  lat: number
  lng: number
  label: string
}

/** Lightweight OpenStreetMap/Leaflet map — no API key required. */
export function OrderMap({ points, className }: { points: OrderMapPoint[]; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ensureDefaultIcon()
    if (!containerRef.current || points.length === 0) return

    const map = L.map(containerRef.current, { scrollWheelZoom: false })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map)

    for (const point of points) {
      L.marker([point.lat, point.lng]).addTo(map).bindPopup(point.label)
    }

    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 14)
    } else {
      const bounds = L.latLngBounds(points.map((point) => [point.lat, point.lng] as [number, number]))
      map.fitBounds(bounds, { padding: [32, 32] })
    }

    if (points.length === 2) {
      L.polyline(
        points.map((point) => [point.lat, point.lng] as [number, number]),
        { color: '#397461', weight: 3, dashArray: '6 8' },
      ).addTo(map)
    }

    return () => {
      map.remove()
    }
  }, [points])

  if (points.length === 0) return null

  return (
    <div
      ref={containerRef}
      className={className ?? 'h-72 w-full overflow-hidden rounded-xl border border-slate-200'}
    />
  )
}
