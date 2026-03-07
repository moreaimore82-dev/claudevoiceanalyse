const SPEAKER_COLORS = [
  { bg: 'bg-accent', bar: 'bg-accent', text: 'text-blue-300' },
  { bg: 'bg-emerald-500', bar: 'bg-emerald-500', text: 'text-emerald-300' },
  { bg: 'bg-amber-500', bar: 'bg-amber-500', text: 'text-amber-300' },
  { bg: 'bg-rose-500', bar: 'bg-rose-500', text: 'text-rose-300' },
]

function formatTalkTime(secs) {
  if (!secs || secs === 0) return '—'
  if (secs < 60) return `${Math.round(secs)}sn`
  return `${Math.floor(secs / 60)}dk ${Math.round(secs % 60)}sn`
}

export default function SpeakerView({ speakerAnalysis, words }) {
  let speakers = speakerAnalysis || []

  if (words && words.length > 0) {
    const statsMap = {}
    for (const w of words) {
      const tag = w.speakerTag || 1
      if (!statsMap[tag]) statsMap[tag] = { speakerId: tag, wordCount: 0, totalTime: 0 }
      statsMap[tag].wordCount++
      statsMap[tag].totalTime += (parseFloat(w.endTime) || 0) - (parseFloat(w.startTime) || 0)
    }
    speakers = Object.values(statsMap).map(s => {
      const existing = (speakerAnalysis || []).find(sa => sa.speakerId === s.speakerId)
      return { ...s, dominantEmotion: existing?.dominantEmotion || null, talkTime: existing?.talkTime ?? s.totalTime }
    })
  }

  if (!speakers || speakers.length === 0) {
    return <p className="text-slate-500 text-center py-8">Konuşmacı verisi bulunamadı.</p>
  }

  const totalTime = speakers.reduce((acc, s) => acc + (s.talkTime || 0), 0)

  return (
    <div className="card-border">
      <h3 className="section-title">
        <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
        </svg>
        Konuşmacılar
      </h3>

      <div className="space-y-4">
        {speakers.map((speaker, i) => {
          const color = SPEAKER_COLORS[i % SPEAKER_COLORS.length]
          const pct = totalTime > 0 ? Math.round(((speaker.talkTime || 0) / totalTime) * 100) : 0
          return (
            <div key={speaker.speakerId}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full ${color.bg} flex items-center justify-center text-white text-sm font-bold`}>
                    {speaker.speakerId}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">Konuşmacı {speaker.speakerId}</p>
                    {speaker.dominantEmotion && (
                      <p className={`text-xs ${color.text}`}>{speaker.dominantEmotion}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white text-sm font-medium">{formatTalkTime(speaker.talkTime)}</p>
                  <p className="text-slate-500 text-xs">{pct}%</p>
                </div>
              </div>
              <div className="h-2 bg-navy-950 rounded-full overflow-hidden">
                <div className={`h-full ${color.bar} bar-fill rounded-full`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
