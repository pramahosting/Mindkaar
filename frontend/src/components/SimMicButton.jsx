import React from 'react'

const STATE_LABEL = {
  idle: 'Loading microphone…',
  ready: 'Click to answer',
  listening: 'Listening… click to stop',
  processing: 'Processing…',
  complete: 'Transcription ready',
  error: 'Microphone unavailable',
}

export default function SimMicButton({ micState, disabled, onStart, onStop }) {
  const isListening = micState === 'listening'

  return (
    <div className="sim-mic-wrap">
      <button
        type="button"
        disabled={disabled || micState === 'idle' || micState === 'error'}
        onClick={isListening ? onStop : onStart}
        aria-pressed={isListening}
        aria-label={isListening ? 'Stop recording' : 'Start recording your response'}
        className={`sim-mic-btn ${isListening ? 'listening' : ''}`}
      >
        <span aria-hidden="true">{isListening ? '⏹' : '🎤'}</span>
      </button>
      <p className="sim-mic-status" role="status">{STATE_LABEL[micState]}</p>
    </div>
  )
}
