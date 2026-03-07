const SENTIMENT_COLORS = {
  positive: { bg: 'bg-emerald-500', text: 'text-emerald-400', label: 'Pozitif' },
  negative: { bg: 'bg-red-500', text: 'text-red-400', label: 'Negatif' },
  neutral: { bg: 'bg-slate-400', text: 'text-slate-300', label: 'Nötr' },
  mixed: { bg: 'bg-yellow-500', text: 'text-yellow-400', label: 'Karışık' },
}

function SentimentBar({ label, value, colorClass }) {
  const pct = Math.min(Math.max(Math.round(value * 100), 0), 100)
  return (
    <div className="flex items-center gap-3">
      <span className="text-slate-300 text-sm w-20 flex-shrink-0 capitalize">{label}</span>
      <div className="flex-1 h-8 bg-navy-950 rounded-xl overflow-hidden relative">
        <div
          className={`h-full ${colorClass} bar-fill rounded-xl`}
          style={{ width: `${pct}%` }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">
          {pct}%
        </span>
      </div>
    </div>
  )
}

export default function SentimentView({ analysis }) {
  if (!analysis) return null

  const { sentiment, emotions, tone } = analysis
  const sentimentStyle = SENTIMENT_COLORS[(sentiment?.overall || 'neutral').toLowerCase()] || SENTIMENT_COLORS.neutral
  const topEmotions = (emotions || []).slice(0, 4)
  const emotionColors = ['bg-emerald-500', 'bg-blue-500', 'bg-yellow-500', 'bg-red-500']

  return (
    <div className="space-y-4">
      {/* Overall */}
      <div className="card-border flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-xs mb-1">Genel Duygu</p>
          <p className={`text-xl font-bold ${sentimentStyle.text}`}>{sentimentStyle.label}</p>
          <p className="text-slate-500 text-xs mt-0.5">Skor: {Math.round((sentiment?.score ?? 0.5) * 100)}%</p>
        </div>
        <div className={`w-12 h-12 rounded-full ${sentimentStyle.bg} opacity-80`} />
      </div>

      {/* Duygular */}
      {topEmotions.length > 0 && (
        <div className="card-border">
          <h3 className="section-title">
            <svg className="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />
            </svg>
            Duygu Analizi
          </h3>
          <div className="space-y-3">
            {topEmotions.map((e, i) => (
              <SentimentBar key={i} label={e.name} value={e.intensity} colorClass={emotionColors[i % emotionColors.length]} />
            ))}
          </div>
        </div>
      )}

      {/* Ton */}
      {tone && (
        <div className="card-border">
          <h3 className="section-title">
            <svg className="w-4 h-4 text-orange-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
            </svg>
            Ton Analizi
          </h3>
          <div className="space-y-3">
            <SentimentBar label="Resmiyet" value={tone.formality} colorClass="bg-blue-500" />
            <SentimentBar label="Güven" value={tone.confidence} colorClass="bg-accent" />
            <SentimentBar label="Enerji" value={tone.energy} colorClass="bg-orange-500" />
          </div>
        </div>
      )}
    </div>
  )
}
