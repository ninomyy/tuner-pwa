import { useEffect, useState } from 'react'
import { useAudioProcessor } from './hooks/useAudioProcessor'
import TuningMeter from './components/TuningMeter'
import InstallPrompt from './components/InstallPrompt'
import './App.css'

function App() {
  const [theme, setTheme] = useState('psychedelic') // 静止画サイケをデフォルトに設定
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
      if (prev === 'psychedelic') return 'neon';
      if (prev === 'neon') return 'classic';
      return 'psychedelic';
    });
  }

  return (
    <div className={`app theme-${theme} ${isListening ? 'is-listening' : ''}`}>
      {/* 背景画像用のコンテナ */}
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
          </div>
        </div>

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
