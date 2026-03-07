const SENTIMENT_CONFIG = {
  positive: { label: 'Olumlu', color: 'text-emerald-400', bg: 'bg-emerald-500', badgeBg: 'bg-emerald-900/60 text-emerald-300 border-emerald-700' },
  negative: { label: 'Olumsuz', color: 'text-red-400', bg: 'bg-red-500', badgeBg: 'bg-red-900/60 text-red-300 border-red-700' },
  neutral: { label: 'Nötr', color: 'text-blue-400', bg: 'bg-blue-500', badgeBg: 'bg-blue-900/60 text-blue-300 border-blue-700' },
  mixed: { label: 'Karışık', color: 'text-amber-400', bg: 'bg-amber-500', badgeBg: 'bg-amber-900/60 text-amber-300 border-amber-700' },
}

const TONE_LABELS = {
  formality: { label: 'Resmiyet', low: 'Gayri Resmi', high: 'Resmi' },
  confidence: { label: 'Güven', low: 'Belirsiz', high: 'Emin' },
  energy: { label: 'Enerji', low: 'Sakin', high: 'Enerjik' },
}

function EmotionBar({ name, intensity }) {
  const pct = Math.min(Math.max(Math.round(intensity * 100), 0), 100)
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-300 capitalize">{name}</span>
        <span className="text-gray-400 font-mono">{pct}%</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function ToneGauge({ id, value }) {
  const cfg = TONE_LABELS[id]
  const pct = Math.min(Math.max(Math.round(value * 100), 0), 100)
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-gray-400">
        <span>{cfg.low}</span>
        <span className="font-medium text-gray-200">{cfg.label}</span>
        <span>{cfg.high}</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function SentimentView({ analysis }) {
  if (!analysis) {
    return (
      <div className="card text-center text-gray-500 py-12">
        Duygu analizi bulunamadı.
      </div>
    )
  }

  const { sentiment, emotions, tone } = analysis
  const sentKey = (sentiment?.overall || 'neutral').toLowerCase()
  const sentCfg = SENTIMENT_CONFIG[sentKey] || SENTIMENT_CONFIG.neutral
  const score = sentiment?.score ?? 0.5
  const scorePct = Math.round(score * 100)

  return (
    <div className="space-y-6">
      {/* Overall sentiment badge */}
      <div className="card flex flex-col sm:flex-row items-center gap-6">
        <div className="flex-shrink-0 flex flex-col items-center gap-2">
          <div className={`text-5xl font-extrabold ${sentCfg.color}`}>{scorePct}%</div>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${sentCfg.badgeBg}`}>
            {sentCfg.label}
          </span>
        </div>
        <div className="flex-1 w-full">
          <p className="text-gray-400 text-sm mb-3">Genel Duygu Skoru</p>
          <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full ${sentCfg.bg} rounded-full transition-all duration-700`}
              style={{ width: `${scorePct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-600 mt-1">
            <span>0</span>
            <span>100</span>
          </div>
        </div>
      </div>

      {/* Emotions */}
      {emotions && emotions.length > 0 && (
        <div className="card space-y-4">
          <h3 className="text-base font-semibold text-white">Duygular</h3>
          <div className="space-y-3">
            {emotions
              .sort((a, b) => b.intensity - a.intensity)
              .map((e, i) => (
                <EmotionBar key={i} name={e.name} intensity={e.intensity} />
              ))}
          </div>
        </div>
      )}

      {/* Tone */}
      {tone && (
        <div className="card space-y-4">
          <h3 className="text-base font-semibold text-white">Konuşma Tonu</h3>
          <div className="space-y-4">
            {Object.entries(tone).map(([key, val]) =>
              TONE_LABELS[key] ? (
                <ToneGauge key={key} id={key} value={typeof val === 'number' ? val : parseFloat(val) || 0.5} />
              ) : null
            )}
          </div>
        </div>
      )}
    </div>
  )
}
