function onlyDigits(value: string) {
  return value.replace(/\D/g, '')
}

/** Har qanday kiritilgan matndan 9 xonali lokal raqamni ajratadi. */
export function localPhoneDigits(raw: string) {
  let digits = onlyDigits(raw ?? '')
  if (digits.startsWith('998')) digits = digits.slice(3)
  else if (digits.length === 10 && digits.startsWith('0')) digits = digits.slice(1)
  else if (digits.length === 11 && digits.startsWith('8')) digits = digits.slice(1)
  return digits.slice(0, 9)
}

/** Kiritish uchun ko'rinish: "90 123 45 67". */
export function formatLocalPhone(raw: string) {
  const digits = localPhoneDigits(raw)
  return [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7, 9)]
    .filter((chunk) => chunk.length > 0)
    .join(' ')
}

/** Backendga yuboriladigan format: +998XXXXXXXXX. */
export function normalizePhone(raw: string) {
  const digits = localPhoneDigits(raw)
  return digits.length === 9 ? `+998${digits}` : ''
}

/** Ekranda ko'rsatish: "+998 90 123 45 67". */
export function formatPhoneDisplay(raw: string | null | undefined) {
  const local = formatLocalPhone(raw ?? '')
  return local ? `+998 ${local}` : ''
}

export function isValidPhone(raw: string) {
  return localPhoneDigits(raw).length === 9
}
