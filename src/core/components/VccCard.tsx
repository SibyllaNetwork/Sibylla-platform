import React from 'react'
import './VccCard.sass'

// Genera in modo deterministico (dallo stesso seed → stessa carta) numero,
// scadenza e CVV di una VCC fittizia in formato Visa-like (16 cifre, "4...").
function genCard(seed: string) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  const u = (salt: number) => (Math.imul(h ^ salt, 2654435761) >>> 0)
  const g = (salt: number) => String(u(salt) % 10000).padStart(4, '0')
  const number = `4${g(1).slice(1)} ${g(2)} ${g(3)} ${g(4)}`
  const mm = String((u(5) % 12) + 1).padStart(2, '0')
  const yy = 2028 + (u(6) % 4)
  const cvv = String((u(7) % 900) + 100)
  return { number, expiry: `${mm} / ${yy}`, cvv }
}

export default function VccCard({ seed }: { seed: string }) {
  const { number, expiry, cvv } = genCard(seed)

  return (
    <div className="vcc">
      {/* ── Fronte ── */}
      <div className="vcc__face vcc__face--front">
        {/* Marchio, logo e chip sono già nell'SVG di sfondo: sovrapponiamo solo i dati dinamici */}
        <div className="vcc__details">
          <div className="vcc__number">{number}</div>
          <div className="vcc__expiry">{expiry}</div>
        </div>
      </div>

      {/* ── Retro ── */}
      <div className="vcc__face vcc__face--back">
        <div className="vcc__stripe" aria-hidden="true" />
        <div className="vcc__signature">
          <span className="vcc__cvv">{cvv}</span>
        </div>
      </div>
    </div>
  )
}
