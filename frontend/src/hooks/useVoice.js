import { useState, useEffect, useRef, useCallback } from 'react'

export function useVoice({ onTranscript } = {}) {
  const [listening,  setListening]  = useState(false)
  const [speaking,   setSpeaking]   = useState(false)
  const [supported,  setSupported]  = useState(false)
  const [liveText,   setLiveText]   = useState('')
  const recognitionRef  = useRef(null)
  const restartRef      = useRef(false)
  const accumulatedRef  = useRef('')
  const debounceRef     = useRef(null)  // ← debounce timer

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    setSupported(true)

    const r              = new SR()
    r.continuous         = true
    r.interimResults     = true
    r.lang               = 'en-US'
    r.maxAlternatives    = 1

    r.onresult = (e) => {
      let interim = ''
      let final   = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) final += t
        else interim += t
      }

      if (final) {
        accumulatedRef.current += ' ' + final.trim()
        const full = accumulatedRef.current.trim()
        setLiveText(full)

        // Debounce — wait 1.8s after last final word before triggering AI
        clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
          const chunk = final.trim()
          if (chunk.split(' ').length >= 4) {
            onTranscript?.(full, chunk)
          }
        }, 1800)

      } else {
        setLiveText(accumulatedRef.current + ' ' + interim)
      }
    }

    // Auto-restart on Windows (drops after ~5s silence)
    r.onend = () => {
      if (restartRef.current) {
        try { r.start() } catch {}
      } else {
        setListening(false)
        setLiveText('')
      }
    }

    r.onerror = (e) => {
      if (e.error === 'no-speech') return
      if (e.error === 'aborted')   return
      restartRef.current = false
      setListening(false)
    }

    recognitionRef.current = r
    return () => {
      restartRef.current = false
      clearTimeout(debounceRef.current)
      try { r.stop() } catch {}
      window.speechSynthesis?.cancel()
    }
  }, [])

  const startListening = useCallback(() => {
    if (!recognitionRef.current || listening) return
    window.speechSynthesis?.cancel()
    accumulatedRef.current = ''
    setLiveText('')
    restartRef.current = true
    try {
      recognitionRef.current.start()
      setListening(true)
    } catch {}
  }, [listening])

  const stopListening = useCallback(() => {
    clearTimeout(debounceRef.current)
    restartRef.current = false
    try { recognitionRef.current?.stop() } catch {}
    setListening(false)
    const final = accumulatedRef.current.trim()
    accumulatedRef.current = ''
    setLiveText('')
    return final
  }, [])

  const speak = useCallback((text, onDone) => {
    if (!window.speechSynthesis || !text) return
    window.speechSynthesis.cancel()
    const u  = new SpeechSynthesisUtterance(text)
    u.rate   = 0.92
    u.pitch  = 1
    u.volume = 1

    // Wait for voices to load (needed on some browsers)
    const setVoice = () => {
      const voices  = window.speechSynthesis.getVoices()
      const pick    = voices.find(v => v.lang.startsWith('en') && v.name.includes('Natural'))
                   || voices.find(v => v.lang.startsWith('en-US'))
                   || voices.find(v => v.lang.startsWith('en'))
      if (pick) u.voice = pick
    }

    if (window.speechSynthesis.getVoices().length) {
      setVoice()
    } else {
      window.speechSynthesis.onvoiceschanged = setVoice
    }

    u.onstart = () => setSpeaking(true)
    u.onend   = () => { setSpeaking(false); onDone?.() }
    u.onerror = () => setSpeaking(false)
    window.speechSynthesis.speak(u)
    setSpeaking(true)
  }, [])

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel()
    setSpeaking(false)
  }, [])

  return { supported, listening, startListening, stopListening,
           speaking, speak, stopSpeaking, liveText }
}