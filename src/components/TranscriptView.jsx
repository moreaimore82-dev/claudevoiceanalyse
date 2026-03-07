const SPEAKER_COLORS = [
  { bg: 'bg-accent', light: 'bg-navy-700', align: 'items-end', msgBg: 'bg-accent' },
  { bg: 'bg-slate-600', light: 'bg-navy-700', align: 'items-start', msgBg: 'bg-navy-700' },
  { bg: 'bg-emerald-600', light: 'bg-emerald-900/40', align: 'items-end', msgBg: 'bg-emerald-900/40' },
  { bg: 'bg-amber-600', light: 'bg-amber-900/40', align: 'items-start', msgBg: 'bg-amber-900/40' },
]

function groupWordsBySpeaker(words) {
  const segments = []
  let current = null
  for (const word of words) {
    const tag = word.speakerTag || 1
    if (!current || current.speakerTag !== tag) {
      current = { speakerTag: tag, words: [], startTime: word.startTime }
      segments.push(current)
    }
    current.words.push(word.word)
  }
  return segments
}

function formatTime(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = Math.floor(secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function TranscriptView({ transcript, words }) {
  const hasDiarization = words && words.length > 0 && words.some(w => w.speakerTag > 0)
  const segments = hasDiarization ? groupWordsBySpeaker(words) : null

  if (!transcript && (!words || words.length === 0)) {
    return <p className="text-slate-500 text-center py-8">Transkript bulunamadı.</p>
  }

  return (
    <div className="space-y-4">
      {hasDiarization ? (
        <div className="space-y-3">
          {segments.map((seg, i) => {
            const colorIdx = (seg.speakerTag - 1) % SPEAKER_COLORS.length
            const color = SPEAKER_COLORS[colorIdx]
            const isRight = colorIdx % 2 === 0

            return (
              <div key={i} className={`flex flex-col ${color.align} gap-1`}>
                <div className="flex items-center gap-2 px-1">
                  <div className={`w-6 h-6 rounded-full ${color.bg} flex items-center justify-center text-white text-xs font-bold`}>
                    {seg.speakerTag}
                  </div>
                  <span className="text-slate-500 text-xs">
                    Konuşmacı {seg.speakerTag}
                    {seg.startTime != null && ` · ${formatTime(seg.startTime)}`}
                  </span>
                </div>
                <div className={`max-w-[85%] px-4 py-3 rounded-2xl ${isRight ? 'rounded-tr-sm' : 'rounded-tl-sm'} ${color.msgBg}`}>
                  <p className="text-white text-sm leading-relaxed">{seg.words.join(' ')}</p>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-navy-800 rounded-2xl p-4">
          <p className="text-slate-200 leading-relaxed whitespace-pre-wrap text-sm">{transcript}</p>
        </div>
      )}

      {/* Kopyala */}
      <button
        onClick={() => navigator.clipboard.writeText(transcript)}
        className="w-full py-2.5 rounded-xl border border-navy-700 text-slate-400 text-sm hover:text-white hover:border-navy-600 transition-colors flex items-center justify-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        Metni Kopyala
      </button>
    </div>
  )
}
