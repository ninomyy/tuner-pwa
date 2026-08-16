import { useEffect, useState } from 'react'
import { useAudioProcessor } from './hooks/useAudioProcessor'
import TuningMeter from './components/TuningMeter'
import InstallPrompt from './components/InstallPrompt'
import './App.css'

function App() {
  const [theme, setTheme] = useState('neon') // 'neon' or 'classic'
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

  const toggleTheme = () => {
    setTheme(prev => prev === 'neon' ? 'classic' : 'neon')
  }

  return (
    <div className={`app theme-${theme} ${isListening ? 'is-listening' : ''}`}>
      <div className="theme-switcher">
        <button onClick={toggleTheme}>
          {theme === 'neon' ? 'Classic Mode' : 'Neon Mode'}
        </button>
      </div>

      <header className="app-header">
        <h1>Tuner</h1>
      </header>
      
      <main className="tuner-main">
        {error && <div className="error-message">{error}</div>}
        
        <div className="frequency-display">
          <div className="note-display">
            <span className="note">{note || '--'}</span>
            <span className="cents">{cents > 0 ? `+${cents}` : cents || '0'}</span>
          </div>
          <div className="frequency">
            {frequency.toFixed(2)} HZ
          </div>
        </div>

        <TuningMeter cents={cents} isListening={isListening} />

        <div className="tuner-controls">
          <button onClick={handleToggleListening}>
            {isListening ? 'Stop' : 'Start'}
          </button>
        </div>
      </main>
      
      <InstallPrompt />
    </div>
  )
}

export default App
