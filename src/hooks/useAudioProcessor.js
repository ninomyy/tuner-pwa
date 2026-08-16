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
  const lowPassFilterRef = useRef(null);
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

  // YINアルゴリズムによるピッチ検出（ベース対応・超低音最適化版）
  const yinPitchDetection = useCallback((buffer, sampleRate) => {
    // 低音域のために閾値をさらに下げる
    const threshold = 0.08;
    const bufferSize = buffer.length;
    const yinBuffer = new Float32Array(Math.floor(bufferSize / 2));

    // Step 1: Difference function
    for (let tau = 0; tau < yinBuffer.length; tau++) {
      yinBuffer[tau] = 0;
      for (let i = 0; i < yinBuffer.length; i++) {
        const delta = buffer[i] - buffer[i + tau];
        yinBuffer[tau] += delta * delta;
      }
    }

    // Step 2: Cumulative mean normalized difference function
    yinBuffer[0] = 1;
    let runningSum = 0;
    for (let tau = 1; tau < yinBuffer.length; tau++) {
      runningSum += yinBuffer[tau];
      yinBuffer[tau] *= tau / runningSum;
    }

    // Step 3: Absolute threshold
    let tau = -1;
    for (let t = 2; t < yinBuffer.length; t++) {
      if (yinBuffer[t] < threshold) {
        tau = t;
        break;
      }
    }

    // 閾値を下回るものがない場合、全体の最小値を探す
    if (tau === -1) {
      let minVal = 1;
      for (let t = 2; t < yinBuffer.length; t++) {
        if (yinBuffer[t] < minVal) {
          minVal = yinBuffer[t];
          tau = t;
        }
      }
      if (minVal > 0.3) return 0; // 最小値があまりに高い場合はノイズとみなす
    }

    // Step 4: Parabolic interpolation
    let betterTau = tau;
    const x0 = tau - 1;
    const x2 = tau + 1;
    if (x0 >= 0 && x2 < yinBuffer.length) {
      const s0 = yinBuffer[x0];
      const s1 = yinBuffer[tau];
      const s2 = yinBuffer[x2];
      const denom = 2 * s1 - s2 - s0;
      if (Math.abs(denom) > 0.000001) {
        betterTau = tau + (s2 - s0) / (2 * denom);
      }
    }

    return sampleRate / betterTau;
  }, []);

  const analyzeAudio = useCallback(() => {
    if (!isListeningRef.current || !analyserRef.current || !dataArrayRef.current) return;
    
    analyserRef.current.getFloatTimeDomainData(dataArrayRef.current);
    const detectedFreq = yinPitchDetection(dataArrayRef.current, audioContextRef.current.sampleRate);
    
    // ベースの低音E(約41Hz)からカバー (30Hz〜1000Hzにフォーカス)
    if (detectedFreq > 30 && detectedFreq < 1000) {
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
      
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }
      
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: false, 
          noiseSuppression: false, 
          autoGainControl: true 
        } 
      });
      
      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
      
      // 【改善】ローパスフィルタの導入
      // ベースの倍音（高い音）をカットし、基音（低い音）を際立たせる
      lowPassFilterRef.current = audioContextRef.current.createBiquadFilter();
      lowPassFilterRef.current.type = 'lowpass';
      lowPassFilterRef.current.frequency.setValueAtTime(300, audioContextRef.current.currentTime);
      lowPassFilterRef.current.Q.setValueAtTime(1, audioContextRef.current.currentTime);
      
      analyserRef.current = audioContextRef.current.createAnalyser();
      
      // 【改善】fftSizeを8192に増やして低音の解像度を最大化
      analyserRef.current.fftSize = 8192;
      
      // 接続: マイク -> フィルタ -> アナライザ
      microphoneRef.current.connect(lowPassFilterRef.current);
      lowPassFilterRef.current.connect(analyserRef.current);
      
      dataArrayRef.current = new Float32Array(analyserRef.current.fftSize);
      
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
    if (lowPassFilterRef.current) lowPassFilterRef.current.disconnect();
    if (audioContextRef.current) audioContextRef.current.suspend();
    await releaseWakeLock();
  }, [releaseWakeLock]);

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
