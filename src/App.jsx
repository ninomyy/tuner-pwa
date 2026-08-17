import { useEffect, useState, useRef } from 'react'
import { useAudioProcessor } from './hooks/useAudioProcessor'
import TuningMeter from './components/TuningMeter'
import InstallPrompt from './components/InstallPrompt'
import './App.css'

function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('tuner-theme') || 'classic';
  })
  
  const [hapticEnabled, setHapticEnabled] = useState(() => {
    return localStorage.getItem('tuner-haptic') === 'true';
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

  const lastInTuneRef = useRef(false);

  // チューニングが合っているか判定 (±3セント以内)
  const isInTune = isListening && Math.abs(cents) <= 3 && note !== '';

  // 触覚フィードバック (バイブレーション) ロジック
  useEffect(() => {
    if (hapticEnabled && isInTune && !lastInTuneRef.current) {
      if ('vibrate' in navigator) {
        // 短い振動 (50ms)
        navigator.vibrate(50);
      }
    }
    lastInTuneRef.current = isInTune;
  }, [isInTune, hapticEnabled]);

  useEffect(() => {
    localStorage.setItem('tuner-theme', theme);
  }, [theme])

  useEffect(() => {
    localStorage.setItem('tuner-haptic', hapticEnabled);
  }, [hapticEnabled])

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

  const toggleHaptic = () => {
    setHapticEnabled(!hapticEnabled);
  }

  return (
    <div className={`app theme-${theme} ${isListening ? 'is-listening' : ''} ${isInTune ? 'is-in-tune' : ''}`}>
      <div className="psy-bg"></div>
      
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
              onClick={toggleHaptic} 
              className={`haptic-toggle ${hapticEnabled ? 'on' : 'off'}`}
            >
              {hapticEnabled ? '📳 振動: ON' : '📴 振動: OFF'}
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
