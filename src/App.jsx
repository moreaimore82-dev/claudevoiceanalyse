import { useState, useCallback } from 'react'
import AudioRecorder from './components/AudioRecorder'
import FileUploader from './components/FileUploader'
import TranscriptView from './components/TranscriptView'
import SentimentView from './components/SentimentView'
import SpeakerView from './components/SpeakerView'
import KeyInsights from './components/KeyInsights'
import ActionItems from './components/ActionItems'
import BottomNav from './components/BottomNav'
import LibraryView from './components/LibraryView'

const GEMINI_MODELS = [
  { id: 'gemini-3.1-flash', label: 'Gemini 3.1 Flash', desc: 'Hızlı' },
  { id: 'gemini-3.1-pro', label: 'Gemini 3.1 Pro', desc: 'Güçlü' },
]

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function audioBufferToWav(buffer) {
  const numChannels = Math.min(buffer.numberOfChannels, 2)
  const sampleRate = buffer.sampleRate
  const numSamples = buffer.length
  const byteLength = 44 + numSamples * numChannels * 2
  const arrayBuffer = new ArrayBuffer(byteLength)
  const view = new DataView(arrayBuffer)

  const write = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }

  write(0, 'RIFF')
  view.setUint32(4, byteLength - 8, true)
  write(8, 'WAVE')
  write(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * numChannels * 2, true)
  view.setUint16(32, numChannels * 2, true)
  view.setUint16(34, 16, true)
  write(36, 'data')
  view.setUint32(40, numSamples * numChannels * 2, true)

  let offset = 44
  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const s = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]))
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
      offset += 2
    }
  }
  return arrayBuffer
}

async function ensureSupportedFormat(blob, mimeType) {
  const needsConversion = [
    'audio/aac', 'audio/x-aac', 'audio/mp4', 'audio/x-m4a',
    'audio/3gpp', 'audio/3gpp2',
  ].includes(mimeType?.toLowerCase())

  if (!needsConversion) return { blob, mimeType }

  const arrayBuffer = await blob.arrayBuffer()
  const audioContext = new (window.AudioContext || window.webkitAudioContext)()
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
  audioContext.close()
  const wavBuffer = audioBufferToWav(audioBuffer)
  return { blob: new Blob([wavBuffer], { type: 'audio/wav' }), mimeType: 'audio/wav' }
}

function LoadingOverlay({ step }) {
  const steps = [
    { id: 'upload', label: 'Ses hazırlanıyor', icon: '🎵' },
    { id: 'transcribe', label: 'Metne dönüştürülüyor', icon: '📝' },
    { id: 'analyze', label: 'AI analiz yapıyor', icon: '🤖' },
  ]
  const current = steps.findIndex(s => s.id === step)

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8">
      <div className="relative w-24 h-24">
        <div className="absolute inset-0 rounded-full border-4 border-navy-700" />
        <div className="absolute inset-0 rounded-full border-4 border-accent border-t-transparent animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center text-3xl">
          {steps[current]?.icon || '⚡'}
        </div>
      </div>
      <div className="text-center space-y-2">
        <p className="text-white font-semibold text-lg">{steps[current]?.label || 'İşleniyor...'}</p>
        <p className="text-slate-400 text-sm">Lütfen bekleyin</p>
      </div>
      <div className="flex gap-2">
        {steps.map((s, i) => (
          <div
            key={s.id}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i < current ? 'w-8 bg-accent' : i === current ? 'w-8 bg-accent animate-pulse' : 'w-4 bg-navy-700'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

function AnalysisPage({ results, onBack }) {
  const [activeTab, setActiveTab] = useState('analysis')
  const date = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="px-4 pt-12 pb-3 bg-navy-900 border-b border-navy-800">
        <div className="flex items-center justify-between mb-1">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-navy-800 flex items-center justify-center"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-center">
            <p className="text-white font-semibold text-sm">Analiz Sonucu</p>
            <p className="text-slate-500 text-xs">{date}</p>
          </div>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: 'Ses Analizi', text: results.transcript })
              } else {
                navigator.clipboard.writeText(results.transcript)
              }
            }}
            className="w-9 h-9 rounded-full bg-navy-800 flex items-center justify-center"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex mt-3">
          {[{ id: 'analysis', label: 'Analiz' }, { id: 'transcript', label: 'Transkript' }].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id ? 'border-accent text-accent' : 'border-transparent text-slate-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'analysis' && (
          <div className="p-4 space-y-4 pb-8">
            <KeyInsights insights={results.analysis?.keyInsights} />
            <ActionItems items={results.analysis?.actionItems} />
            <SentimentView analysis={results.analysis} />
            <SpeakerView speakerAnalysis={results.analysis?.speakerAnalysis} words={results.words} />
          </div>
        )}
        {activeTab === 'transcript' && (
          <div className="p-4 pb-8">
            <TranscriptView transcript={results.transcript} words={results.words} />
          </div>
        )}
      </div>
    </div>
  )
}

function HomePage({ inputMode, setInputMode, selectedModel, setSelectedModel, onAudioReady, error, onErrorDismiss, library, onLibrarySelect }) {
  return (
    <div className="flex flex-col min-h-screen pb-24">
      {/* Header */}
      <div className="px-4 pt-12 pb-6 bg-navy-900">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm0 2a2 2 0 0 0-2 2v6a2 2 0 1 0 4 0V5a2 2 0 0 0-2-2z" />
              </svg>
            </div>
            <span className="text-white font-bold text-lg">VoiceFlow AI</span>
          </div>
        </div>
        <h1 className="text-white text-2xl font-bold leading-tight mb-2">
          Bugünkü toplantınızı analiz etmenize nasıl yardımcı olabilirim?
        </h1>
        <p className="text-slate-400 text-sm">
          Sesinizi yakalayın, metne dönüştürün ve yapay zeka ile önemli içgörüleri anında çıkarın.
        </p>
      </div>

      <div className="flex-1 px-4 py-5 space-y-5">
        {/* Mode tabs */}
        <div className="flex bg-navy-800 rounded-xl p-1">
          <button
            onClick={() => setInputMode('record')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              inputMode === 'record' ? 'bg-accent text-white' : 'text-slate-400'
            }`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4z" />
            </svg>
            Ses Kaydet
          </button>
          <button
            onClick={() => setInputMode('upload')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              inputMode === 'upload' ? 'bg-accent text-white' : 'text-slate-400'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Dosya Yükle
          </button>
        </div>

        {/* Recorder / Uploader */}
        {inputMode === 'record' ? (
          <AudioRecorder onAudioReady={onAudioReady} />
        ) : (
          <FileUploader onAudioReady={onAudioReady} />
        )}

        {/* Model selector */}
        <div>
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Analiz Modeli</p>
          <div className="flex gap-2">
            {GEMINI_MODELS.map(m => (
              <button
                key={m.id}
                onClick={() => setSelectedModel(m.id)}
                className={`flex-1 py-2.5 px-3 rounded-xl border text-left transition-colors ${
                  selectedModel === m.id
                    ? 'border-accent bg-accent/10 text-white'
                    : 'border-navy-700 text-slate-400 hover:border-navy-600'
                }`}
              >
                <p className="text-sm font-medium">{m.label}</p>
                <p className="text-xs opacity-60 mt-0.5">{m.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-2xl p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-red-300 text-sm">{error}</p>
              <button onClick={onErrorDismiss} className="text-red-400 flex-shrink-0">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Recent recordings */}
        {library.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-white font-semibold text-sm">Son Kayıtlar</p>
              <span className="text-slate-500 text-xs">{library.length} kayıt</span>
            </div>
            <div className="space-y-2">
              {library.slice(0, 3).map(rec => {
                const badge = { positive: 'text-emerald-400', negative: 'text-red-400', neutral: 'text-slate-400', mixed: 'text-yellow-400' }
                const badgeLabel = { positive: 'POZİTİF', negative: 'NEGATİF', neutral: 'NÖTR', mixed: 'KARIŞIK' }
                const sentiment = (rec.sentiment || 'neutral').toLowerCase()
                return (
                  <button
                    key={rec.id}
                    onClick={() => onLibrarySelect(rec)}
                    className="w-full bg-navy-800 hover:bg-navy-700 rounded-xl px-4 py-3 flex items-center gap-3 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{rec.title}</p>
                    </div>
                    <span className={`text-xs font-bold ${badge[sentiment] || badge.neutral}`}>
                      {badgeLabel[sentiment] || 'NÖTR'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function App() {
  const [page, setPage] = useState('home')
  const [inputMode, setInputMode] = useState('record')
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash')
  const [processing, setProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState(null)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const [library, setLibrary] = useState(() => {
    try { return JSON.parse(localStorage.getItem('vf_recordings') || '[]') }
    catch { return [] }
  })

  const saveToLibrary = useCallback((data) => {
    const entry = {
      id: Date.now(),
      title: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
      transcript: data.transcript,
      words: data.words,
      analysis: data.analysis,
      sentiment: data.analysis?.sentiment?.overall || 'neutral',
    }
    setLibrary(prev => {
      const updated = [entry, ...prev].slice(0, 50)
      localStorage.setItem('vf_recordings', JSON.stringify(updated))
      return updated
    })
  }, [])

  const handleAudioReady = useCallback(async (audioBlob, mimeType_) => {
    let mimeType = mimeType_
    setError(null)
    setResults(null)
    setProcessing(true)

    try {
      setProcessingStep('upload')
      const { blob: convertedBlob, mimeType: convertedMime } = await ensureSupportedFormat(audioBlob, mimeType)
      const base64Audio = await blobToBase64(convertedBlob)
      mimeType = convertedMime

      setProcessingStep('transcribe')
      const transcribeRes = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: base64Audio, mimeType: mimeType || 'audio/webm', language: 'tr-TR', speakerCount: 2 }),
      })
      const transcribeText = await transcribeRes.text()
      if (!transcribeText) throw new Error('Sunucu boş yanıt döndürdü. Dosya çok büyük olabilir (max ~10MB).')
      let transcribeData
      try { transcribeData = JSON.parse(transcribeText) }
      catch { throw new Error('Sunucu hatası: ' + transcribeText.substring(0, 150)) }
      if (!transcribeRes.ok) throw new Error(transcribeData.error || 'Transkripsiyon hatası')
      const { transcript, words } = transcribeData
      if (!transcript?.trim()) throw new Error('Ses kaydında konuşma tespit edilemedi.')

      setProcessingStep('analyze')
      const analyzeRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, speakers: words, model: selectedModel }),
      })
      const analyzeText = await analyzeRes.text()
      if (!analyzeText) throw new Error('Analiz sunucusu boş yanıt döndürdü.')
      let analyzeData
      try { analyzeData = JSON.parse(analyzeText) }
      catch { throw new Error('Analiz sunucu hatası: ' + analyzeText.substring(0, 150)) }
      if (!analyzeRes.ok) throw new Error(analyzeData.error || 'Analiz hatası')

      const resultData = { transcript, words, analysis: analyzeData }
      saveToLibrary(resultData)
      setResults(resultData)
    } catch (err) {
      setError(err.message || 'Bilinmeyen bir hata oluştu.')
    } finally {
      setProcessing(false)
      setProcessingStep(null)
    }
  }, [selectedModel, saveToLibrary])

  const handleReset = () => {
    setResults(null)
    setError(null)
  }

  const handleLibrarySelect = (entry) => {
    setResults({ transcript: entry.transcript, words: entry.words, analysis: entry.analysis })
  }

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col max-w-lg mx-auto relative">
      {results && !processing && (
        <AnalysisPage results={results} onBack={handleReset} />
      )}

      {processing && (
        <div className="flex flex-col min-h-screen">
          <LoadingOverlay step={processingStep} />
        </div>
      )}

      {!results && !processing && (
        <>
          {page === 'home' && (
            <HomePage
              inputMode={inputMode}
              setInputMode={setInputMode}
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              onAudioReady={handleAudioReady}
              error={error}
              onErrorDismiss={() => setError(null)}
              library={library}
              onLibrarySelect={handleLibrarySelect}
            />
          )}
          {page === 'library' && (
            <LibraryView
              library={library}
              onSelect={handleLibrarySelect}
              onDelete={(id) => {
                setLibrary(prev => {
                  const updated = prev.filter(r => r.id !== id)
                  localStorage.setItem('vf_recordings', JSON.stringify(updated))
                  return updated
                })
              }}
            />
          )}
          <BottomNav page={page} onChange={setPage} />
        </>
      )}
    </div>
  )
}
