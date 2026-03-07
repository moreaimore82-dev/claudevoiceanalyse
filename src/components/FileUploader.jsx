import { useState, useRef, useCallback } from 'react'

const MAX_SIZE_MB = 30
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

export default function FileUploader({ onAudioReady }) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  const validateAndSelect = useCallback((file) => {
    setError(null)
    if (!file) return
    const audioExtensions = ['.mp3', '.wav', '.aac', '.m4a', '.ogg', '.flac', '.webm', '.weba', '.3gp']
    const hasAudioExt = audioExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
    const isAudio = file.type.startsWith('audio/') || file.type.startsWith('video/webm') || hasAudioExt
    if (!isAudio) {
      setError('Desteklenmeyen dosya türü. Ses dosyası seçin (MP3, WAV, AAC, FLAC...).')
      return
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError(`Dosya çok büyük (${(file.size / 1024 / 1024).toFixed(1)} MB). Max ${MAX_SIZE_MB} MB.`)
      return
    }
    setSelectedFile(file)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    validateAndSelect(e.dataTransfer.files?.[0])
  }, [validateAndSelect])

  const formatSize = (bytes) => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB'
    return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  }

  return (
    <div className="w-full">
      {!selectedFile ? (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onClick={() => inputRef.current?.click()}
          className={`w-full border-2 border-dashed rounded-2xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-all
            ${isDragging ? 'border-accent bg-accent/10' : 'border-navy-700 hover:border-navy-600 hover:bg-navy-800/50'}`}
        >
          <div className="w-12 h-12 bg-navy-700 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-slate-300 font-medium text-sm">
              {isDragging ? 'Bırakın...' : 'Dosyayı buraya sürükleyin'}
            </p>
            <p className="text-slate-500 text-xs mt-1">MP3, WAV, AAC, FLAC, OGG — max {MAX_SIZE_MB} MB</p>
          </div>
          <span className="text-accent text-sm font-medium">veya dosya seç</span>
        </div>
      ) : (
        <div className="bg-navy-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-accent" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium text-sm truncate">{selectedFile.name}</p>
            <p className="text-slate-400 text-xs">{formatSize(selectedFile.size)}</p>
          </div>
          <button
            onClick={() => { setSelectedFile(null); setError(null) }}
            className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
            </svg>
          </button>
        </div>
      )}

      <input ref={inputRef} type="file" accept="audio/*,video/webm,.aac,.m4a,.mp3,.wav,.ogg,.flac,.weba,.webm,.3gp,application/octet-stream" onChange={(e) => { validateAndSelect(e.target.files?.[0]); e.target.value = '' }} className="hidden" />

      {selectedFile && (
        <button
          onClick={() => onAudioReady(selectedFile, selectedFile.type)}
          className="btn-primary w-full mt-3 flex items-center justify-center gap-2 text-sm"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
          Bu Dosyayı Analiz Et
        </button>
      )}

      {error && (
        <div className="mt-3 bg-red-900/30 border border-red-700 rounded-xl p-3 text-red-300 text-sm">
          {error}
        </div>
      )}
    </div>
  )
}
