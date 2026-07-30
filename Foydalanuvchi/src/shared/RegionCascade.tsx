import { useEffect, useState } from 'react'
import { api } from './api'

type RegionOption = { id: number; name: string }

export function RegionCascade({
  value,
  onChange,
  required = true,
  invalid = false,
}: {
  value?: number | null
  onChange: (mfyId: number | null) => void
  required?: boolean
  invalid?: boolean
}) {
  const [regions, setRegions] = useState<RegionOption[]>([])
  const [districts, setDistricts] = useState<RegionOption[]>([])
  const [mfys, setMfys] = useState<RegionOption[]>([])
  const [regionId, setRegionId] = useState('')
  const [districtId, setDistrictId] = useState('')
  const [mfyId, setMfyId] = useState('')
  const [booting, setBooting] = useState(Boolean(value))

  useEffect(() => {
    void api.regions({ type: 'region', limit: 200 }).then(setRegions).catch(() => setRegions([]))
  }, [])

  useEffect(() => {
    if (!value) {
      setBooting(false)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const mfy = await api.region(value)
        if (!mfy.parent_id || cancelled) return
        const district = await api.region(mfy.parent_id)
        if (!district.parent_id || cancelled) return
        const region = await api.region(district.parent_id)
        if (cancelled) return
        setRegionId(String(region.id))
        const distList = await api.regions({ type: 'district', parent_id: region.id, limit: 500 })
        if (cancelled) return
        setDistricts(distList)
        setDistrictId(String(district.id))
        const mfyList = await api.regions({ type: 'mfy', parent_id: district.id, limit: 2000 })
        if (cancelled) return
        setMfys(mfyList)
        setMfyId(String(mfy.id))
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setBooting(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [value])

  useEffect(() => {
    if (booting || !regionId) {
      if (!regionId) {
        setDistricts([])
        setDistrictId('')
        setMfys([])
        setMfyId('')
      }
      return
    }
    void api
      .regions({ type: 'district', parent_id: Number(regionId), limit: 500 })
      .then((list) => {
        setDistricts(list)
        setDistrictId('')
        setMfys([])
        setMfyId('')
        onChange(null)
      })
      .catch(() => setDistricts([]))
  }, [regionId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (booting || !districtId) {
      if (!districtId) {
        setMfys([])
        setMfyId('')
      }
      return
    }
    void api
      .regions({ type: 'mfy', parent_id: Number(districtId), limit: 2000 })
      .then((list) => {
        setMfys(list)
        setMfyId('')
        onChange(null)
      })
      .catch(() => setMfys([]))
  }, [districtId]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectClass = `h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ${
    invalid ? 'border-red-300' : 'border-slate-200 focus:border-[#397461]'
  }`

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <label className="block sm:col-span-1">
        <span className="mb-1.5 block text-xs font-bold text-slate-600">Viloyat{required ? ' *' : ''}</span>
        <select
          value={regionId}
          required={required}
          disabled={booting}
          onChange={(event) => setRegionId(event.target.value)}
          className={selectClass}
        >
          <option value="">Tanlang</option>
          {regions.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-bold text-slate-600">Tuman{required ? ' *' : ''}</span>
        <select
          value={districtId}
          required={required}
          disabled={booting || !regionId}
          onChange={(event) => setDistrictId(event.target.value)}
          className={selectClass}
        >
          <option value="">Tanlang</option>
          {districts.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-bold text-slate-600">MFY{required ? ' *' : ''}</span>
        <select
          value={mfyId}
          required={required}
          disabled={booting || !districtId}
          onChange={(event) => {
            const next = event.target.value
            setMfyId(next)
            onChange(next ? Number(next) : null)
          }}
          className={selectClass}
        >
          <option value="">Tanlang</option>
          {mfys.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
