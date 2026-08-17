import { useEffect, useState, useRef } from 'react'
import { useAudioProcessor } from './hooks/useAudioProcessor'
import TuningMeter from './components/TuningMeter'
import InstallPrompt from './components/InstallPrompt'
import './App.css'

function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('tuner-theme') || 'classic';
  })
  
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('tuner-sound') === 'true';
  })

  const {
    isListening,
    frequency,
    note,
    cents,
    error,
    startListening,
    stopListening
  } = useAudioProcessor()

  const audioRef = useRef(null);
  const lastInTuneRef = useRef(false);

  // チューニングが合っているか判定 (±3セント以内)
  const isInTune = isListening && Math.abs(cents) <= 3 && note !== '';

  // 音声再生ロジック
  useEffect(() => {
    if (soundEnabled && isInTune && !lastInTuneRef.current) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(e => console.log("Audio play failed:", e));
      }
    }
    lastInTuneRef.current = isInTune;
  }, [isInTune, soundEnabled]);

  useEffect(() => {
    localStorage.setItem('tuner-theme', theme);
  }, [theme])

  useEffect(() => {
    localStorage.setItem('tuner-sound', soundEnabled);
  }, [soundEnabled])

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const swPath = `${import.meta.env.BASE_URL}sw.js`;
      window.addEventListener('load', () => {
        navigator.serviceWorker.register(swPath)
          .then((reg) => console.log('SW registered'))
          .catch((err) => console.log('SW failed', err));
      });
    }
  }, [])

  const handleToggleListening = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  const nextTheme = () => {
    setTheme(prev => {
      if (prev === 'classic') return 'psychedelic';
      if (prev === 'psychedelic') return 'neon';
      return 'classic';
    });
  }

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
  }

  return (
    <div className={`app theme-${theme} ${isListening ? 'is-listening' : ''} ${isInTune ? 'is-in-tune' : ''}`}>
      <div className="psy-bg"></div>
      
      {/* 効果音用オーディオ要素 */}
      <audio ref={audioRef} src={`${import.meta.env.BASE_URL}success.mp3`} preload="auto" />

      <main className="tuner-main">
        <div className="top-controls">
          <header className="app-header">
            <h1>{theme === 'classic' ? 'クロマチックチューナー' : 'TUNER'}</h1>
          </header>
          
          <div className="theme-switcher-inline">
            <button onClick={nextTheme}>
              {theme === 'classic' ? 'モード切替' : `Theme: ${theme.toUpperCase()}`}
            </button>
            <button 
              onClick={toggleSound} 
              className={`sound-toggle ${soundEnabled ? 'on' : 'off'}`}
            >
              {soundEnabled ? '🔔 音: ON' : '🔕 音: OFF'}
            </button>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}
        
        <div className="frequency-display">
          <div className="note-display">
            <span className="note">{note || '--'}</span>
            <span className="cents">{cents > 0 ? `+${cents}` : cents || '0'} cents</span>
            <div className="frequency">
              {frequency.toFixed(2)} Hz
            </div>
          </div>
        </div>

        <TuningMeter cents={cents} isListening={isListening} isInTune={isInTune} />

        <div className="tuner-controls">
          <button 
            onClick={handleToggleListening}
            className={isListening ? 'active' : ''}
          >
            {isListening ? '停止' : '開始'}
          </button>
        </div>
      </main>
      
      <InstallPrompt />
    </div>
  )
}

export default App
