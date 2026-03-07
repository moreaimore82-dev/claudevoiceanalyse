import { useState } from 'react'

const SENTIMENT_BADGE = {
  positive: { label: 'POZİTİF', className: 'bg-emerald-500/20 text-emerald-400' },
  negative: { label: 'NEGATİF', className: 'bg-red-500/20 text-red-400' },
  neutral: { label: 'NÖTR', className: 'bg-slate-500/20 text-slate-400' },
  mixed: { label: 'KARIŞIK', className: 'bg-yellow-500/20 text-yellow-400' },
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

export default function LibraryView({ library, onSelect, onDelete }) {
  const [search, setSearch] = useState('')

  const filtered = library.filter(r =>
    r.title?.toLowerCase().includes(search.toLowerCase()) ||
    r.transcript?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col min-h-screen pb-24">
      {/* Header */}
      <div className="px-4 pt-12 pb-4 bg-navy-900">
        <h1 className="text-white text-xl font-bold mb-4">Kütüphane</h1>
        <div className="flex items-center gap-2 bg-navy-800 rounded-xl px-3 py-2.5">
          <svg className="w-4 h-4 text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Geçmiş kayıtları ara..."
            className="bg-transparent text-white text-sm flex-1 outline-none placeholder-slate-500"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 px-4 py-3 space-y-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-navy-800 flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
              </svg>
            </div>
            <p className="text-slate-500 text-sm">
              {library.length === 0 ? 'Henüz analiz yapılmadı.' : 'Sonuç bulunamadı.'}
            </p>
          </div>
        ) : (
          filtered.map(recording => {
            const badge = SENTIMENT_BADGE[(recording.sentiment || 'neutral').toLowerCase()] || SENTIMENT_BADGE.neutral
            return (
              <div
                key={recording.id}
                className="bg-navy-800 rounded-2xl p-4 cursor-pointer hover:bg-navy-700 transition-colors"
                onClick={() => onSelect(recording)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-5 h-5 text-accent" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">{recording.title}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{formatDate(recording.timestamp)}</p>
                      {recording.transcript && (
                        <p className="text-slate-400 text-xs mt-1.5 line-clamp-2 leading-relaxed">
                          {recording.transcript.substring(0, 100)}...
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${badge.className}`}>
                      {badge.label}
                    </span>
                    <button
                      onClick={e => { e.stopPropagation(); onDelete(recording.id) }}
                      className="text-slate-600 hover:text-red-400 transition-colors p-1"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
