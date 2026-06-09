// Genera un EAN-13 plausibile (12 cifre random + check digit calcolato).
export function generateEAN13(): string {
  const digits: number[] = []
  for (let i = 0; i < 12; i++) digits.push(Math.floor(Math.random() * 10))
  let sum = 0
  digits.forEach((d, i) => { sum += d * (i % 2 === 0 ? 1 : 3) })
  const check = (10 - (sum % 10)) % 10
  return [...digits, check].join('')
}

// Genera un EAN-13 DETERMINISTICO da un numero base (per seed riproducibili).
// Prende le ultime 12 cifre di `base` (zero-pad) e calcola il check digit.
export function ean13FromBase(base: number): string {
  const body = String(Math.abs(base)).padStart(12, '0').slice(-12)
  const digits = body.split('').map(Number)
  let sum = 0
  digits.forEach((d, i) => { sum += d * (i % 2 === 0 ? 1 : 3) })
  const check = (10 - (sum % 10)) % 10
  return body + String(check)
}

export function isValidEAN13(code: string): boolean {
  if (!/^\d{13}$/.test(code)) return false
  const digits = code.split('').map(Number)
  let sum = 0
  for (let i = 0; i < 12; i++) sum += digits[i] * (i % 2 === 0 ? 1 : 3)
  return ((10 - (sum % 10)) % 10) === digits[12]
}
