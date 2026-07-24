import { useEffect, useState } from 'react'

export interface Countdown {
  expired: boolean
  days: number
  hours: number
  minutes: number
  seconds: number
}

const pad = (value: number) => String(value).padStart(2, '0')

export function useCountdown(target: string | null | undefined): Countdown | null {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!target) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [target])

  if (!target) return null

  const targetMs = new Date(target).getTime()
  if (Number.isNaN(targetMs)) return null

  const diff = targetMs - now
  const expired = diff <= 0
  const abs = Math.max(diff, 0)

  return {
    expired,
    days: Math.floor(abs / 86_400_000),
    hours: Math.floor((abs % 86_400_000) / 3_600_000),
    minutes: Math.floor((abs % 3_600_000) / 60_000),
    seconds: Math.floor((abs % 60_000) / 1_000),
  }
}

export function formatCountdown(countdown: Countdown) {
  if (countdown.expired) return 'Muddat tugadi'
  if (countdown.days > 0) {
    return `${countdown.days} kun ${pad(countdown.hours)}:${pad(countdown.minutes)}:${pad(countdown.seconds)}`
  }
  return `${pad(countdown.hours)}:${pad(countdown.minutes)}:${pad(countdown.seconds)}`
}
