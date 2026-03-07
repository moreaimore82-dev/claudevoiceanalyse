import { useAudioRecorder } from '../hooks/useAudioRecorder'

export default function AudioRecorder({ onAudioReady }) {
  const {
    isRecording, isPaused, isStopping, duration, formattedDuration,
    audioBlob, error, startRecording, stopRecording,
    pauseRecording, resumeRecording, reset,
  } = useAudioRecorder()

  const handleUse = () => {
    if (audioBlob) onAudioReady(audioBlob, audioBlob.type || 'audio/webm')
  }

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      {/* Big circular button */}
      <div className="relative flex items-center justify-center">
        {/* Outer ring animation */}
        {isRecording && !isPaused && (
          <div className="absolute w-44 h-44 rounded-full border-2 border-accent/30 animate-ping" />
        )}
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={!!audioBlob || isStopping}
          className={`w-36 h-36 rounded-full flex flex-col items-center justify-center gap-2 transition-all shadow-2xl
            ${isRecording && !isPaused
              ? 'bg-red-600 recording-active'
              : isRecording && isPaused
              ? 'bg-yellow-600'
              : audioBlob
              ? 'bg-navy-700 cursor-default'
              : 'bg-accent recording-pulse hover:bg-accent-hover'
            }`}
        >
          {isRecording ? (
            <>
              {!isPaused ? (
                <>
                  <div className="flex items-end gap-1 h-8">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className="wave-bar w-1.5 bg-white rounded-full h-full" style={{ animationDelay: `${(i-1)*0.1}s` }} />
                    ))}
                  </div>
                  <span className="text-white text-xs font-bold">DURDUR</span>
                </>
              ) : (
                <>
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 6h12v12H6z" />
                  </svg>
                  <span className="text-white text-xs font-bold">DURAKLADI</span>
                </>
              )}
            </>
          ) : audioBlob ? (
            <>
              <svg className="w-8 h-8 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
              <span className="text-slate-400 text-xs font-bold">HAZIR</span>
            </>
          ) : (
            <>
              <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm0 2a2 2 0 0 0-2 2v6a2 2 0 1 0 4 0V5a2 2 0 0 0-2-2zm6.364 5.636a.75.75 0 0 1 .736.912A7.003 7.003 0 0 1 12.75 16.93V19h2.5a.75.75 0 0 1 0 1.5h-6.5a.75.75 0 0 1 0-1.5h2.5v-2.07A7.003 7.003 0 0 1 4.9 9.548a.75.75 0 0 1 1.472.295A5.5 5.5 0 0 0 17.5 11v-.5a.75.75 0 0 1 .864-.864z" />
              </svg>
              <span className="text-white text-xs font-bold tracking-wide">KAYDI BAŞLAT</span>
            </>
          )}
        </button>
      </div>

      {/* Timer */}
      <div className="text-4xl font-mono font-bold text-white tabular-nums">
        {formattedDuration}
      </div>

      {/* Status */}
      {isRecording && (
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isPaused ? 'bg-yellow-400' : 'bg-red-500 animate-pulse'}`} />
          <span className="text-slate-300 text-sm">{isPaused ? 'Duraklatıldı' : 'Kaydediliyor...'}</span>
        </div>
      )}

      {/* Controls */}
      {isRecording && (
        <div className="flex gap-3">
          {!isPaused ? (
            <button onClick={pauseRecording} className="btn-secondary flex items-center gap-2 text-sm">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
              Duraklat
            </button>
          ) : (
            <button onClick={resumeRecording} className="btn-secondary flex items-center gap-2 text-sm">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              Devam Et
            </button>
          )}
        </div>
      )}

      {audioBlob && !isRecording && (
        <div className="w-full space-y-3">
          <audio controls className="w-full h-10 rounded-xl" src={URL.createObjectURL(audioBlob)} />
          <div className="flex gap-3">
            <button onClick={handleUse} className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
              Bu Kaydı Analiz Et
            </button>
            <button onClick={reset} className="btn-secondary flex items-center gap-2 text-sm">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" /></svg>
              Sil
            </button>
          </div>
        </div>
      )}

      {duration >= 1740 && isRecording && (
        <p className="text-yellow-400 text-xs text-center">30 dakika limitine yaklaşıyorsunuz.</p>
      )}

      {error && (
        <div className="w-full bg-red-900/30 border border-red-700 rounded-xl p-3 text-red-300 text-sm">
          {error}
        </div>
      )}
    </div>
  )
}
