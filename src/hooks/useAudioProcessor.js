import { useState, useCallback, useRef, useEffect } from 'react';

export const useAudioProcessor = () => {
  const [isListening, setIsListening] = useState(false);
  const [frequency, setFrequency] = useState(0);
  const [note, setNote] = useState('');
  const [cents, setCents] = useState(0);
  const [error, setError] = useState(null);

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const microphoneRef = useRef(null);
  const dataArrayRef = useRef(null);
  const animationFrameRef = useRef(null);
  const isListeningRef = useRef(false);
  const wakeLockRef = useRef(null);

  // 音名の配列
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  // スクリーンウェイクロックの要求
  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        console.log('Wake Lock is active');
        
        wakeLockRef.current.addEventListener('release', () => {
          console.log('Wake Lock was released');
        });
      } catch (err) {
        console.error(`${err.name}, ${err.message}`);
      }
    }
  }, []);

  // スクリーンウェイクロックの解除
  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      } catch (err) {
        console.error(`${err.name}, ${err.message}`);
      }
    }
  }, []);

  // 周波数から音名とセント値を計算
  const frequencyToNote = useCallback((freq) => {
    if (freq <= 0) return { noteName: '', cents: 0 };
    const A4 = 440;
    const C0 = A4 * Math.pow(2, -4.75);
    if (freq > C0) {
      const h = Math.round(12 * Math.log2(freq / C0));
      const octave = Math.floor(h / 12);
      const n = h % 12;
      const noteName = octave + noteNames[n];
      const expectedFreq = C0 * Math.pow(2, h / 12);
      const cents = Math.round(1200 * Math.log2(freq / expectedFreq));
      return { noteName, cents };
    }
    return { noteName: '', cents: 0 };
  }, [noteNames]);

  // YINアルゴリズム
  const yinPitchDetection = useCallback((buffer, sampleRate) => {
    const threshold = 0.15;
    const bufferSize = Math.min(buffer.length, 2048);
    const yinBuffer = new Float32Array(bufferSize / 2);
    for (let tau = 0; tau < yinBuffer.length; tau++) {
      yinBuffer[tau] = 0;
      for (let i = 0; i < yinBuffer.length; i++) {
        const delta = buffer[i] - buffer[i + tau];
        yinBuffer[tau] += delta * delta;
      }
    }
    yinBuffer[0] = 1;
    let runningSum = 0;
    for (let tau = 1; tau < yinBuffer.length; tau++) {
      runningSum += yinBuffer[tau];
      yinBuffer[tau] *= tau / runningSum;
    }
    for (let tau = 2; tau < yinBuffer.length; tau++) {
      if (yinBuffer[tau] < threshold) {
        let betterTau = tau;
        if (tau + 1 < yinBuffer.length && yinBuffer[tau + 1] < yinBuffer[tau]) {
          betterTau = tau + 1;
        }
        const x0 = betterTau - 1;
        const x2 = betterTau + 1;
        if (x0 >= 0 && x2 < yinBuffer.length) {
          const s0 = yinBuffer[x0];
          const s1 = yinBuffer[betterTau];
          const s2 = yinBuffer[x2];
          const denom = 2 * (2 * s1 - s2 - s0);
          if (Math.abs(denom) > 0.000001) {
            betterTau = betterTau + (s2 - s0) / denom;
          }
        }
        return sampleRate / betterTau;
      }
    }
    return 0;
  }, []);

  const analyzeAudio = useCallback(() => {
    if (!isListeningRef.current || !analyserRef.current) return;
    analyserRef.current.getFloatTimeDomainData(dataArrayRef.current);
    const detectedFreq = yinPitchDetection(dataArrayRef.current, audioContextRef.current.sampleRate);
    if (detectedFreq > 20 && detectedFreq < 4000) {
      const { noteName, cents } = frequencyToNote(detectedFreq);
      setFrequency(detectedFreq);
      setNote(noteName);
      setCents(cents);
    }
    animationFrameRef.current = requestAnimationFrame(analyzeAudio);
  }, [yinPitchDetection, frequencyToNote]);

  const startListening = useCallback(async () => {
    try {
      setError(null);
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } 
      });
      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      microphoneRef.current.connect(analyserRef.current);
      dataArrayRef.current = new Float32Array(analyserRef.current.frequencyBinCount);
      
      // ウェイクロックの要求
      await requestWakeLock();
      
      isListeningRef.current = true;
      setIsListening(true);
      analyzeAudio();
    } catch (err) {
      console.error('Error:', err);
      setError(err.name === 'NotAllowedError' ? 'マイクの使用が許可されていません。' : `エラー: ${err.message}`);
    }
  }, [analyzeAudio, requestWakeLock]);

  const stopListening = useCallback(async () => {
    isListeningRef.current = false;
    setIsListening(false);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (microphoneRef.current) microphoneRef.current.disconnect();
    if (audioContextRef.current) audioContextRef.current.suspend();
    
    // ウェイクロックの解除
    await releaseWakeLock();
  }, [releaseWakeLock]);

  // タブの可視性が変わった時のウェイクロック再取得（ブラウザ仕様への対応）
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (wakeLockRef.current !== null && document.visibilityState === 'visible' && isListeningRef.current) {
        await requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [requestWakeLock]);

  useEffect(() => {
    return () => {
      isListeningRef.current = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
      releaseWakeLock();
    };
  }, [releaseWakeLock]);

  return { isListening, frequency, note, cents, error, startListening, stopListening };
};
