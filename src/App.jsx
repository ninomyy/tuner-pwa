import { useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { useAudioProcessor } from './hooks/useAudioProcessor'
import TuningMeter from './components/TuningMeter'
import InstallPrompt from './components/InstallPrompt'
import './App.css'

function App() {
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
    // Service Workerの登録 (GitHub Pagesのベースパスに対応)
    if ('serviceWorker' in navigator) {
      const swPath = `${import.meta.env.BASE_URL}sw.js`;
      window.addEventListener('load', () => {
        navigator.serviceWorker.register(swPath)
          .then((registration) => {
            console.log('SW registered: ', registration);
          })
          .catch((registrationError) => {
            console.log('SW registration failed: ', registrationError);
          });
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

  return (
    <div className={`app ${isListening ? 'is-listening' : ''}`}>
      <header className="app-header">
        <h1>Tuner</h1>
      </header>
      
      <main className="tuner-main">
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
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
          <button 
            onClick={handleToggleListening}
            className={isListening ? 'active' : ''}
          >
            {isListening ? 'Stop' : 'Start'}
          </button>
        </div>
      </main>
      
      <InstallPrompt />
    </div>
  )
}

export default App
