import { useAudioRecorder } from '../hooks/useAudioRecorder'

export default function AudioRecorder({ onAudioReady }) {
  const {
    isRecording,
    isPaused,
    duration,
    formattedDuration,
    audioBlob,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    reset,
  } = useAudioRecorder()

  const handleStop = () => {
    stopRecording()
  }

  const handleUse = () => {
    if (audioBlob) {
      onAudioReady(audioBlob, audioBlob.type || 'audio/webm')
    }
  }

  const handleReset = () => {
    reset()
  }

  return (
    <div className="card flex flex-col items-center gap-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-white mb-1">Ses Kaydet</h2>
        <p className="text-gray-400 text-sm">Mikrofon kullanarak ses kaydı yapın</p>
      </div>

      {/* Waveform / idle indicator */}
      <div className="flex items-center justify-center h-16 gap-1">
        {isRecording && !isPaused ? (
          <>
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="wave-bar w-2 bg-indigo-500 rounded-full h-full"
                style={{ animationDelay: `${(i - 1) * 0.1}s` }}
              />
            ))}
          </>
        ) : (
          <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm0 2a2 2 0 0 0-2 2v6a2 2 0 1 0 4 0V5a2 2 0 0 0-2-2zm6.364 5.636a.75.75 0 0 1 .736.912A7.003 7.003 0 0 1 12.75 16.93V19h2.5a.75.75 0 0 1 0 1.5h-6.5a.75.75 0 0 1 0-1.5h2.5v-2.07A7.003 7.003 0 0 1 4.9 9.548a.75.75 0 0 1 1.472.295A5.5 5.5 0 0 0 17.5 11v-.5a.75.75 0 0 1 .864-.864z" />
            </svg>
          </div>
        )}
      </div>

      {/* Duration */}
      <div className="text-3xl font-mono font-bold text-white tabular-nums">
        {formattedDuration}
      </div>

      {/* Status */}
      {isRecording && (
        <div className="flex items-center gap-2 text-sm">
          <span className={`w-2.5 h-2.5 rounded-full ${isPaused ? 'bg-yellow-400' : 'bg-red-500 recording-pulse'}`} />
          <span className="text-gray-300">{isPaused ? 'Duraklatıldı' : 'Kaydediliyor...'}</span>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap gap-3 justify-center">
        {!isRecording && !audioBlob && (
          <button onClick={startRecording} className="btn-primary flex items-center gap-2 px-6">
            <span className="w-3 h-3 rounded-full bg-red-400" />
            Kaydı Başlat
          </button>
        )}

        {isRecording && (
          <>
            {!isPaused ? (
              <button onClick={pauseRecording} className="btn-secondary flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
                Duraklat
              </button>
            ) : (
              <button onClick={resumeRecording} className="btn-secondary flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Devam Et
              </button>
            )}
            <button
              onClick={handleStop}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h12v12H6z" />
              </svg>
              Durdur
            </button>
          </>
        )}

        {audioBlob && !isRecording && (
          <>
            <button onClick={handleUse} className="btn-primary flex items-center gap-2 px-6">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
              Bu Kaydı Kullan
            </button>
            <button onClick={handleReset} className="btn-secondary flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
              </svg>
              Yeniden Kaydet
            </button>
          </>
        )}
      </div>

      {/* Audio preview */}
      {audioBlob && !isRecording && (
        <div className="w-full">
          <p className="text-xs text-gray-500 mb-2 text-center">Kayıt önizleme</p>
          <audio
            controls
            className="w-full h-10"
            src={URL.createObjectURL(audioBlob)}
          />
        </div>
      )}

      {/* Duration warning */}
      {duration >= 1740 && isRecording && (
        <p className="text-yellow-400 text-xs text-center">
          30 dakika limitine yaklaşıyorsunuz, kayıt otomatik duracak.
        </p>
      )}
      {duration > 55 && duration < 1740 && isRecording && (
        <p className="text-gray-500 text-xs text-center">
          60 saniyeden uzun kayıtlar için asenkron işleme kullanılır.
        </p>
      )}

      {error && (
        <div className="w-full bg-red-900/40 border border-red-700 rounded-lg p-3 text-red-300 text-sm">
          {error}
        </div>
      )}
    </div>
  )
}
