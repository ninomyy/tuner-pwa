import { useEffect, useState } from 'react'
import { useAudioProcessor } from './hooks/useAudioProcessor'
import TuningMeter from './components/TuningMeter'
import InstallPrompt from './components/InstallPrompt'
import './App.css'

function App() {
  const [theme, setTheme] = useState('classic')
  const {
    isListening,
    frequency,
    note,
    cents,
    error,
    startListening,
    stopListening
  } = useAudioProcessor()

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

  return (
    <div className={`app theme-${theme} ${isListening ? 'is-listening' : ''}`}>
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <filter id="wavy">
          <feTurbulence type="fractalNoise" baseFrequency="0.01" numOctaves="3" seed="2">
            <animate attributeName="baseFrequency" values="0.01;0.02;0.01" dur="30s" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" scale="60" />
        </filter>
      </svg>

      <div className="psy-bg"></div>

      <div className="theme-switcher">
        <button onClick={nextTheme}>
          {theme === 'classic' ? 'モード切替' : `Theme: ${theme.toUpperCase()}`}
        </button>
      </div>

      <main className="tuner-main">
        {/* タイトルをメインエリアのトップに配置 */}
        <header className="app-header">
          <h1>{theme === 'classic' ? 'クロマチックチューナー' : 'TUNER'}</h1>
        </header>

        {error && <div className="error-message">{error}</div>}
        
        <div className="frequency-display">
          <div className="note-display">
            <span className="note">{note || '--'}</span>
            <span className="cents">{cents > 0 ? `+${cents}` : cents || '0'} cents</span>
          </div>
          <div className="frequency">
            {frequency.toFixed(2)} Hz
          </div>
        </div>

        <TuningMeter cents={cents} isListening={isListening} />

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
