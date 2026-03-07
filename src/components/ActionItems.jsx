import { useState } from 'react'

export default function ActionItems({ items }) {
  const [checked, setChecked] = useState({})

  if (!items || items.length === 0) return null

  const toggle = (i) => setChecked(prev => ({ ...prev, [i]: !prev[i] }))

  return (
    <div className="card-border">
      <h3 className="section-title">
        <span className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
        </span>
        AI Aksiyon Maddeleri
      </h3>
      <div className="space-y-2">
        {items.map((item, i) => (
          <button
            key={i}
            onClick={() => toggle(i)}
            className="w-full flex items-start gap-3 text-left"
          >
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
              checked[i] ? 'bg-accent border-accent' : 'border-slate-600'
            }`}>
              {checked[i] && (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              )}
            </div>
            <p className={`text-sm leading-relaxed transition-colors ${checked[i] ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
              {item}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}
