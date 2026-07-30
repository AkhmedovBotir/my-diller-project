import { MessageCircle } from 'lucide-react'

const SUPPORT_URL = 'https://t.me/workmydiler'

export function TechnicalHelp({ className = '' }: { className?: string }) {
  return (
    <a
      href={SUPPORT_URL}
      target="_blank"
      rel="noreferrer"
      className={`flex items-center gap-3 rounded-xl border border-emerald-400/20 bg-emerald-950/30 px-3 py-3 text-sm font-semibold text-emerald-50/80 transition hover:bg-emerald-950/50 hover:text-white ${className}`}
    >
      <MessageCircle size={18} className="text-[#c9f560]" />
      <span>
        Texnik yordam
        <span className="mt-0.5 block text-[11px] font-medium text-emerald-100/45">@workmydiler</span>
      </span>
    </a>
  )
}
