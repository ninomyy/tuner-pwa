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
    // Service Workerの登録
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
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
    <div className="app">
      <header className="app-header">
        <h1>クロマチックチューナー</h1>
      </header>
      
      <main className="tuner-main">
        {error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}
        
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
          <Button 
            onClick={handleToggleListening}
            variant={isListening ? "destructive" : "default"}
            size="lg"
          >
            {isListening ? '停止' : '開始'}
          </Button>
        </div>
      </main>
      
      <InstallPrompt />
    </div>
  )
}

export default App
