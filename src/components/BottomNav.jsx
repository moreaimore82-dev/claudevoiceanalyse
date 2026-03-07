export default function BottomNav({ page, onChange }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-navy-900 border-t border-navy-800">
      <div className="flex items-center justify-around px-4 pt-2 pb-4">
        <button
          onClick={() => onChange('home')}
          className={`flex flex-col items-center gap-1 px-8 py-1 transition-colors ${page === 'home' ? 'text-accent' : 'text-slate-500'}`}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
          <span className="text-xs font-medium">Ana Sayfa</span>
        </button>

        <button
          onClick={() => onChange('library')}
          className={`flex flex-col items-center gap-1 px-8 py-1 transition-colors ${page === 'library' ? 'text-accent' : 'text-slate-500'}`}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z" />
          </svg>
          <span className="text-xs font-medium">Kütüphane</span>
        </button>
      </div>
    </div>
  )
}
