import { useCallback, useEffect, useRef, useState } from 'react'

// Wraps the browser's (non-standard) Web Speech API for speech-to-text.
// micState: 'idle' | 'ready' | 'listening' | 'processing' | 'complete' | 'error'
export function useSpeechRecognition() {
  const [micState, setMicState] = useState('idle')
  const [transcript, setTranscript] = useState('')
  const [interim, setInterim] = useState('')
  const [errorMessage, setErrorMessage] = useState(null)
  const [isSupported, setIsSupported] = useState(true)

  const recognitionRef = useRef(null)

  useEffect(() => {
    const SpeechRecognition =
      (typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)) || null

    if (!SpeechRecognition) {
      setIsSupported(false)
      setMicState('error')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event) => {
      let finalText = ''
      let interimText = ''
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalText += result[0].transcript + ' '
        } else {
          interimText += result[0].transcript
        }
      }
      if (finalText) {
        setTranscript((prev) => (prev + ' ' + finalText).trim())
      }
      setInterim(interimText)
    }

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        setErrorMessage('Microphone permission was denied. Please allow microphone access and try again.')
      } else if (event.error === 'no-speech') {
        setErrorMessage('No speech detected. Please try again.')
      } else {
        setErrorMessage('Speech recognition failed. You can type your response instead.')
      }
      setMicState('error')
    }

    recognition.onend = () => {
      setMicState((prev) => (prev === 'listening' ? 'processing' : prev))
      setTimeout(() => {
        setMicState((prev) => (prev === 'processing' ? 'complete' : prev))
      }, 150)
    }

    recognitionRef.current = recognition
    setMicState('ready')

    return () => {
      recognition.onresult = null
      recognition.onerror = null
      recognition.onend = null
    }
  }, [])

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return
    setErrorMessage(null)
    setTranscript('')
    setInterim('')
    try {
      recognitionRef.current.start()
      setMicState('listening')
    } catch {
      // start() throws if already started; ignore
    }
  }, [])

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return
    recognitionRef.current.stop()
  }, [])

  const resetTranscript = useCallback(() => {
    setTranscript('')
    setInterim('')
    setMicState('ready')
  }, [])

  const editTranscript = useCallback((text) => {
    setTranscript(text)
  }, [])

  return {
    micState,
    transcript,
    interim,
    errorMessage,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
    editTranscript,
  }
}
