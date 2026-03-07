/**
 * Netlify Function: transcribe
 * POST /api/transcribe
 * Body: { audio: "<base64>", mimeType: "audio/webm", language: "tr-TR", speakerCount: 2 }
 * Response: { transcript, words: [{word, speakerTag, startTime, endTime}] }
 */

const SPEECH_API_BASE = 'https://speech.googleapis.com/v1'

function buildSpeechConfig(mimeType, language, speakerCount) {
  // Map MIME type to Google encoding
  // Google Speech-to-Text v1 desteklenen formatlar
  const encodingMap = {
    'audio/webm': 'WEBM_OPUS',
    'audio/webm;codecs=opus': 'WEBM_OPUS',
    'audio/ogg': 'OGG_OPUS',
    'audio/ogg;codecs=opus': 'OGG_OPUS',
    'audio/wav': 'LINEAR16',
    'audio/wave': 'LINEAR16',
    'audio/x-wav': 'LINEAR16',
    'audio/mpeg': 'MP3',
    'audio/mp3': 'MP3',
    'audio/flac': 'FLAC',
    'audio/x-flac': 'FLAC',
    'video/webm': 'WEBM_OPUS',
  }

  // AAC, M4A, MP4 container formatları desteklenmiyor — hata döndür
  const unsupported = ['audio/aac', 'audio/x-aac', 'audio/mp4', 'audio/x-m4a', 'audio/3gpp']
  if (unsupported.includes(mimeType?.toLowerCase())) {
    return null // caller will handle
  }

  const encoding = encodingMap[mimeType?.toLowerCase()] || 'WEBM_OPUS'

  return {
    encoding,
    // Don't set sampleRateHertz — let Google detect it (works for most formats)
    languageCode: language || 'tr-TR',
    diarizationConfig: {
      enableSpeakerDiarization: true,
      minSpeakerCount: 1,
      maxSpeakerCount: speakerCount || 2,
    },
    enableWordTimeOffsets: true,
    model: 'latest_long',
    useEnhanced: true,
    enableAutomaticPunctuation: true,
  }
}

function extractResults(responseData) {
  const results = responseData.results || []

  if (results.length === 0) {
    return { transcript: '', words: [] }
  }

  // Diarization words come from the LAST result
  const lastResult = results[results.length - 1]
  const words = lastResult?.alternatives?.[0]?.words || []

  // Build full transcript from all results
  const transcript = results
    .map((r) => r.alternatives?.[0]?.transcript || '')
    .join(' ')
    .trim()

  const mappedWords = words.map((w) => ({
    word: w.word,
    speakerTag: w.speakerTag || 0,
    startTime: parseFloat(w.startTime?.seconds || '0') + (w.startTime?.nanos || 0) / 1e9,
    endTime: parseFloat(w.endTime?.seconds || '0') + (w.endTime?.nanos || 0) / 1e9,
  }))

  return { transcript, words: mappedWords }
}

async function pollOperation(operationName, apiKey, maxAttempts = 30) {
  const url = `https://speech.googleapis.com/v1/operations/${operationName}?key=${apiKey}`

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 3000)) // wait 3s between polls

    const res = await fetch(url)
    const data = await res.json()

    if (data.error) {
      throw new Error(`Operation error: ${data.error.message}`)
    }

    if (data.done) {
      if (data.error) throw new Error(data.error.message)
      return data.response
    }
  }

  throw new Error('Transkripsiyon zaman aşımına uğradı. Lütfen daha kısa bir ses deneyin.')
}

exports.handler = async function (event) {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) }
  }

  const apiKey = process.env.GOOGLE_CLOUD_API_KEY
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'GOOGLE_CLOUD_API_KEY ortam değişkeni ayarlanmamış.' }),
    }
  }

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Geçersiz JSON gövdesi.' }) }
  }

  const { audio, mimeType, language, speakerCount } = body

  if (!audio) {
    return { statusCode: 400, body: JSON.stringify({ error: 'audio alanı gerekli (base64).' }) }
  }


  // Estimate duration from base64 size
  const estimatedBytes = (audio.length * 3) / 4
  const mime = mimeType?.toLowerCase() || ''
  // WAV/LINEAR16 at 16kHz mono 16-bit = 32000 bytes/sec; Opus/WebM/OGG ~12kbps
  const bytesPerSec = (mime.includes('wav') || mime.includes('wave')) ? 32000 : 1500
  const estimatedSeconds = estimatedBytes / bytesPerSec
  const isLong = estimatedSeconds > 55

  const config = buildSpeechConfig(mimeType, language, speakerCount)
  const audioObj = { content: audio }

  try {
    let responseData

    if (isLong) {
      // Async long-running recognize
      const url = `${SPEECH_API_BASE}/speech:longrunningrecognize?key=${apiKey}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, audio: audioObj }),
      })

      const opData = await res.json()

      if (!res.ok || opData.error) {
        throw new Error(opData.error?.message || `Speech API hatası: ${res.status}`)
      }

      // Poll for completion
      const opName = opData.name?.replace('operations/', '')
      responseData = await pollOperation(opName, apiKey)
    } else {
      // Synchronous recognize
      const url = `${SPEECH_API_BASE}/speech:recognize?key=${apiKey}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, audio: audioObj }),
      })

      responseData = await res.json()

      if (!res.ok || responseData.error) {
        throw new Error(responseData.error?.message || `Speech API hatası: ${res.status}`)
      }
    }

    const { transcript, words } = extractResults(responseData)

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ transcript, words }),
    }
  } catch (err) {
    console.error('Transcribe error:', err)
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error: err.message || 'Transkripsiyon sırasında beklenmeyen bir hata oluştu.',
      }),
    }
  }
}
