/**
 * Netlify Function: podcast
 * POST /api/podcast
 * Body: { transcript: "...", model: "gemini-..." }
 * Response: { script }
 */

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'
const DEFAULT_MODEL = 'gemini-3-flash-preview'
const ALLOWED_MODELS = ['gemini-3-flash-preview', 'gemini-3.1-pro-preview']

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

async function generateScript(transcript, model, apiKey) {
  const prompt = `Aşağıdaki konuşma transkripsiyonunu kullanarak 2-3 dakikada okunabilecek, cana yakın ve bilgilendirici bir podcast bölümü yaz. 300-400 kelime kullan. Transkripsiyonun içeriğine sadık kal, konuşmada geçen bilgileri, fikirleri ve önemli noktaları podcast formatında aktararak yaz. Doğal bir ses tonuyla, sanki bir podcast sunucusu anlatıyor gibi yaz. SADECE podcast metnini yaz, başlık veya açıklama ekleme.

Transkript:
"${transcript.substring(0, 6000)}"`

  const res = await fetch(
    `${GEMINI_API_BASE}/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
      }),
    }
  )
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error?.message || 'Gemini hatası')
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  if (!text) throw new Error('Gemini boş yanıt döndürdü.')
  return text
}

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) }
  }

  const geminiKey = process.env.GEMINI_API_KEY
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
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      body: JSON.stringify({ script }),
    }
  } catch (err) {
    console.error('Podcast script error:', err)
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message || 'Script oluşturulamadı.' }),
    }
  }
}
