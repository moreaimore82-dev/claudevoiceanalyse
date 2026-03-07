/**
 * Netlify Function: analyze
 * POST /api/analyze
 * Body: { transcript: "...", speakers: [{word, speakerTag, startTime, endTime}] }
 * Response: {
 *   sentiment: { overall, score },
 *   emotions: [{ name, intensity }],
 *   tone: { formality, confidence, energy },
 *   speakerAnalysis: [{ speakerId, dominantEmotion, talkTime }]
 * }
 */

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash'
const ALLOWED_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro-preview-03-25']

function buildPrompt(transcript, speakers) {
  // Build speaker summary if we have diarization data
  let speakerContext = ''
  if (speakers && speakers.length > 0) {
    const speakerMap = {}
    for (const w of speakers) {
      const tag = w.speakerTag || 1
      if (!speakerMap[tag]) speakerMap[tag] = []
      speakerMap[tag].push(w.word)
    }

    const lines = Object.entries(speakerMap).map(
      ([tag, words]) => `  Konuşmacı ${tag}: "${words.join(' ')}"`
    )

    speakerContext = `\n\nKonuşmacı bazında metin:\n${lines.join('\n')}`
  }

  return `Aşağıdaki Türkçe konuşma transkripsiyonunu analiz et ve SADECE geçerli JSON formatında yanıt ver. Başka hiçbir metin ekleme.

Transkript:
"${transcript}"${speakerContext}

JSON formatı (tam olarak bu yapıya uy):
{
  "sentiment": {
    "overall": "positive | negative | neutral | mixed",
    "score": 0.0-1.0
  },
  "emotions": [
    {"name": "duygu adı (Türkçe)", "intensity": 0.0-1.0}
  ],
  "tone": {
    "formality": 0.0-1.0,
    "confidence": 0.0-1.0,
    "energy": 0.0-1.0
  },
  "speakerAnalysis": [
    {
      "speakerId": 1,
      "dominantEmotion": "duygu adı (Türkçe)",
      "talkTime": 0.0
    }
  ]
}

Kurallar:
- "emotions" dizisinde 3-6 duygu döndür (en baskın duygulardan başla)
- "sentiment.score": 0 = çok olumsuz, 1 = çok olumlu, 0.5 = nötr
- "tone" değerleri 0.0-1.0 arası (0=düşük, 1=yüksek)
- speakerAnalysis'te sadece gerçekten tespit edilen konuşmacıları listele
- Yalnızca JSON çıktısı ver`
}

function cleanJson(str) {
  // Remove trailing commas before } or ]
  return str.replace(/,\s*([}\]])/g, '$1')
}

function parseGeminiResponse(text) {
  // Strip markdown code blocks if present
  let cleaned = text.trim()
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

  // Try direct parse
  try {
    return JSON.parse(cleaned)
  } catch {
    // Try cleaning trailing commas
    try {
      return JSON.parse(cleanJson(cleaned))
    } catch {
      // Try to extract JSON object from text
      const match = cleaned.match(/\{[\s\S]*\}/)
      if (match) {
        try {
          return JSON.parse(match[0])
        } catch {
          return JSON.parse(cleanJson(match[0]))
        }
      }
      throw new Error('Gemini yanıtı geçerli JSON formatında değil.')
    }
  }
}

function validateAnalysis(data) {
  // Ensure required fields exist with sensible defaults
  return {
    sentiment: {
      overall: data.sentiment?.overall || 'neutral',
      score: typeof data.sentiment?.score === 'number' ? data.sentiment.score : 0.5,
    },
    emotions: Array.isArray(data.emotions) ? data.emotions : [],
    tone: {
      formality: typeof data.tone?.formality === 'number' ? data.tone.formality : 0.5,
      confidence: typeof data.tone?.confidence === 'number' ? data.tone.confidence : 0.5,
      energy: typeof data.tone?.energy === 'number' ? data.tone.energy : 0.5,
    },
    speakerAnalysis: Array.isArray(data.speakerAnalysis) ? data.speakerAnalysis : [],
  }
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

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'GEMINI_API_KEY ortam değişkeni ayarlanmamış.' }),
    }
  }

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Geçersiz JSON gövdesi.' }) }
  }

  const { transcript, speakers, model } = body

  if (!transcript || typeof transcript !== 'string' || transcript.trim() === '') {
    return { statusCode: 400, body: JSON.stringify({ error: 'transcript alanı gerekli.' }) }
  }

  const selectedModel = ALLOWED_MODELS.includes(model) ? model : DEFAULT_GEMINI_MODEL
  const prompt = buildPrompt(transcript, speakers)

  const requestBody = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.3,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json',
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    ],
  }

  try {
    const url = `${GEMINI_API_BASE}/models/${selectedModel}:generateContent?key=${apiKey}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    })

    const data = await res.json()

    if (!res.ok || data.error) {
      throw new Error(data.error?.message || `Gemini API hatası: ${res.status}`)
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!rawText) {
      console.error('Gemini full response:', JSON.stringify(data))
      throw new Error('Gemini boş yanıt döndürdü.')
    }

    console.error('Gemini raw text:', rawText.substring(0, 500))
    const parsed = parseGeminiResponse(rawText)
    const analysis = validateAnalysis(parsed)

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(analysis),
    }
  } catch (err) {
    console.error('Analyze error:', err)
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error: err.message || 'Analiz sırasında beklenmeyen bir hata oluştu.',
      }),
    }
  }
}
