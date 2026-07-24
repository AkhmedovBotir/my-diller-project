import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, FileText, Receipt, Search, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api, getErrorMessage } from '../../shared/api'
import { formatDateTime } from '../../shared/date'
import { orderStatusLabel, orderStatusStyle } from '../../shared/order'
import { useSnackbar } from '../../shared/Snackbar'
import type { Hujjat } from '../../shared/types'

export function DocumentsPage() {
  const { showSnackbar } = useSnackbar()
  const [items, setItems] = useState<Hujjat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [activeDocument, setActiveDocument] = useState<{ title: string; html: string } | null>(null)

  async function load() {
    setLoading(true)
    setError('')
    try {
      setItems(await api.documents())
    } catch (loadError) {
      const message = getErrorMessage(loadError)
      setError(message)
      showSnackbar(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(task)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    if (!query) return items
    return items.filter((item) => `${item.order_number} ${item.invoice_number}`.toLocaleLowerCase().includes(query))
  }, [items, search])

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900">Hujjatlar</h2>
          <p className="mt-1 text-xs text-slate-400">Shartnoma, hisob-faktura va to‘lov kvitansiyalari</p>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buyurtma yoki hisob-faktura raqami"
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-sm outline-none transition focus:border-[#397461] focus:bg-white"
          />
        </div>
      </section>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-20 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
      ) : error ? (
        <div className="grid min-h-72 place-items-center rounded-2xl border border-slate-200/80 bg-white p-6 text-center">
          <div>
            <AlertTriangle className="mx-auto mb-3 text-red-400" />
            <p className="text-sm font-semibold text-red-600">{error}</p>
            <button onClick={() => void load()} className="mt-4 text-xs font-bold text-[#397461]">
              Qayta urinish
            </button>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white py-16 text-center text-sm text-slate-400">
          Hujjat topilmadi
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-3.5">Buyurtma</th>
                  <th className="px-4 py-3.5">Holat</th>
                  <th className="px-4 py-3.5">Hisob-faktura</th>
                  <th className="px-4 py-3.5">Yaratilgan</th>
                  <th className="px-6 py-3.5 text-right">Hujjatlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item, index) => (
                  <motion.tr
                    key={item.order_id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className="hover:bg-slate-50/50"
                  >
                    <td className="px-6 py-4">
                      <Link to={`/orders/${item.order_id}`} className="font-bold text-[#173c32] hover:underline">
                        {item.order_number}
                      </Link>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${orderStatusStyle[item.status]}`}>
                        {orderStatusLabel[item.status]}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-mono text-xs text-slate-500">{item.invoice_number || '—'}</td>
                    <td className="px-4 py-4 text-xs text-slate-500">{formatDateTime(item.created_at)}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <DocButton
                          disabled={!item.contract_html}
                          label="Shartnoma"
                          icon={FileText}
                          onClick={() => setActiveDocument({ title: `Shartnoma — ${item.order_number}`, html: item.contract_html })}
                        />
                        <DocButton
                          disabled={!item.invoice_html}
                          label="Hisob-faktura"
                          icon={Receipt}
                          onClick={() => setActiveDocument({ title: `Hisob-faktura — ${item.order_number}`, html: item.invoice_html })}
                        />
                        {item.advance_receipt_url && (
                          <DocLink href={item.advance_receipt_url} label="Avans kvitansiya" icon={Receipt} />
                        )}
                        {item.payment_receipt_url && (
                          <DocLink href={item.payment_receipt_url} label="To‘lov kvitansiya" icon={Receipt} />
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AnimatePresence>
        {activeDocument && (
          <DocumentModal document={activeDocument} onClose={() => setActiveDocument(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}

function DocLink({ href, label, icon: Icon }: { href: string; label: string; icon: typeof FileText }) {
  if (!href) return null
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title={label}
      className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-[#397461]/30 hover:text-[#397461]"
    >
      <Icon size={15} />
    </a>
  )
}

function DocButton({
  label,
  icon: Icon,
  disabled,
  onClick,
}: {
  label: string
  icon: typeof FileText
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`grid size-9 place-items-center rounded-lg border border-slate-200 transition ${
        disabled ? 'cursor-not-allowed text-slate-200' : 'text-slate-400 hover:border-[#397461]/30 hover:text-[#397461]'
      }`}
    >
      <Icon size={15} />
    </button>
  )
}

function DocumentModal({
  document,
  onClose,
}: {
  document: { title: string; html: string }
  onClose: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-6"
    >
      <button aria-label="Yopish" onClick={onClose} className="absolute inset-0 cursor-default" />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        className="relative z-10 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <h3 className="font-bold text-slate-900">{document.title}</h3>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto bg-slate-100 p-4">
          <iframe
            title={document.title}
            srcDoc={document.html}
            className="h-[70vh] w-full rounded-xl border border-slate-200 bg-white"
            sandbox=""
          />
        </div>
      </motion.div>
    </motion.div>
  )
}
