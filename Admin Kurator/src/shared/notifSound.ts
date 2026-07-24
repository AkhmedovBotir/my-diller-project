const MUTE_KEY = 'mydiller_notif_sound'
const CHANGE_EVENT = 'notif-sound:change'

export function isNotifSoundMuted(): boolean {
  return localStorage.getItem(MUTE_KEY) === 'off'
}

export function setNotifSoundMuted(muted: boolean) {
  localStorage.setItem(MUTE_KEY, muted ? 'off' : 'on')
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function onNotifSoundChange(handler: () => void) {
  window.addEventListener(CHANGE_EVENT, handler)
  return () => window.removeEventListener(CHANGE_EVENT, handler)
}

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!audioCtx) audioCtx = new Ctor()
  return audioCtx
}

/** Plays a short two-tone beep via Web Audio API — no external audio file needed. */
export function playNotificationBeep() {
  if (isNotifSoundMuted()) return
  const ctx = getAudioContext()
  if (!ctx) return
  if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined)

  const now = ctx.currentTime
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()

  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(880, now)
  oscillator.frequency.exponentialRampToValueAtTime(1180, now + 0.12)

  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32)

  oscillator.connect(gain)
  gain.connect(ctx.destination)

  oscillator.start(now)
  oscillator.stop(now + 0.34)
}
