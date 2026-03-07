const SPEAKER_COLORS = [
  { ring: 'ring-indigo-600', bg: 'bg-indigo-900/40', text: 'text-indigo-300', bar: 'bg-indigo-500' },
  { ring: 'ring-emerald-600', bg: 'bg-emerald-900/40', text: 'text-emerald-300', bar: 'bg-emerald-500' },
  { ring: 'ring-amber-600', bg: 'bg-amber-900/40', text: 'text-amber-300', bar: 'bg-amber-500' },
  { ring: 'ring-rose-600', bg: 'bg-rose-900/40', text: 'text-rose-300', bar: 'bg-rose-500' },
  { ring: 'ring-cyan-600', bg: 'bg-cyan-900/40', text: 'text-cyan-300', bar: 'bg-cyan-500' },
]

function getSpeakerColor(index) {
  return SPEAKER_COLORS[index % SPEAKER_COLORS.length]
}

function formatTalkTime(secs) {
  if (!secs || secs === 0) return '—'
  if (secs < 60) return `${Math.round(secs)}s`
  return `${Math.floor(secs / 60)}d ${Math.round(secs % 60)}s`
}

export default function SpeakerView({ speakerAnalysis, words }) {
  // Build speaker stats from words if speakerAnalysis is missing/incomplete
  let speakers = speakerAnalysis || []

  if (words && words.length > 0) {
    const statsMap = {}
    for (const w of words) {
      const tag = w.speakerTag || 1
      if (!statsMap[tag]) {
        statsMap[tag] = { speakerId: tag, wordCount: 0, totalTime: 0 }
      }
      statsMap[tag].wordCount++
      const start = parseFloat(w.startTime) || 0
      const end = parseFloat(w.endTime) || 0
      statsMap[tag].totalTime += end - start
    }

    speakers = Object.values(statsMap).map((s) => {
      const existing = (speakerAnalysis || []).find((sa) => sa.speakerId === s.speakerId)
      return {
        ...s,
        dominantEmotion: existing?.dominantEmotion || null,
        talkTime: existing?.talkTime ?? s.totalTime,
      }
    })
  }

  if (!speakers || speakers.length === 0) {
    return (
      <div className="card text-center text-gray-500 py-12">
        Konuşmacı verisi bulunamadı.
      </div>
    )
  }

  const totalTime = speakers.reduce((acc, s) => acc + (s.talkTime || 0), 0)

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {speakers.map((speaker, i) => {
          const color = getSpeakerColor(i)
          const pct = totalTime > 0 ? Math.round(((speaker.talkTime || 0) / totalTime) * 100) : 0

          return (
            <div key={speaker.speakerId} className={`card ring-2 ${color.ring} space-y-4`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${color.bg} ${color.text} ring-2 ${color.ring}`}>
                  K{speaker.speakerId}
                </div>
                <div>
                  <p className="font-semibold text-white">Konuşmacı {speaker.speakerId}</p>
                  {speaker.dominantEmotion && (
                    <p className="text-xs text-gray-400">Baskın duygu: <span className={`font-medium ${color.text}`}>{speaker.dominantEmotion}</span></p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Konuşma süresi</span>
                  <span className="text-white font-mono">{formatTalkTime(speaker.talkTime)}</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${color.bar} rounded-full transition-all duration-700`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-right text-xs text-gray-500">{pct}% toplam konuşma</p>
              </div>

              {speaker.wordCount !== undefined && (
                <div className="flex justify-between text-sm border-t border-gray-800 pt-3">
                  <span className="text-gray-400">Kelime sayısı</span>
                  <span className="text-white">{speaker.wordCount}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Talk time distribution */}
      {totalTime > 0 && speakers.length > 1 && (
        <div className="card space-y-3">
          <h3 className="text-base font-semibold text-white">Konuşma Dağılımı</h3>
          <div className="flex h-8 rounded-full overflow-hidden gap-0.5">
            {speakers.map((speaker, i) => {
              const color = getSpeakerColor(i)
              const pct = Math.round(((speaker.talkTime || 0) / totalTime) * 100)
              return pct > 0 ? (
                <div
                  key={speaker.speakerId}
                  className={`${color.bar} flex items-center justify-center text-xs font-bold text-white transition-all duration-700`}
                  style={{ width: `${pct}%` }}
                  title={`Konuşmacı ${speaker.speakerId}: ${pct}%`}
                >
                  {pct > 10 ? `K${speaker.speakerId}` : ''}
                </div>
              ) : null
            })}
          </div>
          <div className="flex flex-wrap gap-3">
            {speakers.map((speaker, i) => {
              const color = getSpeakerColor(i)
              const pct = Math.round(((speaker.talkTime || 0) / totalTime) * 100)
              return (
                <div key={speaker.speakerId} className="flex items-center gap-1.5 text-xs text-gray-400">
                  <span className={`w-3 h-3 rounded-full ${color.bar}`} />
                  Konuşmacı {speaker.speakerId} — {pct}%
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
