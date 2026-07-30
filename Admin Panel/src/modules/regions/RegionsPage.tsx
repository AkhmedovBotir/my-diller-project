import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  LoaderCircle,
  MapPinned,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { api, getErrorField, getErrorMessage } from '../../shared/api'
import { useSnackbar } from '../../shared/Snackbar'
import type { Region, RegionType } from '../../shared/types'

export function RegionsPage() {
  const { showSnackbar } = useSnackbar()
  const [regions, setRegions] = useState<Region[]>([])
  const [districts, setDistricts] = useState<Region[]>([])
  const [mfys, setMfys] = useState<Region[]>([])
  const [regionId, setRegionId] = useState<number | null>(null)
  const [districtId, setDistrictId] = useState<number | null>(null)
  const [loadingRegions, setLoadingRegions] = useState(true)
  const [loadingDistricts, setLoadingDistricts] = useState(false)
  const [loadingMfys, setLoadingMfys] = useState(false)
  const [importing, setImporting] = useState(false)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<{ mode: 'new' | 'edit'; type: RegionType; item?: Region } | null>(null)
  const [deleting, setDeleting] = useState<Region | null>(null)

  const loadRegions = useCallback(async () => {
    setLoadingRegions(true)
    try {
      const list = await api.regions({ type: 'region', status: 'all', limit: 200 })
      setRegions(list)
      setRegionId((current) => {
        if (current && list.some((item) => item.id === current)) return current
        return list[0]?.id ?? null
      })
    } catch (error) {
      showSnackbar(getErrorMessage(error), 'error')
    } finally {
      setLoadingRegions(false)
    }
  }, [showSnackbar])

  const loadDistricts = useCallback(async (parentId: number) => {
    setLoadingDistricts(true)
    try {
      const list = await api.regions({ type: 'district', parent_id: parentId, status: 'all', limit: 500 })
      setDistricts(list)
      setDistrictId((current) => {
        if (current && list.some((item) => item.id === current)) return current
        return list[0]?.id ?? null
      })
    } catch (error) {
      showSnackbar(getErrorMessage(error), 'error')
      setDistricts([])
      setDistrictId(null)
    } finally {
      setLoadingDistricts(false)
    }
  }, [showSnackbar])

  const loadMfys = useCallback(async (parentId: number) => {
    setLoadingMfys(true)
    try {
      setMfys(await api.regions({ type: 'mfy', parent_id: parentId, status: 'all', limit: 2000 }))
    } catch (error) {
      showSnackbar(getErrorMessage(error), 'error')
      setMfys([])
    } finally {
      setLoadingMfys(false)
    }
  }, [showSnackbar])

  useEffect(() => {
    const t = window.setTimeout(() => void loadRegions(), 0)
    return () => window.clearTimeout(t)
  }, [loadRegions])

  useEffect(() => {
    if (regionId == null) {
      setDistricts([])
      setDistrictId(null)
      return
    }
    const t = window.setTimeout(() => void loadDistricts(regionId), 0)
    return () => window.clearTimeout(t)
  }, [regionId, loadDistricts])

  useEffect(() => {
    if (districtId == null) {
      setMfys([])
      return
    }
    const t = window.setTimeout(() => void loadMfys(districtId), 0)
    return () => window.clearTimeout(t)
  }, [districtId, loadMfys])

  async function handleImport() {
    setImporting(true)
    try {
      const result = await api.importRegions()
      showSnackbar(`Import: ${result.inserted} yangi, ${result.updated} yangilandi (jami ${result.total})`)
      await loadRegions()
    } catch (error) {
      showSnackbar(getErrorMessage(error), 'error')
    } finally {
      setImporting(false)
    }
  }

  const q = search.trim().toLocaleLowerCase()
  const filteredRegions = useMemo(
    () => (q ? regions.filter((item) => item.name.toLocaleLowerCase().includes(q)) : regions),
    [regions, q],
  )
  const filteredDistricts = useMemo(
    () => (q ? districts.filter((item) => item.name.toLocaleLowerCase().includes(q)) : districts),
    [districts, q],
  )
  const filteredMfys = useMemo(
    () => (q ? mfys.filter((item) => item.name.toLocaleLowerCase().includes(q)) : mfys),
    [mfys, q],
  )

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[28px] bg-[#173c32] px-6 py-7 text-white sm:px-8">
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1.5 text-xs font-semibold text-[#c9f560]">
              <MapPinned size={14} />
              Hududiy katalog
            </div>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">Viloyat, tuman va MFY</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-50/60">
              Hududlarni boshqaring yoki regions.json dan import qiling.
            </p>
          </div>
          <button
            onClick={() => void handleImport()}
            disabled={importing}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#c9f560] px-4 text-sm font-bold text-[#173c32] disabled:opacity-60"
          >
            {importing ? <LoaderCircle size={16} className="animate-spin" /> : <Upload size={16} />}
            Import
          </button>
        </div>
      </section>

      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Qidirish..."
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-[#397461]"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Column
          title="Viloyatlar"
          count={regions.length}
          loading={loadingRegions}
          onAdd={() => setModal({ mode: 'new', type: 'region' })}
        >
          {filteredRegions.map((item) => (
            <ListRow
              key={item.id}
              active={item.id === regionId}
              name={item.name}
              onSelect={() => setRegionId(item.id)}
              onEdit={() => setModal({ mode: 'edit', type: 'region', item })}
              onDelete={() => setDeleting(item)}
            />
          ))}
        </Column>

        <Column
          title="Tumanlar"
          count={districts.length}
          loading={loadingDistricts}
          onAdd={() => (regionId ? setModal({ mode: 'new', type: 'district' }) : showSnackbar('Avval viloyat tanlang', 'error'))}
        >
          {filteredDistricts.map((item) => (
            <ListRow
              key={item.id}
              active={item.id === districtId}
              name={item.name}
              onSelect={() => setDistrictId(item.id)}
              onEdit={() => setModal({ mode: 'edit', type: 'district', item })}
              onDelete={() => setDeleting(item)}
            />
          ))}
        </Column>

        <Column
          title="MFY"
          count={mfys.length}
          loading={loadingMfys}
          onAdd={() => (districtId ? setModal({ mode: 'new', type: 'mfy' }) : showSnackbar('Avval tuman tanlang', 'error'))}
        >
          {filteredMfys.map((item) => (
            <ListRow
              key={item.id}
              active={false}
              name={item.name}
              onSelect={() => undefined}
              onEdit={() => setModal({ mode: 'edit', type: 'mfy', item })}
              onDelete={() => setDeleting(item)}
            />
          ))}
        </Column>
      </div>

      <AnimatePresence>
        {modal && (
          <RegionFormModal
            mode={modal.mode}
            type={modal.type}
            item={modal.item}
            parentId={modal.type === 'district' ? regionId : modal.type === 'mfy' ? districtId : null}
            onClose={() => setModal(null)}
            onSaved={async () => {
              setModal(null)
              if (modal.type === 'region') await loadRegions()
              else if (modal.type === 'district' && regionId) await loadDistricts(regionId)
              else if (modal.type === 'mfy' && districtId) await loadMfys(districtId)
            }}
          />
        )}
        {deleting && (
          <ConfirmDelete
            name={deleting.name}
            onClose={() => setDeleting(null)}
            onConfirm={async () => {
              try {
                await api.deleteRegion(deleting.id)
                showSnackbar('Hudud o‘chirildi')
                setDeleting(null)
                if (deleting.type === 'region') await loadRegions()
                else if (deleting.type === 'district' && regionId) await loadDistricts(regionId)
                else if (deleting.type === 'mfy' && districtId) await loadMfys(districtId)
              } catch (error) {
                showSnackbar(getErrorMessage(error), 'error')
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function Column({
  title,
  count,
  loading,
  onAdd,
  children,
}: {
  title: string
  count: number
  loading: boolean
  onAdd: () => void
  children: ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 p-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          <p className="text-[11px] text-slate-400">{count} ta</p>
        </div>
        <button onClick={onAdd} className="flex h-9 items-center gap-1.5 rounded-xl bg-[#173c32] px-3 text-xs font-bold text-white">
          <Plus size={15} />
          Qo‘shish
        </button>
      </div>
      <div className="max-h-[60vh] space-y-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex justify-center py-10 text-slate-400">
            <LoaderCircle className="animate-spin" size={22} />
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  )
}

function ListRow({
  name,
  active,
  onSelect,
  onEdit,
  onDelete,
}: {
  name: string
  active: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-xl px-3 py-2.5 ${
        active ? 'bg-[#eff8f3] text-[#173c32]' : 'hover:bg-slate-50'
      }`}
    >
      <button onClick={onSelect} className="min-w-0 flex-1 text-left text-sm font-medium">
        {name}
      </button>
      <button onClick={onEdit} className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-700">
        <Pencil size={14} />
      </button>
      <button onClick={onDelete} className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-red-600">
        <Trash2 size={14} />
      </button>
    </div>
  )
}

function RegionFormModal({
  mode,
  type,
  item,
  parentId,
  onClose,
  onSaved,
}: {
  mode: 'new' | 'edit'
  type: RegionType
  item?: Region
  parentId: number | null
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const { showSnackbar } = useSnackbar()
  const [saving, setSaving] = useState(false)
  const [errorField, setErrorField] = useState<string>()
  const label = type === 'region' ? 'Viloyat' : type === 'district' ? 'Tuman' : 'MFY'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setErrorField(undefined)
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name') || '').trim()
    const code = String(form.get('code') || '').trim()
    try {
      if (mode === 'edit' && item) {
        await api.updateRegion(item.id, {
          name,
          code,
          parent_id: type === 'region' ? null : parentId ?? item.parent_id,
          status: 'active',
        })
        showSnackbar(`${label} yangilandi`)
      } else {
        await api.createRegion({
          name,
          code,
          type,
          parent_id: type === 'region' ? null : parentId,
          status: 'active',
        })
        showSnackbar(`${label} qo‘shildi`)
      }
      await onSaved()
    } catch (error) {
      showSnackbar(getErrorMessage(error), 'error')
      setErrorField(getErrorField(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4 p-6">
        <div className="flex items-start justify-between">
          <h3 className="font-bold">{mode === 'edit' ? `${label}ni tahrirlash` : `Yangi ${label.toLowerCase()}`}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-slate-600">Nomi</span>
          <input
            name="name"
            required
            defaultValue={item?.name}
            className={`h-11 w-full rounded-xl border px-3 text-sm outline-none ${
              errorField === 'name' ? 'border-red-300' : 'border-slate-200 focus:border-[#397461]'
            }`}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-slate-600">Kod</span>
          <input
            name="code"
            defaultValue={item?.code}
            className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#397461]"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#173c32] text-sm font-bold text-white disabled:opacity-60"
        >
          {saving && <LoaderCircle size={16} className="animate-spin" />}
          Saqlash
        </button>
      </form>
    </Modal>
  )
}

function ConfirmDelete({ name, onClose, onConfirm }: { name: string; onClose: () => void; onConfirm: () => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  return (
    <Modal onClose={onClose}>
      <div className="space-y-4 p-6">
        <div className="flex items-center gap-3 text-amber-700">
          <AlertTriangle size={20} />
          <h3 className="font-bold">O‘chirish</h3>
        </div>
        <p className="text-sm text-slate-600">
          <span className="font-semibold">{name}</span> ni o‘chirasizmi?
        </p>
        <div className="flex gap-2">
          <button onClick={onClose} className="h-11 flex-1 rounded-xl bg-slate-100 text-sm font-bold text-slate-700">
            Bekor
          </button>
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              await onConfirm()
              setBusy(false)
            }}
            className="h-11 flex-1 rounded-xl bg-red-600 text-sm font-bold text-white disabled:opacity-60"
          >
            O‘chirish
          </button>
        </div>
      </div>
    </Modal>
  )
}

function Modal({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl"
        initial={{ y: 16, scale: 0.98 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 12, scale: 0.98 }}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}
