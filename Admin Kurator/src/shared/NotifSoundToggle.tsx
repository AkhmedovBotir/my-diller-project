import { useEffect, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { isNotifSoundMuted, onNotifSoundChange, setNotifSoundMuted } from './notifSound'

export function NotifSoundToggle({ className }: { className?: string }) {
  const [muted, setMuted] = useState(isNotifSoundMuted())

  useEffect(() => onNotifSoundChange(() => setMuted(isNotifSoundMuted())), [])

  return (
    <button
      type="button"
      onClick={() => setNotifSoundMuted(!muted)}
      aria-pressed={muted}
      title={muted ? 'Bildirishnoma ovozini yoqish' : 'Bildirishnoma ovozini o‘chirish'}
      className={
        className ??
        'grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:text-slate-900'
      }
    >
      {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
    </button>
  )
}
