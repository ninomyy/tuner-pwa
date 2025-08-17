import { useState, useRef, useCallback } from 'react';

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

  // YINアルゴリズムによるピッチ検出（最適化版）
  const yinPitchDetection = useCallback((buffer, sampleRate) => {
    const threshold = 0.1;
    const bufferSize = Math.min(buffer.length, 2048); // バッファサイズを制限してパフォーマンス向上
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
        if (tau - 1 >= 0 && yinBuffer[tau - 1] < yinBuffer[betterTau]) {
          betterTau = tau - 1;
        }
        
        // Parabolic interpolation
        const x0 = betterTau - 1;
        const x2 = betterTau + 1;
        if (x0 >= 0 && x2 < yinBuffer.length) {
          const a = (yinBuffer[x2] - yinBuffer[x0]) / 2;
          const b = yinBuffer[x0] - yinBuffer[betterTau];
          const c = yinBuffer[betterTau];
          const peak = -b / (2 * a);
          betterTau = betterTau + peak;
        }
        
        return sampleRate / betterTau;
      }
    }
    
    return 0; // No pitch detected
  }, []);

  // 音声データの分析（最適化版）
  const analyzeAudio = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    analyserRef.current.getFloatTimeDomainData(dataArray);

    // YINアルゴリズムでピッチを検出
    const detectedFreq = yinPitchDetection(dataArray, audioContextRef.current.sampleRate);
    
    if (detectedFreq > 80 && detectedFreq < 2000) { // 有効な周波数範囲
      const { noteName, cents } = frequencyToNote(detectedFreq);
      setFrequency(detectedFreq);
      setNote(noteName);
      setCents(cents);
    }

    if (isListening) {
      // パフォーマンス向上のため、フレームレートを調整
      setTimeout(() => {
        animationFrameRef.current = requestAnimationFrame(analyzeAudio);
      }, 50); // 20FPSに制限
    }
  }, [isListening, yinPitchDetection, frequencyToNote]);

  // 音声処理開始
  const startListening = useCallback(async () => {
    try {
      setError(null);
      
      // iOS Safari対応: ユーザージェスチャー後にAudioContextを作成
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 44100, // サンプルレートを明示的に設定
        latencyHint: 'interactive' // 低レイテンシーを優先
      });
      
      // AudioContextの状態を確認
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      // マイクアクセスの要求（iOS Safari対応）
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 44100,
          channelCount: 1
        } 
      });
      
      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      
      // Analyserの設定（パフォーマンス最適化）
      analyserRef.current.fftSize = 2048; // サイズを小さくしてパフォーマンス向上
      analyserRef.current.smoothingTimeConstant = 0.8;
      
      microphoneRef.current.connect(analyserRef.current);
      
      const bufferLength = analyserRef.current.frequencyBinCount;
      dataArrayRef.current = new Float32Array(bufferLength);
      
      setIsListening(true);
      analyzeAudio();
      
    } catch (err) {
      console.error('Error accessing microphone:', err);
      if (err.name === 'NotAllowedError') {
        setError('マイクへのアクセスが拒否されました。ブラウザの設定を確認してください。');
      } else if (err.name === 'NotFoundError') {
        setError('マイクが見つかりません。デバイスを確認してください。');
      } else {
        setError('音声処理でエラーが発生しました。ページを再読み込みしてください。');
      }
    }
  }, [analyzeAudio]);

  // 音声処理停止
  const stopListening = useCallback(() => {
    setIsListening(false);
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    if (microphoneRef.current) {
      microphoneRef.current.disconnect();
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    
    // 状態をリセット
    setFrequency(0);
    setNote('');
    setCents(0);
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

