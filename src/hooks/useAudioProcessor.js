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

  // 音名の配列（C0から）
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  // 周波数から音名とセント値を計算
  const frequencyToNote = useCallback((freq) => {
    if (freq <= 0) return { noteName: '', cents: 0 };

    // A4 = 440Hz を基準とする
    const A4 = 440;
    const C0 = A4 * Math.pow(2, -4.75); // C0の周波数

    if (freq > C0) {
      const h = Math.round(12 * Math.log2(freq / C0));
      const octave = Math.floor(h / 12);
      const n = h % 12;
      const noteName = octave + noteNames[n];
      
      // セント値の計算
      const expectedFreq = C0 * Math.pow(2, h / 12);
      const cents = Math.round(1200 * Math.log2(freq / expectedFreq));
      
      return { noteName, cents };
    }
    
    return { noteName: '', cents: 0 };
  }, [noteNames]);

  // YINアルゴリズムによるピッチ検出
  const yinPitchDetection = useCallback((buffer, sampleRate) => {
    const threshold = 0.15; // 閾値を少し上げる
    const bufferSize = Math.min(buffer.length, 2048);
    const yinBuffer = new Float32Array(bufferSize / 2);

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
    for (let tau = 2; tau < yinBuffer.length; tau++) {
      if (yinBuffer[tau] < threshold) {
        let betterTau = tau;
        // Step 4: Parabolic interpolation
        if (tau + 1 < yinBuffer.length && yinBuffer[tau + 1] < yinBuffer[tau]) {
          betterTau = tau + 1;
        }
        
        const x0 = betterTau - 1;
        const x2 = betterTau + 1;
        if (x0 >= 0 && x2 < yinBuffer.length) {
          const s0 = yinBuffer[x0];
          const s1 = yinBuffer[betterTau];
          const s2 = yinBuffer[x2];
          betterTau = betterTau + (s2 - s0) / (2 * (2 * s1 - s2 - s0));
        }
        
        return sampleRate / betterTau;
      }
    }
    
    return 0;
  }, []);

  // 音声データの分析ループ
  const analyzeAudio = useCallback(() => {
    if (!isListeningRef.current || !analyserRef.current) return;

    analyserRef.current.getFloatTimeDomainData(dataArrayRef.current);
    const detectedFreq = yinPitchDetection(dataArrayRef.current, audioContextRef.current.sampleRate);
    
    if (detectedFreq > 20 && detectedFreq < 4000) { // 範囲を広げる
      const { noteName, cents } = frequencyToNote(detectedFreq);
      setFrequency(detectedFreq);
      setNote(noteName);
      setCents(cents);
    }

    animationFrameRef.current = requestAnimationFrame(analyzeAudio);
  }, [yinPitchDetection, frequencyToNote]);

  // 音声処理開始
  const startListening = useCallback(async () => {
    try {
      setError(null);
      console.log('Starting audio processing...');
      
      // AudioContextの初期化
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      // iOS Safari対応: ユーザージェスチャー後に再開
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
        console.log('AudioContext resumed');
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        } 
      });
      
      console.log('Microphone access granted');
      
      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      
      microphoneRef.current.connect(analyserRef.current);
      dataArrayRef.current = new Float32Array(analyserRef.current.frequencyBinCount);
      
      isListeningRef.current = true;
      setIsListening(true);
      analyzeAudio();
      
    } catch (err) {
      console.error('Detailed error:', err);
      if (err.name === 'NotAllowedError') {
        setError('マイクの使用が許可されていません。ブラウザの設定でマイクを許可してください。');
      } else {
        setError(`エラーが発生しました: ${err.message}`);
      }
    }
  }, [analyzeAudio]);

  // 音声処理停止
  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    setIsListening(false);
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    if (microphoneRef.current) {
      microphoneRef.current.disconnect();
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      // AudioContextは閉じずに一時停止する方が再開時に安定することがある
      audioContextRef.current.suspend();
    }
  }, []);

  // クリーンアップ
  useEffect(() => {
    return () => {
      isListeningRef.current = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  return {
    isListening,
    frequency,
    note,
    cents,
    error,
    startListening,
    stopListening
  };
};
