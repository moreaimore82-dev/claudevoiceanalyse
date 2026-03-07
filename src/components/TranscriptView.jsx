const SPEAKER_COLORS = [
  { bg: 'bg-indigo-600', text: 'text-indigo-300', border: 'border-indigo-700', label: 'bg-indigo-900/60 text-indigo-300' },
  { bg: 'bg-emerald-600', text: 'text-emerald-300', border: 'border-emerald-700', label: 'bg-emerald-900/60 text-emerald-300' },
  { bg: 'bg-amber-600', text: 'text-amber-300', border: 'border-amber-700', label: 'bg-amber-900/60 text-amber-300' },
  { bg: 'bg-rose-600', text: 'text-rose-300', border: 'border-rose-700', label: 'bg-rose-900/60 text-rose-300' },
  { bg: 'bg-cyan-600', text: 'text-cyan-300', border: 'border-cyan-700', label: 'bg-cyan-900/60 text-cyan-300' },
]

function getSpeakerColor(speakerTag) {
  return SPEAKER_COLORS[(speakerTag - 1) % SPEAKER_COLORS.length] || SPEAKER_COLORS[0]
}

function groupWordsBySpeaker(words) {
  if (!words || words.length === 0) return []

  const segments = []
  let current = null

  for (const word of words) {
    const tag = word.speakerTag || 1
    if (!current || current.speakerTag !== tag) {
      current = { speakerTag: tag, words: [] }
      segments.push(current)
    }
    current.words.push(word.word)
  }

  return segments
}

export default function TranscriptView({ transcript, words }) {
  const hasDiarization = words && words.length > 0 && words.some((w) => w.speakerTag > 0)
  const segments = hasDiarization ? groupWordsBySpeaker(words) : null

  const uniqueSpeakers = hasDiarization
    ? [...new Set(words.map((w) => w.speakerTag || 1))].sort()
    : []

  if (!transcript && (!words || words.length === 0)) {
    return (
      <div className="card text-center text-gray-500 py-12">
        Transkript bulunamadı.
      </div>
    )
  }

  return (
    <div className="card space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Transkript</h3>
        {hasDiarization && (
          <div className="flex items-center gap-2 flex-wrap">
            {uniqueSpeakers.map((tag) => {
              const color = getSpeakerColor(tag)
              return (
                <span key={tag} className={`text-xs font-medium px-2.5 py-1 rounded-full ${color.label}`}>
                  Konuşmacı {tag}
                </span>
              )
            })}
          </div>
        )}
      </div>

      {hasDiarization ? (
        <div className="space-y-4">
          {segments.map((seg, i) => {
            const color = getSpeakerColor(seg.speakerTag)
            return (
              <div key={i} className={`flex gap-3 p-4 rounded-xl bg-gray-800/60 border-l-4 ${color.border}`}>
                <div className="flex-shrink-0">
                  <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded ${color.label}`}>
                    K{seg.speakerTag}
                  </span>
                </div>
                <p className="text-gray-200 leading-relaxed flex-1">
                  {seg.words.join(' ')}
                </p>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-gray-800/60 rounded-xl p-5">
          <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">{transcript}</p>
        </div>
      )}

      {/* Raw transcript copy */}
      <div className="pt-4 border-t border-gray-800">
        <details className="group">
          <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-200 transition-colors list-none flex items-center gap-2">
            <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
            </svg>
            Ham metni kopyala
          </summary>
          <div className="mt-3 relative">
            <pre className="bg-gray-950 rounded-lg p-4 text-sm text-gray-300 whitespace-pre-wrap overflow-auto max-h-40">
              {transcript}
            </pre>
            <button
              onClick={() => navigator.clipboard.writeText(transcript)}
              className="absolute top-2 right-2 text-xs btn-secondary py-1 px-2"
            >
              Kopyala
            </button>
          </div>
        </details>
      </div>
    </div>
  )
}
