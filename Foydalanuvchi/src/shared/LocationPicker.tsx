import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Crosshair, LoaderCircle, MapPin } from 'lucide-react'
import { ensureLeafletDefaultIcon } from './leafletIcon'

const DEFAULT_CENTER: [number, number] = [41.3111, 69.2797] // Toshkent
const DEFAULT_ZOOM = 12

type Props = {
  lat: number | null
  lng: number | null
  onChange: (coords: { lat: number; lng: number; address?: string }) => void
  className?: string
}

/** Xaritadan nuqta tanlash — lat/lng (va ixtiyoriy manzil) formaga yoziladi. */
export function LocationPicker({ lat, lng, onChange, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const onChangeRef = useRef(onChange)
  const [geoLoading, setGeoLoading] = useState(false)
  const [hint, setHint] = useState('Xaritadan do‘kon joylashuvini bosing')

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    ensureLeafletDefaultIcon()
    if (!containerRef.current || mapRef.current) return

    const start: [number, number] =
      lat != null && lng != null ? [lat, lng] : DEFAULT_CENTER

    const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView(
      start,
      lat != null && lng != null ? 15 : DEFAULT_ZOOM,
    )
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map)

    if (lat != null && lng != null) {
      markerRef.current = L.marker([lat, lng]).addTo(map)
    }

    map.on('click', async (event: L.LeafletMouseEvent) => {
      const { lat: nextLat, lng: nextLng } = event.latlng
      if (markerRef.current) {
        markerRef.current.setLatLng([nextLat, nextLng])
      } else {
        markerRef.current = L.marker([nextLat, nextLng]).addTo(map)
      }
      setHint('Koordinatalar tanlandi — saqlashni unutmang')
      const address = await reverseGeocode(nextLat, nextLng)
      onChangeRef.current({ lat: nextLat, lng: nextLng, address })
    })

    mapRef.current = map
    setTimeout(() => map.invalidateSize(), 80)

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- map only once
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || lat == null || lng == null) return
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng])
    } else {
      markerRef.current = L.marker([lat, lng]).addTo(map)
    }
  }, [lat, lng])

  async function useMyLocation() {
    if (!navigator.geolocation) {
      setHint('Brauzer geolokatsiyani qo‘llab-quvvatlamaydi')
      return
    }
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const nextLat = pos.coords.latitude
        const nextLng = pos.coords.longitude
        mapRef.current?.setView([nextLat, nextLng], 16)
        if (markerRef.current) {
          markerRef.current.setLatLng([nextLat, nextLng])
        } else if (mapRef.current) {
          markerRef.current = L.marker([nextLat, nextLng]).addTo(mapRef.current)
        }
        const address = await reverseGeocode(nextLat, nextLng)
        onChangeRef.current({ lat: nextLat, lng: nextLng, address })
        setHint('Joriy joylashuvingiz tanlandi')
        setGeoLoading(false)
      },
      () => {
        setHint('Joylashuvni aniqlab bo‘lmadi — xaritadan tanlang')
        setGeoLoading(false)
      },
      { enableHighAccuracy: true, timeout: 12000 },
    )
  }

  return (
    <div className={className}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <MapPin size={14} className="text-[#397461]" />
          {hint}
        </p>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={geoLoading}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:border-[#397461]/40 hover:text-[#173c32] disabled:opacity-60"
        >
          {geoLoading ? <LoaderCircle size={14} className="animate-spin" /> : <Crosshair size={14} />}
          Mening joylashuvim
        </button>
      </div>
      <div
        ref={containerRef}
        className="z-0 h-72 w-full overflow-hidden rounded-xl border border-slate-200"
      />
      {lat != null && lng != null && (
        <p className="mt-2 text-[11px] font-medium text-slate-400">
          Tanlangan: {lat.toFixed(6)}, {lng.toFixed(6)}
        </p>
      )}
    </div>
  )
}

async function reverseGeocode(lat: number, lng: number): Promise<string | undefined> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=uz`,
      { headers: { Accept: 'application/json' } },
    )
    if (!response.ok) return undefined
    const data = (await response.json()) as { display_name?: string }
    return data.display_name?.trim() || undefined
  } catch {
    return undefined
  }
}
