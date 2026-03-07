import { useState, useCallback } from 'react'
import AudioRecorder from './components/AudioRecorder'
import FileUploader from './components/FileUploader'
import TranscriptView from './components/TranscriptView'
import SentimentView from './components/SentimentView'
import SpeakerView from './components/SpeakerView'

const GEMINI_MODELS = [
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', desc: 'Hızlı ve verimli' },
  { id: 'gemini-2.5-pro-preview-03-25', label: 'Gemini 2.5 Pro', desc: 'En güçlü, daha yavaş' },
]

const STEPS = [
  { id: 'upload', label: 'Ses İşleniyor...' },
  { id: 'transcribe', label: 'Metne Dönüştürülüyor...' },
  { id: 'analyze', label: 'Analiz Yapılıyor...' },
]

const TABS = [
  { id: 'transcript', label: '📝 Transkript' },
  { id: 'sentiment', label: '😊 Duygular' },
  { id: 'speakers', label: '👥 Konuşmacılar' },
]

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function StepIndicator({ currentStep }) {
  return (
    <div className="flex items-center gap-3 justify-center">
      {STEPS.map((step, i) => {
        const stepIdx = STEPS.findIndex((s) => s.id === currentStep)
        const isDone = i < stepIdx
        const isActive = i === stepIdx

        return (
          <div key={step.id} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                ${isDone ? 'bg-emerald-600 text-white' : isActive ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-500'}`}
            >
              {isDone ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span className={`text-sm hidden sm:block ${isActive ? 'text-white font-medium' : isDone ? 'text-gray-400' : 'text-gray-600'}`}>
              {step.label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`w-8 h-px mx-1 ${isDone ? 'bg-emerald-600' : 'bg-gray-700'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function LoadingBar({ step }) {
  const labels = {
    upload: 'Ses dosyası hazırlanıyor...',
    transcribe: 'Google Speech-to-Text ile metne dönüştürülüyor...',
    analyze: 'Gemini ile duygu analizi yapılıyor...',
  }

  return (
    <div className="card text-center space-y-6 py-10">
      <StepIndicator currentStep={step} />
      <div>
        <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden mx-auto max-w-xs progress-indeterminate">
          <div className="absolute inset-0 bg-indigo-500 rounded-full" />
        </div>
        <p className="text-gray-400 text-sm mt-4">{labels[step]}</p>
      </div>
    </div>
  )
}

export default function App() {
  const [inputMode, setInputMode] = useState('record') // 'record' | 'upload'
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash')
  const [processing, setProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState(null)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('transcript')

  const handleAudioReady = useCallback(async (audioBlob, mimeType) => {
    setError(null)
    setResults(null)
    setProcessing(true)

    try {
      // Step 1: encode audio
      setProcessingStep('upload')
      const base64Audio = await blobToBase64(audioBlob)

      // Step 2: transcribe
      setProcessingStep('transcribe')
      const transcribeRes = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: base64Audio,
          mimeType: mimeType || 'audio/webm',
          language: 'tr-TR',
          speakerCount: 2,
        }),
      })

      const transcribeData = await transcribeRes.json()

      if (!transcribeRes.ok) {
        throw new Error(transcribeData.error || `Transkripsiyon hatası (${transcribeRes.status})`)
      }

      const { transcript, words } = transcribeData

      if (!transcript || transcript.trim() === '') {
        throw new Error('Ses kaydında konuşma tespit edilemedi. Lütfen daha net bir kayıt deneyin.')
      }

      // Step 3: analyze
      setProcessingStep('analyze')
      const analyzeRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, speakers: words, model: selectedModel }),
      })

      const analyzeData = await analyzeRes.json()

      if (!analyzeRes.ok) {
        throw new Error(analyzeData.error || `Analiz hatası (${analyzeRes.status})`)
      }

      setResults({ transcript, words, analysis: analyzeData })
      setActiveTab('transcript')
    } catch (err) {
      setError(err.message || 'Bilinmeyen bir hata oluştu.')
    } finally {
      setProcessing(false)
      setProcessingStep(null)
    }
  }, [])

  const handleReset = () => {
    setResults(null)
    setError(null)
    setProcessing(false)
    setProcessingStep(null)
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm0 2a2 2 0 0 0-2 2v6a2 2 0 1 0 4 0V5a2 2 0 0 0-2-2zm6.364 5.636a.75.75 0 0 1 .75.75v.614a7.003 7.003 0 0 1-6.25 6.956V19h2.5a.75.75 0 0 1 0 1.5h-6.5a.75.75 0 0 1 0-1.5h2.5v-2.044A7.003 7.003 0 0 1 4.886 9.999v-.613a.75.75 0 0 1 1.5 0v.614a5.5 5.5 0 0 0 11 0V9.386a.75.75 0 0 1 .978-.713z" />
              </svg>
            </div>
            <div>
              <h1 className="text-white font-bold leading-tight">Ses Analizi</h1>
              <p className="text-gray-500 text-xs">Transkripsiyon · Duygu · Konuşmacı Tanıma</p>
            </div>
          </div>
          {results && (
            <button onClick={handleReset} className="btn-secondary text-sm py-1.5 px-3">
              Yeni Analiz
            </button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Input section — hide when processing or results available */}
        {!processing && !results && (
          <>
            {/* Mode switcher */}
            <div className="flex gap-2 bg-gray-900 p-1 rounded-xl w-fit">
              <button
                onClick={() => setInputMode('record')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${inputMode === 'record' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4z" />
                  <path d="M19.071 9A7.003 7.003 0 0 1 5 11.386V9a.75.75 0 0 0-1.5 0v2.386A7.003 7.003 0 0 0 11.25 18.17V20.5H8.75a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-2.5v-2.33A7.003 7.003 0 0 0 20.5 11V9a.75.75 0 0 0-1.5 0z" />
                </svg>
                Ses Kaydet
              </button>
              <button
                onClick={() => setInputMode('upload')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${inputMode === 'upload' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Dosya Yükle
              </button>
            </div>

            {/* Model seçici */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Analiz Modeli</p>
              <div className="flex gap-3">
                {GEMINI_MODELS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedModel(m.id)}
                    className={`flex-1 p-3 rounded-lg border text-left transition-colors
                      ${selectedModel === m.id
                        ? 'border-indigo-500 bg-indigo-600/20 text-white'
                        : 'border-gray-700 text-gray-400 hover:border-gray-500'}`}
                  >
                    <p className="text-sm font-medium">{m.label}</p>
                    <p className="text-xs mt-0.5 opacity-70">{m.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {inputMode === 'record' ? (
              <AudioRecorder onAudioReady={handleAudioReady} />
            ) : (
              <FileUploader onAudioReady={handleAudioReady} />
            )}

            {/* Info card */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Nasıl Çalışır?</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { icon: '🎙', title: 'Konuşmayı Metne Çevir', desc: 'Google Speech-to-Text ile Türkçe transkripsiyon' },
                  { icon: '😊', title: 'Duygu Analizi', desc: 'Gemini AI ile duygu, ton ve anahtar anları tespit et' },
                  { icon: '👥', title: 'Konuşmacı Tanıma', desc: 'Kim ne zaman konuştu? Otomatik diarization' },
                ].map((item) => (
                  <div key={item.title} className="flex gap-3 items-start">
                    <span className="text-2xl">{item.icon}</span>
                    <div>
                      <p className="text-white text-sm font-medium">{item.title}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Processing */}
        {processing && <LoadingBar step={processingStep} />}

        {/* Error */}
        {error && !processing && (
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-red-400 font-semibold">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
              Hata Oluştu
            </div>
            <p className="text-red-300 text-sm">{error}</p>
            <button onClick={handleReset} className="btn-secondary text-sm py-1.5">
              Tekrar Dene
            </button>
          </div>
        )}

        {/* Results */}
        {results && !processing && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Analiz Sonuçları</h2>
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                </svg>
                Analiz tamamlandı
              </span>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-800 gap-1">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div>
              {activeTab === 'transcript' && (
                <TranscriptView
                  transcript={results.transcript}
                  words={results.words}
                />
              )}
              {activeTab === 'sentiment' && (
                <SentimentView analysis={results.analysis} />
              )}
              {activeTab === 'speakers' && (
                <SpeakerView
                  speakerAnalysis={results.analysis?.speakerAnalysis}
                  words={results.words}
                />
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-gray-800 mt-16 py-6">
        <p className="text-center text-gray-600 text-xs">
          Ses Analizi · Google Cloud Speech-to-Text + Gemini AI
        </p>
      </footer>
    </div>
  )
}
