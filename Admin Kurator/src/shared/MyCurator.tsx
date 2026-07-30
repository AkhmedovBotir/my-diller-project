import { Phone, UserRound } from 'lucide-react'

export type CuratorInfo = {
  id: number
  first_name: string
  last_name: string
  phone: string
  username?: string
}

export function MyCurator({
  curator,
  className = '',
  selfLabel = false,
}: {
  curator?: CuratorInfo | null
  className?: string
  selfLabel?: boolean
}) {
  if (!curator) {
    return (
      <div
        className={`rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-emerald-50/55 ${className}`}
      >
        <div className="flex items-center gap-3">
          <UserRound size={18} className="text-[#c9f560]" />
          <span>
            Kurator
            <span className="mt-0.5 block text-[11px] font-medium text-emerald-100/45">
              Hali biriktirilmagan
            </span>
          </span>
        </div>
      </div>
    )
  }

  const fullName = `${curator.first_name} ${curator.last_name}`.trim()
  const tg = curator.username?.replace(/^@/, '')
  const href = tg
    ? `https://t.me/${tg}`
    : curator.phone
      ? `tel:${curator.phone}`
      : undefined

  const content = (
    <>
      <UserRound size={18} className="text-[#c9f560]" />
      <span className="min-w-0">
        {selfLabel ? 'Sizning profilingiz' : 'Kuratoringiz'}
        <span className="mt-0.5 block truncate text-[11px] font-medium text-emerald-100/70">{fullName}</span>
        {curator.phone && (
          <span className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-emerald-100/45">
            <Phone size={11} />
            {curator.phone}
          </span>
        )}
        {tg && <span className="mt-0.5 block text-[11px] font-medium text-[#c9f560]/80">@{tg}</span>}
      </span>
    </>
  )

  const base = `flex items-center gap-3 rounded-xl border border-emerald-400/20 bg-emerald-950/30 px-3 py-3 text-sm font-semibold text-emerald-50/80 transition hover:bg-emerald-950/50 hover:text-white ${className}`

  if (href) {
    return (
      <a href={href} target={tg ? '_blank' : undefined} rel="noreferrer" className={base}>
        {content}
      </a>
    )
  }

  return <div className={base}>{content}</div>
}
