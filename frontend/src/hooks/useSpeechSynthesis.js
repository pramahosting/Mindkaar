import { useCallback, useEffect, useRef, useState } from 'react'

// Voice name heuristics: the Web Speech API doesn't expose a reliable
// "gender" field on SpeechSynthesisVoice, so we match on common voice
// names/keywords across Chrome, Edge, and macOS/iOS Safari to find a
// voice that actually sounds male or female, instead of always falling
// back to whatever the browser's default voice happens to be.
const FEMALE_VOICE_HINTS = [
  'female', 'zira', 'samantha', 'victoria', 'susan', 'karen', 'moira', 'tessa',
  'veena', 'fiona', 'kate', 'serena', 'ava', 'allison', 'jenny', 'aria',
  'salli', 'joanna', 'kendra', 'kimberly', 'ivy', 'emma', 'amy', 'olivia',
]
const MALE_VOICE_HINTS = [
  'male', 'david', 'alex', 'daniel', 'george', 'mark', 'fred', 'james',
  'guy', 'ryan', 'matthew', 'brian', 'tom', 'eric', 'justin', 'russell',
  'oliver', 'arthur', 'gordon',
]

function scoreVoice(voice, gender) {
  const name = (voice.name || '').toLowerCase()
  const hints = gender === 'female' ? FEMALE_VOICE_HINTS : MALE_VOICE_HINTS
  const oppositeHints = gender === 'female' ? MALE_VOICE_HINTS : FEMALE_VOICE_HINTS
  if (hints.some((h) => name.includes(h))) return 2
  if (oppositeHints.some((h) => name.includes(h))) return -1
  return 0
}

function pickVoice(voices, gender) {
  if (!voices || !voices.length) return null
  const english = voices.filter((v) => (v.lang || '').toLowerCase().startsWith('en'))
  const pool = english.length ? english : voices

  let best = null
  let bestScore = -Infinity
  for (const v of pool) {
    const score = scoreVoice(v, gender)
    if (score > bestScore) {
      bestScore = score
      best = v
    }
  }
  return best
}

// Wraps the browser's SpeechSynthesis API for text-to-speech.
// `gender` ('male' | 'female') picks a matching voice by name when one is
// available, and nudges pitch as a fallback when it isn't, so the voice
// you hear actually matches the avatar you see.
export function useSpeechSynthesis(gender = 'female') {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const lastTextRef = useRef('')
  const voicesRef = useRef([])
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

  useEffect(() => {
    if (!isSupported) return

    function loadVoices() {
      const voices = window.speechSynthesis.getVoices()
      if (voices && voices.length) voicesRef.current = voices
    }

    loadVoices()
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices)
  }, [isSupported])

  const speak = useCallback(
    (text) => {
      lastTextRef.current = text
      if (!isSupported || isMuted || !text) return

      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)

      const matchedVoice = pickVoice(voicesRef.current, gender)
      if (matchedVoice) {
        utterance.voice = matchedVoice
      } else {
        // No explicitly gendered voice available on this system - nudge
        // pitch as a rough fallback so it still leans the right direction.
        utterance.pitch = gender === 'female' ? 1.2 : 0.85
      }
      utterance.rate = 1

      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)
      window.speechSynthesis.speak(utterance)
    },
    [isSupported, isMuted, gender]
  )

  const replay = useCallback(() => {
    if (lastTextRef.current) speak(lastTextRef.current)
  }, [speak])

  const stop = useCallback(() => {
    if (isSupported) window.speechSynthesis.cancel()
    setIsSpeaking(false)
  }, [isSupported])

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      if (!prev) stop()
      return !prev
    })
  }, [stop])

  return { speak, replay, stop, isSpeaking, isMuted, toggleMute, isSupported }
}
