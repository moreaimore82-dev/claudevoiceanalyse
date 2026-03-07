/**
 * Netlify Function: podcast
 * POST /api/podcast
 * Body: { transcript: "...", model: "gemini-..." }
 * Response: { script, audioBase64, ttsError }
 */

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'
const DEFAULT_MODEL = 'gemini-3-flash-preview'
const ALLOWED_MODELS = ['gemini-3-flash-preview', 'gemini-3.1-pro-preview']

async function generateScript(transcript, model, apiKey) {
  const prompt = `Aşağıdaki konuşma transkripsiyonundan 1-2 dakikada okunabilecek, cana yakın ve bilgilendirici bir podcast bölümü yaz. Maksimum 220 kelime kullan. Konuşmanın en önemli noktalarını vurgula. Doğal bir ses tonuyla, sanki bir podcast sunucusu anlatıyor gibi yaz. SADECE podcast metnini yaz, başlık veya açıklama ekleme.

Transkript:
"${transcript.substring(0, 4000)}"`

  const res = await fetch(
    `${GEMINI_API_BASE}/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
      }),
    }
  )
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error?.message || 'Gemini hatası')
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  if (!text) throw new Error('Gemini boş yanıt döndürdü.')
  return text
}

async function synthesizeSpeech(text, apiKey) {
  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: 'tr-TR', name: 'tr-TR-Standard-D', ssmlGender: 'MALE' },
        audioConfig: { audioEncoding: 'MP3', speakingRate: 1.0, pitch: 0.0 },
      }),
    }
  )
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error?.message || 'TTS hatası')
  if (!data.audioContent) throw new Error('TTS ses verisi boş döndü.')
  return data.audioContent
}

exports.handler = async function (event) {
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

  const geminiKey = process.env.GEMINI_API_KEY
  const googleKey = process.env.GOOGLE_CLOUD_API_KEY

  if (!geminiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'GEMINI_API_KEY ayarlanmamış.' }) }
  }

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Geçersiz JSON.' }) }
  }

  const { transcript, model } = body
  if (!transcript?.trim()) {
    return { statusCode: 400, body: JSON.stringify({ error: 'transcript gerekli.' }) }
  }

  const selectedModel = ALLOWED_MODELS.includes(model) ? model : DEFAULT_MODEL

  try {
    const script = await generateScript(transcript, selectedModel, geminiKey)

    let audioBase64 = null
    let ttsError = null
    if (googleKey) {
      try {
        audioBase64 = await synthesizeSpeech(script, googleKey)
      } catch (e) {
        ttsError = e.message
      }
    } else {
      ttsError = 'GOOGLE_CLOUD_API_KEY ayarlanmamış — TTS devre dışı.'
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ script, audioBase64, ttsError }),
    }
  } catch (err) {
    console.error('Podcast error:', err)
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message || 'Podcast oluşturulamadı.' }),
    }
  }
}
