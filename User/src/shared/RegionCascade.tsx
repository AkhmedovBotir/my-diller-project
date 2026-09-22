import { useEffect, useState } from 'react'
import { api } from './api'
import { CustomSelect } from './CustomSelect'

export type RegionNames = {
  region_name: string
  city_name: string
  mfy_name: string
}

type Props = {
  value: RegionNames
  onChange: (next: RegionNames) => void
  invalid?: boolean
}

export function RegionCascade({ value, onChange, invalid = false }: Props) {
  const [regions, setRegions] = useState<{ id: number; name: string }[]>([])
  const [districts, setDistricts] = useState<{ id: number; name: string }[]>([])
  const [mfys, setMfys] = useState<{ id: number; name: string }[]>([])
  const [regionId, setRegionId] = useState('')
  const [districtId, setDistrictId] = useState('')
  const [mfyId, setMfyId] = useState('')

  useEffect(() => {
    void api.regions({ type: 'region', limit: 200 }).then(setRegions).catch(() => setRegions([]))
  }, [])

  useEffect(() => {
    if (!regionId) {
      setDistricts([])
      setDistrictId('')
      setMfys([])
      setMfyId('')
      return
    }
    void api
      .regions({ type: 'district', parent_id: Number(regionId), limit: 500 })
      .then((list) => {
        setDistricts(list)
        setDistrictId('')
        setMfys([])
        setMfyId('')
        onChange({ region_name: regions.find((r) => String(r.id) === regionId)?.name ?? '', city_name: '', mfy_name: '' })
      })
      .catch(() => setDistricts([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionId])

  useEffect(() => {
    if (!districtId) {
      setMfys([])
      setMfyId('')
      return
    }
    void api
      .regions({ type: 'mfy', parent_id: Number(districtId), limit: 2000 })
      .then((list) => {
        setMfys(list)
        setMfyId('')
        const regionName = regions.find((r) => String(r.id) === regionId)?.name ?? value.region_name
        const cityName = districts.find((d) => String(d.id) === districtId)?.name ?? ''
        onChange({ region_name: regionName, city_name: cityName, mfy_name: '' })
      })
      .catch(() => setMfys([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [districtId])

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <CustomSelect
        label="Viloyat"
        value={regionId}
        invalid={invalid && !value.region_name}
        options={regions.map((item) => ({ value: String(item.id), label: item.name }))}
        onChange={setRegionId}
        placeholder="Viloyat"
      />
      <CustomSelect
        label="Tuman"
        value={districtId}
        invalid={invalid && !value.city_name}
        disabled={!regionId}
        options={districts.map((item) => ({ value: String(item.id), label: item.name }))}
        onChange={setDistrictId}
        placeholder="Tuman"
      />
      <CustomSelect
        label="MFY"
        value={mfyId}
        invalid={invalid && !value.mfy_name}
        disabled={!districtId}
        options={mfys.map((item) => ({ value: String(item.id), label: item.name }))}
        onChange={(next) => {
          setMfyId(next)
          const mfy = mfys.find((item) => String(item.id) === next)
          onChange({
            region_name: regions.find((r) => String(r.id) === regionId)?.name ?? '',
            city_name: districts.find((d) => String(d.id) === districtId)?.name ?? '',
            mfy_name: mfy?.name ?? '',
          })
        }}
        placeholder="MFY"
      />
    </div>
  )
}
