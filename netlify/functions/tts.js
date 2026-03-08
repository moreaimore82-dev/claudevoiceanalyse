/**
 * Netlify Function: tts
 * POST /api/tts
 * Body: { text: "..." }
 * Response: { audioBase64 }
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) }
  }

  const googleKey = process.env.GOOGLE_CLOUD_API_KEY
  if (!googleKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'GOOGLE_CLOUD_API_KEY ayarlanmamış.' }) }
  }

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Geçersiz JSON.' }) }
  }

  const { text } = body
  if (!text?.trim()) {
    return { statusCode: 400, body: JSON.stringify({ error: 'text gerekli.' }) }
  }

  try {
    const res = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${googleKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text: text.substring(0, 4500) },
          voice: { languageCode: 'tr-TR', name: 'tr-TR-Wavenet-B', ssmlGender: 'MALE' },
          audioConfig: { audioEncoding: 'MP3', speakingRate: 0.95, pitch: -1.0 },
        }),
      }
    )
    const data = await res.json()
    if (!res.ok || data.error) throw new Error(data.error?.message || 'TTS hatası')
    if (!data.audioContent) throw new Error('TTS ses verisi boş döndü.')
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      body: JSON.stringify({ audioBase64: data.audioContent }),
    }
  } catch (err) {
    console.error('TTS error:', err)
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message || 'Ses oluşturulamadı.' }),
    }
  }
}
