import { useState, useRef, useCallback } from 'react'

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [duration, setDuration] = useState(0)
  const [audioBlob, setAudioBlob] = useState(null)
  const [error, setError] = useState(null)

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const startTimeRef = useRef(null)

  const startRecording = useCallback(async () => {
    setError(null)
    setAudioBlob(null)
    setDuration(0)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Prefer webm/opus, fallback to whatever is supported
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/ogg'

      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        setAudioBlob(blob)
        stream.getTracks().forEach((t) => t.stop())
        clearInterval(timerRef.current)
      }

      recorder.onerror = (e) => {
        setError('Kayıt sırasında hata oluştu: ' + e.error.message)
        setIsRecording(false)
        clearInterval(timerRef.current)
      }

      recorder.start(250) // collect data every 250ms
      setIsRecording(true)
      setIsPaused(false)

      startTimeRef.current = Date.now()
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 1000)
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Mikrofon erişimi reddedildi. Lütfen tarayıcı ayarlarından izin verin.')
      } else if (err.name === 'NotFoundError') {
        setError('Mikrofon bulunamadı.')
      } else {
        setError('Mikrofona erişilemiyor: ' + err.message)
      }
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsPaused(false)
    }
  }, [])

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause()
      setIsPaused(true)
      clearInterval(timerRef.current)
    }
  }, [])

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume()
      setIsPaused(false)
      const elapsed = duration * 1000
      startTimeRef.current = Date.now() - elapsed
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 1000)
    }
  }, [duration])

  const reset = useCallback(() => {
    stopRecording()
    setAudioBlob(null)
    setDuration(0)
    setError(null)
  }, [stopRecording])

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  return {
    isRecording,
    isPaused,
    duration,
    formattedDuration: formatDuration(duration),
    audioBlob,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    reset,
  }
}
