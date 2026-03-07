export default function ConversationActions({ items }) {
  if (!items || items.length === 0) return null

  return (
    <div className="card-border">
      <h3 className="section-title">
        <span className="w-7 h-7 rounded-full bg-orange-500/20 flex items-center justify-center">
          <svg className="w-4 h-4 text-orange-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 10H6V10h12v2zm0-3H6V7h12v2z" />
          </svg>
        </span>
        Konuşma Aksiyonları
      </h3>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-3 bg-navy-900 rounded-xl px-3 py-2.5">
            <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            </div>
            <p className="text-slate-200 text-sm leading-relaxed">{item}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
