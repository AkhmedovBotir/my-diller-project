import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  MapPinned,
  UserCog,
  X,
} from 'lucide-react'
import { api, getErrorField, getErrorMessage } from '../../shared/api'
import { CustomSelect } from '../../shared/CustomSelect'
import { formatDateTime } from '../../shared/date'
import { PasswordInput } from '../../shared/PasswordInput'
import { PhoneInput } from '../../shared/PhoneInput'
import { useSnackbar } from '../../shared/Snackbar'
import type { Admin, AdminInput, AdminRole } from '../../shared/types'

const roleStyle: Record<AdminRole, string> = {
  general: 'bg-violet-50 text-violet-700',
  admin: 'bg-blue-50 text-blue-700',
  kurator: 'bg-amber-50 text-amber-700',
}

const roleLabel: Record<AdminRole, string> = {
  general: 'General',
  admin: 'Admin',
  kurator: 'Kurator',
}

export function AdminsPage({
  readOnly = false,
  typeFilter,
  title = 'Adminlar boshqaruvi',
  subtitle = "Tizim foydalanuvchilari va ularning ruxsatlarini boshqaring",
  hideTypeFilter = false,
}: {
  readOnly?: boolean
  typeFilter?: AdminRole
  title?: string
  subtitle?: string
  hideTypeFilter?: boolean
}) {
  const { showSnackbar } = useSnackbar()
  const [admins, setAdmins] = useState<Admin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [offset, setOffset] = useState(0)
  const [editing, setEditing] = useState<Admin | 'new' | null>(null)
  const [viewing, setViewing] = useState<Admin | null>(null)
  const [deleting, setDeleting] = useState<Admin | null>(null)
  const [mfysFor, setMfysFor] = useState<Admin | null>(null)
  const limit = 20

  const loadAdmins = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setAdmins(await api.admins(limit, offset, typeFilter))
    } catch (loadError) {
      const message = getErrorMessage(loadError)
      setError(message)
      showSnackbar(message, 'error')
    } finally {
      setLoading(false)
    }
  }, [offset, showSnackbar, typeFilter])

  useEffect(() => {
    const task = window.setTimeout(() => void loadAdmins(), 0)
    return () => window.clearTimeout(task)
  }, [loadAdmins])

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    if (!query) return admins
    return admins.filter((admin) =>
      `${admin.first_name} ${admin.last_name} ${admin.username} ${admin.phone}`
        .toLocaleLowerCase()
        .includes(query),
    )
  }, [admins, search])

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900">{title}</h2>
          <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
        </div>
        {!readOnly && (
          <motion.button
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setEditing('new')}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#173c32] px-5 text-sm font-bold text-white shadow-lg shadow-[#173c32]/10"
          >
            <Plus size={18} />
            Yangi admin
          </motion.button>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Ism, login yoki telefon bo‘yicha qidirish"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-sm outline-none transition focus:border-[#397461] focus:bg-white"
            />
          </div>
          <p className="text-xs text-slate-400">
            Jami: <span className="font-bold text-slate-700">{admins.length}</span>
          </p>
        </div>

        {loading ? (
          <AdminTableSkeleton />
        ) : error ? (
          <div className="grid min-h-72 place-items-center p-6 text-center">
            <div>
              <AlertTriangle className="mx-auto mb-3 text-red-400" />
              <p className="text-sm font-semibold text-red-600">{error}</p>
              <button onClick={() => void loadAdmins()} className="mt-4 text-xs font-bold text-[#397461]">Qayta urinish</button>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead>
                  <tr className="bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-4">Admin</th>
                    <th className="px-4 py-4">Telefon</th>
                    <th className="px-4 py-4">Turi</th>
                    <th className="px-4 py-4">Yaratilgan sana</th>
                    <th className="px-6 py-4 text-right">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((admin, index) => (
                    <motion.tr
                      key={admin.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.025 }}
                      className="group hover:bg-slate-50/50"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#eff8f3] text-xs font-bold text-[#397461]">
                            {admin.first_name.charAt(0)}{admin.last_name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{admin.first_name} {admin.last_name}</p>
                            <p className="mt-0.5 text-xs text-slate-400">@{admin.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">{admin.phone}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${roleStyle[admin.type]}`}>
                          {roleLabel[admin.type]}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-500">
                        {formatDateTime(admin.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => setViewing(admin)}
                            className="grid size-9 place-items-center rounded-lg text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-700"
                            title="Ko‘rish"
                            aria-label={`${admin.first_name} ${admin.last_name} ma’lumotlarini ko‘rish`}
                          >
                            <Eye size={16} />
                          </button>
                          {!readOnly && (
                            <>
                            {typeFilter === 'kurator' && (
                              <button
                                onClick={() => setMfysFor(admin)}
                                className="grid size-9 place-items-center rounded-lg text-slate-400 transition hover:bg-amber-50 hover:text-amber-700"
                                title="Hududlar"
                              >
                                <MapPinned size={16} />
                              </button>
                            )}
                            <button
                              onClick={() => setEditing(admin)}
                              className="grid size-9 place-items-center rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                              title="Tahrirlash"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => setDeleting(admin)}
                              className="grid size-9 place-items-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                              title="O‘chirish"
                            >
                              <Trash2 size={16} />
                            </button>
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="py-16 text-center text-sm text-slate-400">Admin topilmadi</div>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
              <p className="text-xs text-slate-400">{offset + 1}–{offset + admins.length} ko‘rsatilmoqda</p>
              <div className="flex gap-2">
                <button
                  disabled={offset === 0}
                  onClick={() => setOffset((current) => Math.max(0, current - limit))}
                  className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  disabled={admins.length < limit}
                  onClick={() => setOffset((current) => current + limit)}
                  className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      <AnimatePresence>
        {viewing && (
          <AdminViewModal
            admin={viewing}
            onClose={() => setViewing(null)}
            onEdit={
              readOnly
                ? undefined
                : () => {
                    setViewing(null)
                    setEditing(viewing)
                  }
            }
          />
        )}
        {editing && (
          <AdminFormModal
            admin={editing === 'new' ? undefined : editing}
            defaultType={typeFilter}
            hideTypeField={hideTypeFilter}
            onClose={() => setEditing(null)}
            onSaved={() => {
              setEditing(null)
              void loadAdmins()
            }}
          />
        )}
        {deleting && (
          <DeleteModal
            admin={deleting}
            onClose={() => setDeleting(null)}
            onDeleted={() => {
              setDeleting(null)
              void loadAdmins()
            }}
          />
        )}
        {mfysFor && (
          <KuratorMfysModal
            kurator={mfysFor}
            onClose={() => setMfysFor(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function AdminViewModal({
  admin,
  onClose,
  onEdit,
}: {
  admin: Admin
  onClose: () => void
  onEdit?: () => void
}) {
  const details = [
    { label: 'Ism', value: admin.first_name },
    { label: 'Familiya', value: admin.last_name },
    { label: 'Telefon', value: admin.phone },
    { label: 'Foydalanuvchi nomi', value: `@${admin.username}` },
    { label: 'Yaratilgan', value: formatDateTime(admin.created_at) },
    { label: 'Yangilangan', value: formatDateTime(admin.updated_at) },
  ]

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-[#eff8f3] text-[#397461]">
            <Eye size={20} />
          </div>
          <div>
            <h3 className="font-bold">Admin ma’lumotlari</h3>
            <p className="mt-0.5 text-xs text-slate-400">To‘liq profil ma’lumotlari</p>
          </div>
        </div>
        <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
          <X size={19} />
        </button>
      </div>
      <div className="p-6">
        <div className="mb-6 flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
          <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[#dff6b0] text-lg font-bold text-[#173c32]">
            {admin.first_name.charAt(0)}{admin.last_name.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-slate-900">{admin.first_name} {admin.last_name}</p>
            <span className={`mt-1.5 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${roleStyle[admin.type]}`}>
              {roleLabel[admin.type]}
            </span>
          </div>
        </div>
        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {details.map((detail) => (
            <div key={detail.label}>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{detail.label}</dt>
              <dd className="mt-1.5 text-sm font-semibold text-slate-700">{detail.value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-7 flex justify-end gap-3 border-t border-slate-100 pt-5">
          <button onClick={onClose} className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-600">
            Yopish
          </button>
          {onEdit && (
            <button onClick={onEdit} className="flex h-11 items-center gap-2 rounded-xl bg-[#173c32] px-5 text-sm font-bold text-white">
              <Pencil size={16} />
              O‘zgartirish
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}

function AdminTableSkeleton() {
  return (
    <div className="animate-pulse" aria-label="Adminlar yuklanmoqda">
      <div className="grid grid-cols-[2fr_1.2fr_.8fr_1.2fr_.7fr] gap-4 bg-slate-50/70 px-6 py-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-2.5 rounded-full bg-slate-200" />
        ))}
      </div>
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="grid min-w-[760px] grid-cols-[2fr_1.2fr_.8fr_1.2fr_.7fr] items-center gap-4 border-t border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="size-10 shrink-0 rounded-xl bg-slate-200" />
            <div className="w-full space-y-2">
              <div className="h-3 w-2/3 rounded-full bg-slate-200" />
              <div className="h-2.5 w-1/2 rounded-full bg-slate-100" />
            </div>
          </div>
          <div className="h-3 w-3/4 rounded-full bg-slate-200" />
          <div className="h-6 w-16 rounded-full bg-slate-200" />
          <div className="h-3 w-3/4 rounded-full bg-slate-200" />
          <div className="ml-auto h-8 w-24 rounded-lg bg-slate-200" />
        </div>
      ))}
    </div>
  )
}

function AdminFormModal({
  admin,
  defaultType,
  hideTypeField = false,
  onClose,
  onSaved,
}: {
  admin?: Admin
  defaultType?: AdminRole
  hideTypeField?: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const { showSnackbar } = useSnackbar()
  const [saving, setSaving] = useState(false)
  const [errorField, setErrorField] = useState<string>()
  const [adminType, setAdminType] = useState<AdminRole>(admin?.type ?? defaultType ?? 'admin')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setErrorField(undefined)
    const form = new FormData(event.currentTarget)
    const input: AdminInput = {
      first_name: String(form.get('first_name')),
      last_name: String(form.get('last_name')),
      phone: String(form.get('phone')),
      username: String(form.get('username')),
      password: String(form.get('password')),
      type: hideTypeField ? (defaultType ?? 'kurator') : adminType,
    }
    if (admin && !input.password) delete input.password
    try {
      if (admin) await api.updateAdmin(admin.id, input)
      else await api.createAdmin(input)
      showSnackbar(admin ? 'Admin ma’lumotlari yangilandi' : 'Yangi admin yaratildi')
      onSaved()
    } catch (saveError) {
      showSnackbar(getErrorMessage(saveError), 'error')
      setErrorField(getErrorField(saveError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-[#eff8f3] text-[#397461]"><UserCog size={20} /></div>
          <div>
            <h3 className="font-bold">{admin ? 'Adminni tahrirlash' : 'Yangi admin'}</h3>
            <p className="mt-0.5 text-xs text-slate-400">Ma’lumotlarni to‘liq kiriting</p>
          </div>
        </div>
        <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={19} /></button>
      </div>
      <form onSubmit={handleSubmit} className="p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <ModalField name="first_name" label="Ism" defaultValue={admin?.first_name} invalid={errorField === 'first_name'} />
          <ModalField name="last_name" label="Familiya" defaultValue={admin?.last_name} invalid={errorField === 'last_name'} />
          <PhoneInput label="Telefon" defaultValue={admin?.phone} invalid={errorField === 'phone'} size="sm" />
          <ModalField name="username" label="Login" defaultValue={admin?.username} invalid={errorField === 'username'} />
          {!hideTypeField ? (
            <CustomSelect
              label="Admin turi"
              name="type"
              value={adminType}
              invalid={errorField === 'type'}
              options={[
                { value: 'general', label: 'General' },
                { value: 'admin', label: 'Admin' },
                { value: 'kurator', label: 'Kurator' },
              ]}
              onChange={(value) => setAdminType(value as AdminRole)}
            />
          ) : (
            <input type="hidden" name="type" value={defaultType ?? 'kurator'} />
          )}
          <PasswordInput
            label={admin ? 'Yangi parol (ixtiyoriy)' : 'Parol'}
            required={!admin}
            invalid={errorField === 'password'}
            size="sm"
          />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-600">Bekor qilish</button>
          <button disabled={saving} className="flex h-11 items-center gap-2 rounded-xl bg-[#173c32] px-5 text-sm font-bold text-white disabled:opacity-60">
            {saving && <LoaderCircle className="animate-spin" size={17} />}
            {saving ? 'Saqlanmoqda...' : admin ? 'Saqlash' : 'Admin yaratish'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function DeleteModal({ admin, onClose, onDeleted }: { admin: Admin; onClose: () => void; onDeleted: () => void }) {
  const { showSnackbar } = useSnackbar()
  const [loading, setLoading] = useState(false)

  async function remove() {
    setLoading(true)
    try {
      await api.deleteAdmin(admin.id)
      showSnackbar('Admin muvaffaqiyatli o‘chirildi')
      onDeleted()
    } catch (deleteError) {
      showSnackbar(getErrorMessage(deleteError), 'error')
      setLoading(false)
    }
  }

  return (
    <Modal onClose={onClose} narrow>
      <div className="p-6 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-red-50 text-red-500"><Trash2 size={24} /></div>
        <h3 className="mt-5 text-lg font-bold">Adminni o‘chirasizmi?</h3>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          <span className="font-semibold text-slate-600">{admin.first_name} {admin.last_name}</span> tizimdan butunlay o‘chiriladi.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button onClick={onClose} className="h-11 rounded-xl border border-slate-200 text-sm font-bold text-slate-600">Bekor qilish</button>
          <button onClick={() => void remove()} disabled={loading} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-red-500 text-sm font-bold text-white disabled:opacity-60">
            {loading && <LoaderCircle className="animate-spin" size={17} />}
            {loading ? 'O‘chirilmoqda...' : 'Ha, o‘chirish'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function KuratorMfysModal({ kurator, onClose }: { kurator: Admin; onClose: () => void }) {
  const { showSnackbar } = useSnackbar()
  const [regions, setRegions] = useState<{ id: number; name: string }[]>([])
  const [districts, setDistricts] = useState<{ id: number; name: string }[]>([])
  const [mfys, setMfys] = useState<{ id: number; name: string }[]>([])
  const [regionId, setRegionId] = useState('')
  const [districtId, setDistrictId] = useState('')
  const [selected, setSelected] = useState<{ id: number; name: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      try {
        const [regs, assigned] = await Promise.all([
          api.regions({ type: 'region', limit: 200 }),
          api.kuratorMfys(kurator.id),
        ])
        setRegions(regs)
        setSelected(assigned.map((item) => ({ id: item.id, name: item.name })))
      } catch (error) {
        showSnackbar(getErrorMessage(error), 'error')
      } finally {
        setLoading(false)
      }
    })()
  }, [kurator.id, showSnackbar])

  useEffect(() => {
    if (!regionId) {
      setDistricts([])
      setDistrictId('')
      setMfys([])
      return
    }
    void (async () => {
      try {
        setDistricts(await api.regions({ type: 'district', parent_id: Number(regionId), limit: 500 }))
        setDistrictId('')
        setMfys([])
      } catch (error) {
        showSnackbar(getErrorMessage(error), 'error')
      }
    })()
  }, [regionId, showSnackbar])

  useEffect(() => {
    if (!districtId) {
      setMfys([])
      return
    }
    void (async () => {
      try {
        setMfys(await api.regions({ type: 'mfy', parent_id: Number(districtId), limit: 2000 }))
      } catch (error) {
        showSnackbar(getErrorMessage(error), 'error')
      }
    })()
  }, [districtId, showSnackbar])

  function toggleMfy(item: { id: number; name: string }) {
    setSelected((current) =>
      current.some((row) => row.id === item.id)
        ? current.filter((row) => row.id !== item.id)
        : [...current, item],
    )
  }

  async function handleSave() {
    setSaving(true)
    try {
      await api.setKuratorMfys(kurator.id, selected.map((item) => item.id))
      showSnackbar('Kurator hududlari saqlandi')
      onClose()
    } catch (error) {
      showSnackbar(getErrorMessage(error), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="border-b border-slate-100 px-6 py-5">
        <h3 className="font-bold">
          {kurator.first_name} {kurator.last_name} — hududlar
        </h3>
        <p className="mt-1 text-xs text-slate-400">Bir nechta MFY biriktirishingiz mumkin</p>
      </div>
      <div className="max-h-[70vh] space-y-4 overflow-y-auto p-6">
        {loading ? (
          <div className="flex justify-center py-10 text-slate-400">
            <LoaderCircle className="animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <CustomSelect
                label="Viloyat"
                value={regionId}
                placeholder="Viloyat"
                options={regions.map((item) => ({ value: String(item.id), label: item.name }))}
                onChange={(value) => setRegionId(value)}
              />
              <CustomSelect
                label="Tuman"
                value={districtId}
                placeholder="Tuman"
                disabled={!regionId}
                options={districts.map((item) => ({ value: String(item.id), label: item.name }))}
                onChange={(value) => setDistrictId(value)}
              />
              <CustomSelect
                label="MFY qo‘shish"
                value=""
                placeholder="MFY qo‘shish..."
                disabled={!districtId || mfys.length === 0}
                options={mfys.map((item) => ({ value: String(item.id), label: item.name }))}
                onChange={(value) => {
                  const id = Number(value)
                  const item = mfys.find((row) => row.id === id)
                  if (item) toggleMfy(item)
                }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {selected.length === 0 && <p className="text-sm text-slate-400">Hali MFY tanlanmagan</p>}
              {selected.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleMfy(item)}
                  className="rounded-full bg-[#eff8f3] px-3 py-1.5 text-xs font-bold text-[#173c32]"
                >
                  {item.name} ×
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      <div className="flex gap-2 border-t border-slate-100 p-4">
        <button onClick={onClose} className="h-11 flex-1 rounded-xl bg-slate-100 text-sm font-bold text-slate-700">
          Bekor
        </button>
        <button
          disabled={saving}
          onClick={() => void handleSave()}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#173c32] text-sm font-bold text-white disabled:opacity-60"
        >
          {saving && <LoaderCircle size={16} className="animate-spin" />}
          Saqlash
        </button>
      </div>
    </Modal>
  )
}

function Modal({ children, onClose, narrow = false }: { children: React.ReactNode; onClose: () => void; narrow?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        className={`w-full overflow-hidden rounded-2xl bg-white shadow-2xl ${narrow ? 'max-w-md' : 'max-w-2xl'}`}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

function ModalField({
  name,
  label,
  type = 'text',
  defaultValue,
  placeholder,
  required = true,
  invalid = false,
}: {
  name: string
  label: string
  type?: string
  defaultValue?: string
  placeholder?: string
  required?: boolean
  invalid?: boolean
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold text-slate-600">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        minLength={type === 'password' ? 6 : undefined}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={`h-11 w-full rounded-xl border px-3 text-sm outline-none transition focus:ring-4 ${
          invalid
            ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
            : 'border-slate-200 focus:border-[#397461] focus:ring-[#397461]/8'
        }`}
      />
    </label>
  )
}
