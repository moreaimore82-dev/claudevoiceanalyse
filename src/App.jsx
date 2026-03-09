import { useState, useCallback, useRef } from 'react'
import { jsonrepair } from 'jsonrepair'
import AudioRecorder from './components/AudioRecorder'
import FileUploader from './components/FileUploader'
import TranscriptView from './components/TranscriptView'
import SentimentView from './components/SentimentView'
import SpeakerView from './components/SpeakerView'
import KeyInsights from './components/KeyInsights'
import ActionItems from './components/ActionItems'
import ConversationActions from './components/ConversationActions'
import BottomNav from './components/BottomNav'
import LibraryView from './components/LibraryView'

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'

function buildAnalyzePrompt(transcript) {
  return `Aşağıdaki Türkçe konuşma transkripsiyonunu derinlemesine analiz et ve SADECE geçerli JSON formatında yanıt ver. Başka hiçbir metin ekleme.

Transkript:
"${transcript}"

JSON formatı (tam olarak bu yapıya uy):
{
  "keyInsights": [
    "Önemli bilgi 1 (Türkçe tam ve detaylı cümle)",
    "Önemli bilgi 2 (Türkçe tam ve detaylı cümle)"
  ],
  "conversationActions": [
    "Konuşmacının üstlendiği görev veya söz (Türkçe tam cümle)"
  ],
  "actionItems": [
    "AI önerisi: yapılması gereken iş (detaylı açıklama ile)"
  ],
  "sentiment": {
    "overall": "positive | negative | neutral | mixed",
    "score": 0.5
  },
  "emotions": [
    {"name": "duygu adı (Türkçe)", "intensity": 0.7}
  ],
  "tone": {
    "formality": 0.5,
    "confidence": 0.5,
    "energy": 0.5
  },
  "speakerAnalysis": []
}

Kurallar:
- "keyInsights": Konuşmanın uzunluğuna ve içeriğine göre tüm önemli bilgileri, kararları, tartışılan konuları, rakamları, isimleri ve sonuçları eksiksiz çıkar. Kısa konuşmalarda en az 5, uzun konuşmalarda (10 dakika+) en az 15-20 madde üret. Her madde tam, bağımsız ve anlamlı bir cümle olsun — hiçbir önemli detayı atlama.
- "conversationActions": Konuşmacıların verdiği tüm görevler, taahhütler, sözler, tarihler, atamalar — detaylı biçimde. Kimin ne yapacağını, ne zaman yapacağını belirt. Yoksa boş dizi [].
- "actionItems": AI olarak önerdiğin aksiyonlar — her biri neden önemli olduğunu açıklayan detaylı bir cümle olsun. Konuşmanın içeriğine göre gerekli olduğu kadar madde üret (minimum 5, gerekirse daha fazla).
- "emotions": Konuşmada gözlemlenen tüm duygu tonlarını tespit et (minimum 5). Her birini gerçek içerikten çıkar — varsayılan 0.5 değeri KULLANMA, konuşmayı analiz ederek gerçek yoğunlukları tahmin et.
- "sentiment.overall": Konuşmanın genel tonunu doğru değerlendir (positive/negative/neutral/mixed). "neutral" ve 0.5 ancak gerçekten nötr bir içerik varsa kullanılabilir.
- "sentiment.score": 0 = çok olumsuz, 1 = çok olumlu. Konuşmayı dinleyerek gerçek skoru ver — varsayılan 0.5 kullanma.
- "tone": formality/confidence/energy değerlerini konuşmadan analiz ederek belirle. Hiçbir değeri varsayılan 0.5 olarak bırakma — gerçek konuşma tonundan türet.
- Yalnızca JSON çıktısı ver. JSON içindeki tüm diziler ve alanlar eksiksiz doldurulmalı.`
}

function parseAndValidateAnalysis(text) {
  let cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  let parsed
  try {
    parsed = JSON.parse(jsonrepair(cleaned))
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (match) parsed = JSON.parse(jsonrepair(match[0]))
    else throw new Error('Gemini yanıtı JSON formatında değil.')
  }
  return {
    sentiment: { overall: parsed.sentiment?.overall || 'neutral', score: typeof parsed.sentiment?.score === 'number' ? parsed.sentiment.score : 0.5 },
    emotions: Array.isArray(parsed.emotions) ? parsed.emotions : [],
    tone: { formality: parsed.tone?.formality ?? 0.5, confidence: parsed.tone?.confidence ?? 0.5, energy: parsed.tone?.energy ?? 0.5 },
    keyInsights: Array.isArray(parsed.keyInsights) ? parsed.keyInsights : [],
    conversationActions: Array.isArray(parsed.conversationActions) ? parsed.conversationActions : [],
    actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
    speakerAnalysis: Array.isArray(parsed.speakerAnalysis) ? parsed.speakerAnalysis : [],
  }
}

async function transcribeChunk(base64Audio, mimeType) {
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!geminiKey) throw new Error('VITE_GEMINI_API_KEY tanımlı değil.')

  const res = await fetch(
    `${GEMINI_API_BASE}/models/gemini-3-flash-preview:generateContent?key=${geminiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: 'Bu ses kaydını Türkçe olarak tam ve eksiksiz biçimde metne dönüştür. Sadece konuşulan metni yaz, başka hiçbir şey ekleme.' },
            { inline_data: { mime_type: mimeType || 'audio/wav', data: base64Audio } },
          ],
        }],
        generationConfig: { temperature: 0, maxOutputTokens: 4096 },
      }),
    }
  )
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error?.message || `Transkripsiyon hatası: ${res.status}`)
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''
  return { transcript: text, words: [] }
}

async function analyzeWithGemini(transcript, model) {
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!geminiKey) throw new Error('VITE_GEMINI_API_KEY tanımlı değil.')
  const res = await fetch(
    `${GEMINI_API_BASE}/models/${model}:generateContent?key=${geminiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildAnalyzePrompt(transcript) }] }],
        generationConfig: { temperature: 0.2, topK: 40, topP: 0.95, maxOutputTokens: 16384 },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ],
      }),
    }
  )
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error?.message || `Gemini API hatası: ${res.status}`)
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!rawText) throw new Error('Gemini boş yanıt döndürdü.')
  return parseAndValidateAnalysis(rawText)
}

const GEMINI_MODELS = [
  { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash', desc: 'Hızlı' },
  { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro', desc: 'Güçlü' },
]

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

const TARGET_SAMPLE_RATE = 16000
const MAX_SEND_BYTES = 4.5 * 1024 * 1024
const MAX_CHUNK_SECONDS = 50 // Google Speech inline limit: max 60s, 50s güvenli

function audioBufferSliceToWav(buffer, startSample, endSample) {
  const srcRate = buffer.sampleRate
  const ratio = srcRate / TARGET_SAMPLE_RATE
  const numSamples = Math.floor((endSample - startSample) / ratio)
  const byteLength = 44 + numSamples * 2
  const ab = new ArrayBuffer(byteLength)
  const view = new DataView(ab)

  const w = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }

  w(0, 'RIFF'); view.setUint32(4, byteLength - 8, true)
  w(8, 'WAVE'); w(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, TARGET_SAMPLE_RATE, true)
  view.setUint32(28, TARGET_SAMPLE_RATE * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  w(36, 'data'); view.setUint32(40, numSamples * 2, true)

  const ch0 = buffer.getChannelData(0)
  const ch1 = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : null
  for (let i = 0; i < numSamples; i++) {
    const src = Math.min(Math.floor(startSample + i * ratio), buffer.length - 1)
    const s = ch1 ? (ch0[src] + ch1[src]) / 2 : ch0[src]
    view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, s)) * 0x7FFF, true)
  }
  return ab
}

async function decodeAndChunk(blob) {
  const arrayBuffer = await blob.arrayBuffer()
  const audioContext = new (window.AudioContext || window.webkitAudioContext)()
  let audioBuffer
  try {
    audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
  } catch {
    audioContext.close()
    throw new Error('Bu ses dosyası okunamadı. Lütfen MP3 veya WAV formatında bir dosya deneyin.')
  }
  audioContext.close()

  const chunkSamples = Math.floor(MAX_CHUNK_SECONDS * audioBuffer.sampleRate)
  const chunks = []
  for (let start = 0; start < audioBuffer.length; start += chunkSamples) {
    const end = Math.min(start + chunkSamples, audioBuffer.length)
    chunks.push({
      blob: new Blob([audioBufferSliceToWav(audioBuffer, start, end)], { type: 'audio/wav' }),
      mimeType: 'audio/wav',
      startSec: start / audioBuffer.sampleRate,
    })
  }
  return chunks
}

function LoadingOverlay({ step, chunkInfo }) {
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
        {step === 'transcribe' && chunkInfo && chunkInfo.total > 1 ? (
          <p className="text-slate-400 text-sm">Parça {chunkInfo.current}/{chunkInfo.total} işleniyor...</p>
        ) : (
          <p className="text-slate-400 text-sm">Lütfen bekleyin</p>
        )}
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


function AnalysisPage({ results, onBack, selectedModel }) {
  const [activeTab, setActiveTab] = useState('analysis')
  const [pdfLoading, setPdfLoading] = useState(false)
  const contentRef = useRef(null)
  const date = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

  const handleDownloadPDF = async () => {
    if (pdfLoading) return
    setPdfLoading(true)
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])
      const element = contentRef.current
      const canvas = await html2canvas(element, {
        backgroundColor: '#070E1B',
        scale: 2,
        useCORS: true,
        logging: false,
        scrollY: -window.scrollY,
      })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const imgH = (canvas.height * pageW) / canvas.width
      let yPos = 0
      let remaining = imgH
      pdf.addImage(imgData, 'PNG', 0, yPos, pageW, imgH)
      remaining -= pageH
      while (remaining > 0) {
        yPos -= pageH
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, yPos, pageW, imgH)
        remaining -= pageH
      }
      pdf.save('voiceflow-analiz.pdf')
    } catch (err) {
      alert('PDF oluşturulamadı: ' + err.message)
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="px-4 pt-12 pb-0 bg-navy-900 border-b border-navy-800">
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-navy-800 flex items-center justify-center flex-shrink-0"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm truncate">Analiz Sonucu</p>
            <p className="text-slate-500 text-xs">{date}</p>
          </div>
          <button
            onClick={handleDownloadPDF}
            disabled={pdfLoading}
            className="w-9 h-9 rounded-full bg-navy-800 flex items-center justify-center flex-shrink-0"
            title="PDF İndir"
          >
            {pdfLoading ? (
              <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z" />
              </svg>
            )}
          </button>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: 'Ses Analizi', text: results.transcript })
              } else {
                navigator.clipboard.writeText(results.transcript)
              }
            }}
            className="w-9 h-9 rounded-full bg-navy-800 flex items-center justify-center flex-shrink-0"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex">
          {[{ id: 'analysis', label: 'Analiz' }, { id: 'transcript', label: 'Transkript' }].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
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
          <div ref={contentRef} id="analysis-content" className="p-4 space-y-4 pb-10">
            <KeyInsights insights={results.analysis?.keyInsights} />
            <ConversationActions items={results.analysis?.conversationActions} />
            <ActionItems items={results.analysis?.actionItems} />
            <SentimentView analysis={results.analysis} />
          </div>
        )}
        {activeTab === 'transcript' && (
          <div className="p-4 pb-10">
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
        <InstallBanner />
        <h1 className="text-white text-2xl font-bold leading-tight mb-2 mt-3">
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

function InstallBanner() {
  const [prompt, setPrompt] = useState(null)
  const [installed, setInstalled] = useState(
    () => localStorage.getItem('pwa_installed') === 'true'
  )

  useState(() => {
    const handler = (e) => { e.preventDefault(); setPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => {
      setInstalled(true)
      localStorage.setItem('pwa_installed', 'true')
      setPrompt(null)
    })
    return () => window.removeEventListener('beforeinstallprompt', handler)
  })

  if (installed || !prompt) return null

  return (
    <button
      onClick={async () => {
        prompt.prompt()
        const { outcome } = await prompt.userChoice
        if (outcome === 'accepted') {
          setInstalled(true)
          localStorage.setItem('pwa_installed', 'true')
        }
        setPrompt(null)
      }}
      className="flex items-center gap-2 bg-accent/15 border border-accent/30 text-accent text-xs font-medium px-3 py-2 rounded-xl hover:bg-accent/25 transition-colors"
    >
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14zm-4-7h2l-3 4-3-4h2V9h2v3z" />
      </svg>
      Uygulamayı Telefona İndir
    </button>
  )
}

export default function App() {
  const [page, setPage] = useState('home')
  const [inputMode, setInputMode] = useState('record')
  const [selectedModel, setSelectedModel] = useState('gemini-3-flash-preview')
  const [processing, setProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState(null)
  const [chunkInfo, setChunkInfo] = useState(null)
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
    const mimeType = mimeType_
    setError(null)
    setResults(null)
    setChunkInfo(null)
    setProcessing(true)

    try {
      setProcessingStep('upload')
      const unsupported = ['audio/aac', 'audio/x-aac', 'audio/mp4', 'audio/x-m4a', 'audio/3gpp', 'audio/3gpp2']
      const needsConversion = unsupported.includes(mimeType?.toLowerCase()) || audioBlob.size > MAX_SEND_BYTES
      let chunks
      if (needsConversion) {
        chunks = await decodeAndChunk(audioBlob)
      } else {
        chunks = [{ blob: audioBlob, mimeType, startSec: 0 }]
      }

      setProcessingStep('transcribe')
      let fullTranscript = ''
      let allWords = []
      for (let i = 0; i < chunks.length; i++) {
        const { blob, mimeType: chunkMime, startSec } = chunks[i]
        setChunkInfo({ current: i + 1, total: chunks.length })
        const base64Audio = await blobToBase64(blob)
        const transcribeData = await transcribeChunk(base64Audio, chunkMime || 'audio/wav')
        if (transcribeData.transcript?.trim()) {
          if (fullTranscript) fullTranscript += ' '
          fullTranscript += transcribeData.transcript.trim()
        }
        if (transcribeData.words?.length) {
          const offsetWords = transcribeData.words.map(w => ({
            ...w,
            startTime: (w.startTime || 0) + startSec,
            endTime: (w.endTime || 0) + startSec,
          }))
          allWords = allWords.concat(offsetWords)
        }
      }
      if (!fullTranscript.trim()) throw new Error('Ses kaydında konuşma tespit edilemedi.')

      setProcessingStep('analyze')
      const analyzeData = await analyzeWithGemini(fullTranscript, selectedModel)

      const resultData = { transcript: fullTranscript, words: allWords, analysis: analyzeData }
      saveToLibrary(resultData)
      setResults(resultData)
    } catch (err) {
      setError(err.message || 'Bilinmeyen bir hata oluştu.')
    } finally {
      setProcessing(false)
      setProcessingStep(null)
      setChunkInfo(null)
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
        <AnalysisPage results={results} onBack={handleReset} selectedModel={selectedModel} />
      )}

      {processing && (
        <div className="flex flex-col min-h-screen">
          <LoadingOverlay step={processingStep} chunkInfo={chunkInfo} />
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
