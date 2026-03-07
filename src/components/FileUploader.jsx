import { useState, useRef, useCallback } from 'react'

const ACCEPTED_TYPES = [
  'audio/webm', 'audio/ogg', 'audio/wav', 'audio/wave',
  'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/flac',
  'audio/aac', 'audio/3gpp', 'video/webm',
]
const MAX_SIZE_MB = 9
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

export default function FileUploader({ onAudioReady }) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  const validateAndSelect = useCallback((file) => {
    setError(null)

    if (!file) return

    // Check type
    const isAudio = file.type.startsWith('audio/') || file.type.startsWith('video/webm')
    if (!isAudio) {
      setError('Desteklenmeyen dosya türü. Lütfen bir ses dosyası seçin (MP3, WAV, WebM, OGG, AAC, FLAC...).')
      return
    }

    // Check size
    if (file.size > MAX_SIZE_BYTES) {
      setError(`Dosya çok büyük (${(file.size / 1024 / 1024).toFixed(1)} MB). Maksimum ${MAX_SIZE_MB} MB yükleyebilirsiniz.`)
      return
    }

    setSelectedFile(file)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    validateAndSelect(file)
  }, [validateAndSelect])

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleFileChange = (e) => {
    validateAndSelect(e.target.files?.[0])
    e.target.value = ''
  }

  const handleUse = () => {
    if (selectedFile) {
      onAudioReady(selectedFile, selectedFile.type)
    }
  }

  const handleReset = () => {
    setSelectedFile(null)
    setError(null)
  }

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  }

  return (
    <div className="card flex flex-col items-center gap-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-white mb-1">Dosya Yükle</h2>
        <p className="text-gray-400 text-sm">MP3, WAV, WebM, OGG, AAC, FLAC — max {MAX_SIZE_MB} MB</p>
      </div>

      {!selectedFile ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          className={`w-full border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-4 cursor-pointer transition-colors duration-200
            ${isDragging
              ? 'border-indigo-500 bg-indigo-900/20'
              : 'border-gray-700 hover:border-gray-500 hover:bg-gray-800/50'
            }`}
        >
          <div className="w-14 h-14 bg-gray-800 rounded-full flex items-center justify-center">
            <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-gray-300 font-medium">
              {isDragging ? 'Bırakın...' : 'Dosyayı buraya sürükleyin'}
            </p>
            <p className="text-gray-500 text-sm mt-1">veya tıklayarak seçin</p>
          </div>
        </div>
      ) : (
        <div className="w-full bg-gray-800 rounded-xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-900/60 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-indigo-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6zm-2 16a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium truncate">{selectedFile.name}</p>
            <p className="text-gray-400 text-sm mt-0.5">{formatSize(selectedFile.size)} · {selectedFile.type}</p>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex flex-wrap gap-3 justify-center">
        {selectedFile && (
          <>
            <button onClick={handleUse} className="btn-primary flex items-center gap-2 px-6">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
              Bu Dosyayı Kullan
            </button>
            <button onClick={handleReset} className="btn-secondary flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
              </svg>
              Kaldır
            </button>
          </>
        )}
      </div>

      {error && (
        <div className="w-full bg-red-900/40 border border-red-700 rounded-lg p-3 text-red-300 text-sm">
          {error}
        </div>
      )}
    </div>
  )
}
